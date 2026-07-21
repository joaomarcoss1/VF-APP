import { describe, expect, it } from 'vitest'
import { V15_SECURITY_MATRIX } from '@/lib/v15-security'

describe('V15 RBAC permissões', () => {
  it('driver fica restrito ao portal do entregador', () => {
    expect(V15_SECURITY_MATRIX.driver).toEqual(['portal_entregador'])
  })
  it('empresa admin possui administração e módulos operacionais', () => {
    expect(V15_SECURITY_MATRIX.empresa_admin).toContain('administracao')
    expect(V15_SECURITY_MATRIX.empresa_admin).toContain('pdv')
    expect(V15_SECURITY_MATRIX.empresa_admin).toContain('entregas')
  })
})
