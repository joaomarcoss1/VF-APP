import { describe, expect, it } from 'vitest'
import { calcularMovimentoEstoque } from '@/lib/business-rules'

describe('estoque', () => {
  it('calcula entrada com custo médio real', () => {
    const result = calcularMovimentoEstoque({ saldo_atual: 10, custo_medio_atual: 5, quantidade: 10, custo_unitario: 7, tipo: 'entrada' })
    expect(result.novo_saldo).toBe(20)
    expect(result.custo_medio).toBe(6)
  })

  it('bloqueia movimentação com quantidade inválida', () => {
    expect(() => calcularMovimentoEstoque({ saldo_atual: 10, quantidade: 0, tipo: 'saida' })).toThrow(/quantidade/i)
  })
})
