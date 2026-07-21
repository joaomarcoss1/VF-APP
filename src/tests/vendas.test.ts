import { describe, expect, it } from 'vitest'
import { calcularVenda } from '@/lib/business-rules'

describe('vendas', () => {
  it('calcula venda com múltiplos itens', () => {
    const venda = calcularVenda({
      itens: [
        { produto_nome: 'Produto A', quantidade: 2, preco_unitario: 10, custo_unitario: 4 },
        { produto_nome: 'Produto B', quantidade: 1, preco_unitario: 20, custo_unitario: 8, desconto: 2 },
      ],
      taxa_entrega: 5,
      desconto_geral: 3,
      pagamentos: [{ forma_pagamento: 'pix', valor: 40 }],
    })
    expect(venda.subtotal).toBe(40)
    expect(venda.total).toBe(40)
    expect(venda.lucro).toBe(24)
    expect(venda.itens).toHaveLength(2)
  })

  it('valida múltiplas formas de pagamento e troco em dinheiro', () => {
    const venda = calcularVenda({
      itens: [{ produto_nome: 'Combo', quantidade: 1, preco_unitario: 80, custo_unitario: 30 }],
      pagamentos: [
        { forma_pagamento: 'pix', valor: 30 },
        { forma_pagamento: 'dinheiro', valor: 50, valor_recebido: 100 },
      ],
    })
    expect(venda.total_pago).toBe(80)
    expect(venda.troco).toBe(50)
  })

  it('bloqueia pagamento menor/maior que o total da venda', () => {
    expect(() => calcularVenda({ itens: [{ produto_nome: 'Item', quantidade: 1, preco_unitario: 10 }], pagamentos: [{ forma_pagamento: 'pix', valor: 9 }] })).toThrow(/soma dos pagamentos/i)
  })
})
