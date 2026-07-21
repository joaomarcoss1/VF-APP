export type BarcodeKind = 'CODE128' | 'EAN13' | 'EAN8' | 'UPC' | 'QR' | 'SKU'

const CODE128_PATTERNS = [
  '212222','222122','222221','121223','121322','131222','122213','122312','132212','221213','221312','231212','112232','122132','122231','113222','123122','123221','223211','221132','221231','213212','223112','312131','311222','321122','321221','312212','322112','322211','212123','212321','232121','111323','131123','131321','112313','132113','132311','211313','231113','231311','112133','112331','132131','113123','113321','133121','313121','211331','231131','213113','213311','213131','311123','311321','331121','312113','312311','332111','314111','221411','431111','111224','111422','121124','121421','141122','141221','112214','112412','122114','122411','142112','142211','241211','221114','413111','241112','134111','111242','121142','121241','114212','124112','124211','411212','421112','421211','212141','214121','412121','111143','111341','131141','114113','114311','411113','411311','113141','114131','311141','411131','211412','211214','211232','2331112'
]

function normalizeCode128(value: string): string {
  return String(value || '').trim().replace(/[^\x20-\x7E]/g, '')
}

export function generateInternalBarcode(empresaId?: string | null, produtoId?: string | null, seed = Date.now()): string {
  const empresa = String(empresaId || 'EMP').replace(/[^a-zA-Z0-9]/g, '').slice(0, 5).toUpperCase().padEnd(5, '0')
  const produto = String(produtoId || 'PROD').replace(/[^a-zA-Z0-9]/g, '').slice(0, 5).toUpperCase().padEnd(5, '0')
  const seq = Math.abs(seed).toString(36).toUpperCase().slice(-5).padStart(5, '0')
  return `VF${empresa}${produto}${seq}`
}

export function isValidEAN13(value: string): boolean {
  const digits = String(value || '').replace(/\D/g, '')
  if (!/^\d{13}$/.test(digits)) return false
  const body = digits.slice(0, 12)
  const sum = body.split('').reduce((acc, n, i) => acc + Number(n) * (i % 2 === 0 ? 1 : 3), 0)
  const check = (10 - (sum % 10)) % 10
  return check === Number(digits[12])
}

export function isValidEAN8(value: string): boolean {
  const digits = String(value || '').replace(/\D/g, '')
  if (!/^\d{8}$/.test(digits)) return false
  const body = digits.slice(0, 7)
  const sum = body.split('').reduce((acc, n, i) => acc + Number(n) * (i % 2 === 0 ? 3 : 1), 0)
  const check = (10 - (sum % 10)) % 10
  return check === Number(digits[7])
}

export function detectBarcodeKind(value: string): BarcodeKind {
  const clean = String(value || '').trim()
  const digits = clean.replace(/\D/g, '')
  if (isValidEAN13(digits)) return 'EAN13'
  if (isValidEAN8(digits)) return 'EAN8'
  if (/^\d{12}$/.test(digits)) return 'UPC'
  return 'CODE128'
}

export function code128Bars(value: string): string {
  const clean = normalizeCode128(value) || 'VF-NEXUS'
  const codes: number[] = [104]
  for (const ch of clean) codes.push(ch.charCodeAt(0) - 32)
  let checksum = 104
  for (let i = 1; i < codes.length; i++) checksum += codes[i] * i
  codes.push(checksum % 103, 106)
  return codes.map(code => CODE128_PATTERNS[code] || CODE128_PATTERNS[0]).join('')
}

const EAN_L: Record<string, string> = { '0':'0001101','1':'0011001','2':'0010011','3':'0111101','4':'0100011','5':'0110001','6':'0101111','7':'0111011','8':'0110111','9':'0001011' }
const EAN_G: Record<string, string> = { '0':'0100111','1':'0110011','2':'0011011','3':'0100001','4':'0011101','5':'0111001','6':'0000101','7':'0010001','8':'0001001','9':'0010111' }
const EAN_R: Record<string, string> = { '0':'1110010','1':'1100110','2':'1101100','3':'1000010','4':'1011100','5':'1001110','6':'1010000','7':'1000100','8':'1001000','9':'1110100' }
const EAN_PARITY = ['LLLLLL','LLGLGG','LLGGLG','LLGGGL','LGLLGG','LGGLLG','LGGGLL','LGLGLG','LGLGGL','LGGLGL']

function ean13Bits(value: string): string | null {
  const digits = String(value || '').replace(/\D/g, '')
  if (!isValidEAN13(digits)) return null
  const first = Number(digits[0])
  const left = digits.slice(1, 7)
  const right = digits.slice(7)
  const parity = EAN_PARITY[first]
  let bits = '101'
  for (let i=0;i<left.length;i++) bits += parity[i] === 'L' ? EAN_L[left[i]] : EAN_G[left[i]]
  bits += '01010'
  for (const d of right) bits += EAN_R[d]
  bits += '101'
  return bits
}

export function barcodeSvg(value: string, options?: { height?: number; width?: number; text?: boolean; kind?: BarcodeKind }): string {
  const height = options?.height ?? 72
  const width = options?.width ?? 260
  const kind = options?.kind ?? detectBarcodeKind(value)
  const clean = String(value || '').trim() || 'VF-NEXUS'
  let bits = ''
  if (kind === 'EAN13') {
    bits = ean13Bits(clean) || ''
  }
  if (!bits) {
    const pattern = code128Bars(clean)
    let black = true
    for (const n of pattern) {
      bits += (black ? '1' : '0').repeat(Number(n))
      black = !black
    }
  }
  const barHeight = options?.text === false ? height : Math.max(34, height - 18)
  const unit = width / bits.length
  let x = 0
  const rects: string[] = []
  for (const bit of bits) {
    if (bit === '1') rects.push(`<rect x="${x.toFixed(3)}" y="0" width="${Math.max(unit, .45).toFixed(3)}" height="${barHeight}"/>`)
    x += unit
  }
  const text = options?.text === false ? '' : `<text x="${width/2}" y="${height-4}" text-anchor="middle" font-size="10" font-family="monospace" fill="#111827">${escapeXml(clean)}</text>`
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Código de barras ${escapeXml(clean)}"><rect width="100%" height="100%" fill="#ffffff"/><g fill="#111827">${rects.join('')}</g>${text}</svg>`
}

export function barcodeDataUrl(value: string, options?: { height?: number; width?: number; text?: boolean; kind?: BarcodeKind }): string {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(barcodeSvg(value, options))}`
}

function escapeXml(value: string): string {
  return String(value).replace(/[<>&"']/g, ch => ({ '<':'&lt;', '>':'&gt;', '&':'&amp;', '"':'&quot;', "'":'&apos;' }[ch] || ch))
}
