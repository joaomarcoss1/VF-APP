import { describe, expect, it } from 'vitest'
import { labelPapel, normalizarPapel } from '@/services/_tenant'

describe('tenant services', () => {
  it('normaliza papéis administrativos', () => {
    expect(normalizarPapel('master_admin', false)).toBe('super_admin')
    expect(normalizarPapel('administrador', false)).toBe('empresa_admin')
    expect(normalizarPapel('gerente', false)).toBe('gerente')
    expect(normalizarPapel('vendedor', false)).toBe('funcionario')
  })

  it('exibe labels profissionais', () => {
    expect(labelPapel('super_admin')).toBe('Admin Master NexLabs')
    expect(labelPapel('empresa_admin')).toBe('Admin da Empresa')
    expect(labelPapel('funcionario')).toBe('Funcionário')
  })
})
