export type XlsxCell = string | number | boolean | Date | null | undefined
export type XlsxRow = Record<string, XlsxCell>
export type XlsxSheets = Record<string, XlsxRow[]>

const encoder = new TextEncoder()

function xmlEscape(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function safeSheetName(name: string, used: Set<string>): string {
  const base = String(name || 'Dados').replace(/[\\/*?:\[\]]/g, ' ').trim().slice(0, 31) || 'Dados'
  let candidate = base
  let i = 2
  while (used.has(candidate)) {
    const suffix = ` ${i++}`
    candidate = `${base.slice(0, Math.max(1, 31 - suffix.length))}${suffix}`
  }
  used.add(candidate)
  return candidate
}

function colName(index: number): string {
  let n = index + 1
  let out = ''
  while (n > 0) {
    const rem = (n - 1) % 26
    out = String.fromCharCode(65 + rem) + out
    n = Math.floor((n - 1) / 26)
  }
  return out
}

function isNumeric(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function cellXml(value: XlsxCell, ref: string): string {
  if (value === null || value === undefined || value === '') return `<c r="${ref}"/>`
  if (value instanceof Date) return `<c r="${ref}" t="inlineStr"><is><t>${xmlEscape(value.toLocaleString('pt-BR'))}</t></is></c>`
  if (typeof value === 'boolean') return `<c r="${ref}" t="b"><v>${value ? 1 : 0}</v></c>`
  if (isNumeric(value)) return `<c r="${ref}"><v>${value}</v></c>`
  return `<c r="${ref}" t="inlineStr"><is><t>${xmlEscape(value)}</t></is></c>`
}

function collectHeaders(rows: XlsxRow[]): string[] {
  const headers: string[] = []
  const seen = new Set<string>()
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (!seen.has(key)) {
        seen.add(key)
        headers.push(key)
      }
    }
  }
  return headers.length ? headers : ['Informação']
}

function sheetXml(rows: XlsxRow[]): string {
  const headers = collectHeaders(rows)
  const headerCells = headers.map((h, i) => `<c r="${colName(i)}1" t="inlineStr" s="1"><is><t>${xmlEscape(h)}</t></is></c>`).join('')
  const body = rows.map((row, r) => {
    const rn = r + 2
    const cells = headers.map((h, c) => cellXml(row[h], `${colName(c)}${rn}`)).join('')
    return `<row r="${rn}">${cells}</row>`
  }).join('')
  const widths = headers.map((h, i) => `<col min="${i+1}" max="${i+1}" width="${Math.min(42, Math.max(12, String(h).length + 4))}" customWidth="1"/>`).join('')
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheetViews><sheetView workbookViewId="0"/></sheetViews>
  <cols>${widths}</cols>
  <sheetData><row r="1">${headerCells}</row>${body}</sheetData>
  <autoFilter ref="A1:${colName(headers.length - 1)}${Math.max(1, rows.length + 1)}"/>
</worksheet>`
}

function crc32(bytes: Uint8Array): number {
  let c = ~0
  for (let i = 0; i < bytes.length; i++) {
    c ^= bytes[i]
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xEDB88320 & -(c & 1))
  }
  return (~c) >>> 0
}

function u16(n: number): number[] { return [n & 255, (n >>> 8) & 255] }
function u32(n: number): number[] { return [n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255] }

function buildZip(files: Array<{ name: string; data: string }>): Blob {
  const chunks: Uint8Array[] = []
  const central: Uint8Array[] = []
  let offset = 0

  for (const file of files) {
    const name = encoder.encode(file.name)
    const data = encoder.encode(file.data)
    const crc = crc32(data)
    const local = new Uint8Array([
      ...u32(0x04034b50), ...u16(20), ...u16(0), ...u16(0), ...u16(0), ...u16(0),
      ...u32(crc), ...u32(data.length), ...u32(data.length), ...u16(name.length), ...u16(0),
    ])
    chunks.push(local, name, data)
    const centralHeader = new Uint8Array([
      ...u32(0x02014b50), ...u16(20), ...u16(20), ...u16(0), ...u16(0), ...u16(0), ...u16(0),
      ...u32(crc), ...u32(data.length), ...u32(data.length), ...u16(name.length), ...u16(0), ...u16(0),
      ...u16(0), ...u16(0), ...u32(0), ...u32(offset),
    ])
    central.push(centralHeader, name)
    offset += local.length + name.length + data.length
  }

  const centralSize = central.reduce((a, b) => a + b.length, 0)
  const end = new Uint8Array([
    ...u32(0x06054b50), ...u16(0), ...u16(0), ...u16(files.length), ...u16(files.length),
    ...u32(centralSize), ...u32(offset), ...u16(0),
  ])
  return new Blob([...chunks, ...central, end], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}

export function workbookBlob(sheets: XlsxSheets, options?: { title?: string; createdAt?: Date }): Blob {
  const used = new Set<string>()
  const entries = Object.entries(sheets).filter(([, rows]) => Array.isArray(rows))
  const normalized = entries.length ? entries.map(([name, rows]) => ({ name: safeSheetName(name, used), rows })) : [{ name: 'Dados', rows: [{ Informação: 'Sem dados para exportar' }] }]
  const workbookSheets = normalized.map((s, i) => `<sheet name="${xmlEscape(s.name)}" sheetId="${i+1}" r:id="rId${i+1}"/>`).join('')
  const relationships = normalized.map((_, i) => `<Relationship Id="rId${i+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i+1}.xml"/>`).join('')
  const overrides = normalized.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')
  const created = (options?.createdAt ?? new Date()).toISOString()

  const files: Array<{ name: string; data: string }> = [
    { name: '[Content_Types].xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>${overrides}</Types>` },
    { name: '_rels/.rels', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>` },
    { name: 'docProps/core.xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${xmlEscape(options?.title || 'VF Nexus')}</dc:title><dc:creator>VF Nexus — NexLabs</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${created}</dcterms:created></cp:coreProperties>` },
    { name: 'xl/workbook.xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${workbookSheets}</sheets></workbook>` },
    { name: 'xl/_rels/workbook.xml.rels', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${relationships}<Relationship Id="rId${normalized.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>` },
    { name: 'xl/styles.xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF0A8DFF"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" applyFont="1" applyFill="1"/></cellXfs></styleSheet>` },
    ...normalized.map((s, i) => ({ name: `xl/worksheets/sheet${i+1}.xml`, data: sheetXml(s.rows.length ? s.rows : [{ Informação: 'Sem dados' }]) })),
  ]
  return buildZip(files)
}

export function downloadWorkbookXlsx(sheets: XlsxSheets, filename: string, options?: { title?: string }): void {
  const blob = workbookBlob(sheets, options)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.replace(/\.(csv|xls|xlsx)$/i, '') + '.xlsx'
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1200)
}
