import { describe, expect, it } from 'vitest'
import { calcularPagamentoMisto, calcularTotalComanda, calcularTroco } from '@/lib/restaurante-calculos'

describe('VF Nexus Atendimento V2', () => {
  it('mantém mesa como mesa e balcão como balcão no payload conceitual', () => {
    const mesa = { mesa_id: 'mesa-01', tipo: 'mesa' }
    const balcao = { mesa_id: null, tipo: 'balcao' }
    expect(Boolean(mesa.mesa_id)).toBe(true)
    expect(mesa.tipo).toBe('mesa')
    expect(balcao.mesa_id).toBeNull()
    expect(balcao.tipo).toBe('balcao')
  })

  it('recalcula total quando a quantidade aumenta ou diminui', () => {
    const base = calcularTotalComanda({ items: [{ quantidade: 1, valor_unitario: 12 }], taxaPercentual: 10, cobrarTaxa: true })
    const atualizado = calcularTotalComanda({ items: [{ quantidade: 3, valor_unitario: 12 }], taxaPercentual: 10, cobrarTaxa: true })
    expect(base.total).toBe(13.2)
    expect(atualizado.total).toBe(39.6)
  })

  it('calcula troco e pagamento misto no caixa', () => {
    expect(calcularTroco(73.7, 100)).toBe(26.3)
    const resumo = calcularPagamentoMisto(120, [
      { forma_pagamento: 'pix', valor: 70 },
      { forma_pagamento: 'dinheiro', valor: 50, valor_recebido: 50 },
    ])
    expect(resumo.quitado).toBe(true)
    expect(resumo.restante).toBe(0)
  })
})
