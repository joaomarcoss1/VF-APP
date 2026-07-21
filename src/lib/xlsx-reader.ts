export type ParsedSheetRow = Record<string, string | number | null>

function readU16(view: DataView, off: number) { return view.getUint16(off, true) }
function readU32(view: DataView, off: number) { return view.getUint32(off, true) }
const decoder = new TextDecoder('utf-8')

async function inflateRaw(data: Uint8Array): Promise<string> {
  if (typeof DecompressionStream === 'undefined') throw new Error('Este navegador não suporta leitura XLSX nativa. Use CSV ou atualize o navegador.')
  const ds = new DecompressionStream('deflate-raw')
  const stream = new Blob([data]).stream().pipeThrough(ds)
  const buf = await new Response(stream).arrayBuffer()
  return decoder.decode(buf)
}

async function readZipText(buffer: ArrayBuffer): Promise<Record<string, string>> {
  const bytes = new Uint8Array(buffer)
  const view = new DataView(buffer)
  let eocd = -1
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 66000); i--) {
    if (readU32(view, i) === 0x06054b50) { eocd = i; break }
  }
  if (eocd < 0) throw new Error('Arquivo XLSX inválido: diretório ZIP não encontrado.')
  const total = readU16(view, eocd + 10)
  const cdOffset = readU32(view, eocd + 16)
  const files: Record<string, string> = {}
  let ptr = cdOffset
  for (let i=0;i<total;i++) {
    if (readU32(view, ptr) !== 0x02014b50) break
    const method = readU16(view, ptr + 10)
    const compSize = readU32(view, ptr + 20)
    const nameLen = readU16(view, ptr + 28)
    const extraLen = readU16(view, ptr + 30)
    const commentLen = readU16(view, ptr + 32)
    const localOffset = readU32(view, ptr + 42)
    const name = decoder.decode(bytes.slice(ptr + 46, ptr + 46 + nameLen))
    const localNameLen = readU16(view, localOffset + 26)
    const localExtraLen = readU16(view, localOffset + 28)
    const dataStart = localOffset + 30 + localNameLen + localExtraLen
    const data = bytes.slice(dataStart, dataStart + compSize)
    if (name.endsWith('.xml')) files[name] = method === 0 ? decoder.decode(data) : await inflateRaw(data)
    ptr += 46 + nameLen + extraLen + commentLen
  }
  return files
}

function colIndex(ref: string): number {
  const letters = ref.replace(/\d/g, '')
  let n = 0
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64)
  return n - 1
}

function parseSharedStrings(xml?: string): string[] {
  if (!xml) return []
  const doc = new DOMParser().parseFromString(xml, 'application/xml')
  return Array.from(doc.getElementsByTagName('si')).map(si => Array.from(si.getElementsByTagName('t')).map(t => t.textContent || '').join(''))
}

function parseSheet(xml: string, shared: string[]): ParsedSheetRow[] {
  const doc = new DOMParser().parseFromString(xml, 'application/xml')
  const rows = Array.from(doc.getElementsByTagName('row'))
  const matrix: string[][] = []
  for (const row of rows) {
    const cells = Array.from(row.getElementsByTagName('c'))
    const arr: string[] = []
    for (const c of cells) {
      const ref = c.getAttribute('r') || ''
      const idx = colIndex(ref)
      const type = c.getAttribute('t')
      const v = c.getElementsByTagName('v')[0]?.textContent || ''
      const inline = c.getElementsByTagName('t')[0]?.textContent || ''
      arr[idx] = type === 's' ? (shared[Number(v)] || '') : (inline || v || '')
    }
    if (arr.some(Boolean)) matrix.push(arr)
  }
  const headers = (matrix.shift() || []).map(h => String(h || '').trim())
  return matrix.map(row => Object.fromEntries(headers.map((h, i) => [h || `coluna_${i+1}`, row[i] ?? null])))
}


function parseDelimitedText(text: string): ParsedSheetRow[] {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  if (!lines.length) return []
  const first = lines[0]
  const sep = first.includes(';') ? ';' : first.includes('\t') ? '\t' : first.includes(',') ? ',' : '  '
  const split = (line: string) => sep === '  ' ? line.split(/\s{2,}/) : line.split(sep)
  const headers = split(lines.shift() || '').map(h => h.trim())
  return lines.map(line => Object.fromEntries(split(line).map((v, i) => [headers[i] || `coluna_${i+1}`, v.trim()])))
}

async function readPdfLikeText(file: File): Promise<ParsedSheetRow[]> {
  const raw = await file.text()
  const extracted = raw
    .replace(/\r/g, '\n')
    .replace(/\(([^)]{2,})\)/g, '\n$1\n')
    .replace(/\\[rn]/g, '\n')
    .replace(/[^\x09\x0A\x0D\x20-\x7EÀ-ÿ]+/g, ' ')
  const rows = parseDelimitedText(extracted)
  if (!rows.length || Object.keys(rows[0] || {}).length < 2) {
    throw new Error('Este PDF parece ser imagem ou não possui tabela textual extraível. Envie Excel/CSV ou um PDF com tabela selecionável.')
  }
  return rows
}

export async function readTableFile(file: File): Promise<ParsedSheetRow[]> {
  const name = file.name.toLowerCase()
  if (name.endsWith('.csv') || name.endsWith('.txt')) return parseDelimitedText(await file.text())
  if (name.endsWith('.pdf')) return readPdfLikeText(file)
  if (!name.endsWith('.xlsx')) throw new Error('Formato não suportado. Envie .xlsx, .csv ou PDF textual.')
  const files = await readZipText(await file.arrayBuffer())
  const shared = parseSharedStrings(files['xl/sharedStrings.xml'])
  const sheetName = Object.keys(files).find(k => /^xl\/worksheets\/sheet\d+\.xml$/.test(k))
  if (!sheetName) throw new Error('Planilha XLSX sem aba válida.')
  return parseSheet(files[sheetName], shared)
}
