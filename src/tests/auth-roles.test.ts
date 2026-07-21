import { describe, expect, it } from 'vitest'

function destinoPorPapel(papel: string) {
  if (papel === 'super_admin') return '/master'
  if (papel === 'funcionario') return '/pdv'
  return '/dashboard'
}

describe('auth roles', () => {
  it('redireciona perfis para áreas corretas', () => {
    expect(destinoPorPapel('super_admin')).toBe('/master')
    expect(destinoPorPapel('empresa_admin')).toBe('/dashboard')
    expect(destinoPorPapel('gerente')).toBe('/dashboard')
    expect(destinoPorPapel('funcionario')).toBe('/pdv')
  })
})
