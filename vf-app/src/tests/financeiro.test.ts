import { describe, expect, it } from 'vitest'
import { calcularDRE } from '@/lib/business-rules'

describe('financeiro', () => {
  it('gera DRE por período', () => {
    const dre = calcularDRE({ receitas: 1000, cmv: 350, despesas_variaveis: 100, despesas_fixas: 200, impostos: 50 })
    expect(dre.receita_liquida).toBe(1000)
    expect(dre.lucro_bruto).toBe(650)
    expect(dre.resultado_operacional).toBe(300)
    expect(dre.margem_liquida).toBe(30)
  })
})
