import { describe, expect, it } from 'vitest'
import { assertSameEmpresa, normalizeV15Role, stripUnsafeTenantFields } from '@/lib/v15-security'

describe('V15 multiempresa isolamento', () => {
  it('bloqueia acesso cruzado entre empresas para usuário comum', () => {
    expect(() => assertSameEmpresa({ empresaId: 'empresa-a', role: 'funcionario', resourceEmpresaId: 'empresa-b' })).toThrow(/outra empresa/i)
  })

  it('permite super_admin somente pela camada master controlada', () => {
    expect(() => assertSameEmpresa({ empresaId: null, role: 'super_admin', resourceEmpresaId: 'empresa-b' })).not.toThrow()
  })

  it('remove empresa_id informado pelo front em payload comum', () => {
    expect(stripUnsafeTenantFields({ nome: 'Produto', empresa_id: 'fraude', company_id: 'fraude' } as any)).toEqual({ nome: 'Produto' })
  })

  it('normaliza papeis críticos', () => {
    expect(normalizeV15Role('entregador')).toBe('driver')
    expect(normalizeV15Role('administrador')).toBe('empresa_admin')
    expect(normalizeV15Role('master_admin')).toBe('super_admin')
  })
})
