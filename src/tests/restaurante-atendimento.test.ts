import { describe, expect, it } from 'vitest'
import { calcularPagamentoMisto, calcularResumoCaixa, calcularTotalComanda, calcularTroco } from '@/lib/restaurante-calculos'

describe('VF Nexus Atendimento - cálculos operacionais', () => {
  it('calcula subtotal, taxa, desconto e total da comanda', () => {
    const result = calcularTotalComanda({
      items: [
        { quantidade: 2, valor_unitario: 12 },
        { quantidade: 1, valor_unitario: 35 },
      ],
      taxaPercentual: 10,
      cobrarTaxa: true,
      desconto: 4,
    })
    expect(result.subtotal).toBe(59)
    expect(result.taxa_servico).toBe(5.9)
    expect(result.desconto).toBe(4)
    expect(result.total).toBe(60.9)
  })

  it('calcula troco em pagamento dinheiro', () => {
    expect(calcularTroco(73.7, 100)).toBe(26.3)
  })

  it('valida pagamento misto até quitar a comanda', () => {
    const result = calcularPagamentoMisto(120, [
      { forma_pagamento: 'pix', valor: 70 },
      { forma_pagamento: 'dinheiro', valor: 50, valor_recebido: 50 },
    ])
    expect(result.quitado).toBe(true)
    expect(result.restante).toBe(0)
  })

  it('calcula resumo de caixa com dinheiro esperado e diferença', () => {
    const result = calcularResumoCaixa({
      valorAbertura: 200,
      pagamentos: [
        { forma_pagamento: 'dinheiro', valor: 450 },
        { forma_pagamento: 'pix', valor: 820 },
      ],
      sangrias: 100,
      reforcos: 50,
      dinheiroInformado: 598,
    })
    expect(result.valorEsperadoDinheiro).toBe(600)
    expect(result.diferenca).toBe(-2)
  })
})
