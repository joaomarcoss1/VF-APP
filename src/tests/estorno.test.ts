import { describe, expect, it } from 'vitest'
import { validarMotivoObrigatorio } from '@/lib/business-rules'

describe('cancelamento e estorno', () => {
  it('exige motivo obrigatório para cancelar venda', () => {
    expect(() => validarMotivoObrigatorio('', 'cancelar venda')).toThrow(/motivo obrigatório/i)
    expect(() => validarMotivoObrigatorio('abc', 'cancelar venda')).toThrow(/5 caracteres/i)
    expect(validarMotivoObrigatorio('Cliente desistiu', 'cancelar venda')).toBe('Cliente desistiu')
  })
})
