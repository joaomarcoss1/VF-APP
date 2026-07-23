import { describe, expect, it } from 'vitest'
import { aggregateProductProfitability } from '@/features/reports/product-profitability'
import type { Venda } from '@/types'

describe('rentabilidade por produto V9.4', () => {
  it('acumula receita, custo, lucro, margem e CMV pelos itens vendidos', () => {
    const vendas = [{
      id: 'v1', empresa_id: 'e1', produto_nome: '2 itens', quantidade: 3,
      preco_unitario: 0, custo_unitario: 0, desconto: 0, total: 50, lucro: 23,
      canal: 'local', data_venda: '2026-07-22', created_at: '2026-07-22',
      itens: [
        { id: 'i1', empresa_id: 'e1', venda_id: 'v1', produto_id: 'p1', produto_nome: 'Produto A', quantidade: 2, preco_unitario: 10, custo_unitario: 4, subtotal: 20, total: 20, lucro: 12, created_at: '2026-07-22' },
        { id: 'i2', empresa_id: 'e1', venda_id: 'v1', produto_id: 'p2', produto_nome: 'Produto B', quantidade: 1, preco_unitario: 30, custo_unitario: 19, subtotal: 30, total: 30, lucro: 11, created_at: '2026-07-22' },
      ],
    }] as Venda[]

    const rows = aggregateProductProfitability(vendas)
    const a = rows.find((row) => row.produto_id === 'p1')
    expect(a).toMatchObject({ receita: 20, custo_total: 8, lucro_bruto: 12, margem_percentual: 60, cmv_percentual: 40 })
  })
})
