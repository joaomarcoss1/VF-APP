import { describe, expect, it } from 'vitest'
import { calcularCompra } from '@/lib/business-rules'

describe('compras', () => {
  it('calcula compra e base para conta a pagar', () => {
    const compra = calcularCompra([
      { tipo_item: 'produto', nome: 'Produto A', quantidade: 2, custo_unitario: 15 },
      { tipo_item: 'insumo', nome: 'Insumo B', quantidade: 5, custo_unitario: 4 },
    ], { frete: 10, taxas: 5, desconto: 3 })
    expect(compra.valor_produtos).toBe(50)
    expect(compra.valor_total).toBe(62)
  })
})
