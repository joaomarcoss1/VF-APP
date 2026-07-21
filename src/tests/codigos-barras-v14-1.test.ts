import { describe, expect, it } from 'vitest'
import { barcodeSvg, detectBarcodeKind, generateInternalBarcode, isValidEAN13 } from '@/lib/barcode'

describe('V14.1 códigos de barras e etiquetas', () => {
  it('valida EAN13', () => {
    expect(isValidEAN13('7891234567895')).toBe(true)
    expect(isValidEAN13('7891234567890')).toBe(false)
  })

  it('gera código interno único legível', () => {
    const code = generateInternalBarcode('empresa-abc', 'produto-xyz', 123456)
    expect(code.startsWith('VF')).toBe(true)
    expect(code.length).toBeGreaterThan(10)
  })

  it('renderiza SVG de Code128', () => {
    const svg = barcodeSvg('VFTESTE123')
    expect(svg).toContain('<svg')
    expect(svg).toContain('<rect')
  })

  it('detecta EAN13 quando válido', () => {
    expect(detectBarcodeKind('7891234567895')).toBe('EAN13')
  })
})
