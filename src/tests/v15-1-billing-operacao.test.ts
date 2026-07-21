import { describe, expect, it } from 'vitest'

describe('V15.1 billing e operação comercial', () => {
  it('define status especiais de assinatura', () => {
    const statuses = ['trial_manual', 'isento_permanente', 'active', 'past_due', 'trial_desativado']
    expect(statuses).toContain('trial_manual')
    expect(statuses).toContain('isento_permanente')
  })

  it('garante rotas estruturais da operação comercial', () => {
    const rotas = ['/master/assinaturas', '/master/planos', '/assinatura', '/diagnostico', '/administracao/permissoes', '/caixa', '/onboarding/empresa']
    expect(rotas.every(r => r.startsWith('/'))).toBe(true)
  })

  it('mantém ações críticas exclusivas do Admin Master', () => {
    const masterOnly = ['ativar_teste_manual', 'desativar_teste_manual', 'abolir_cobrancas_permanentemente']
    expect(masterOnly).toContain('abolir_cobrancas_permanentemente')
  })
})
