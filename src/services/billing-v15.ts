import { db, getEmpresaId, normalizeError, type AnyRecord } from './_base'
import { getTenantContext } from './_tenant'
import { AuditoriaService } from './auditoria'

export type BillingStatusV15 = {
  ok: boolean
  blocked: boolean
  status: string
  modo_acesso?: string
  reason?: string | null
  empresa_id?: string
  current_period_end?: string | null
  trial_indeterminado?: boolean
  cobranca_abolida?: boolean
}

export type PlanoSaasV15 = {
  id?: string
  codigo: string
  nome: string
  descricao?: string | null
  preco_mensal?: number | null
  preco_anual?: number | null
  stripe_price_id?: string | null
  modulos?: string[] | null
  limites?: AnyRecord | null
  recursos?: AnyRecord | null
  ativo?: boolean
  ordem?: number | null
}

export const BillingV15Service = {
  async statusAtual(): Promise<BillingStatusV15> {
    const { data, error } = await db().rpc('vf_billing_status_empresa')
    if (error) throw normalizeError(error, 'Erro ao consultar status da assinatura.')
    return data as BillingStatusV15
  },

  async planos(): Promise<PlanoSaasV15[]> {
    const { data, error } = await db().from('planos_saas').select('*').order('ordem', { ascending: true })
    if (error) throw normalizeError(error, 'Erro ao listar planos SaaS.')
    return (data ?? []) as PlanoSaasV15[]
  },

  async assinaturaAtual() {
    const empresaId = await getEmpresaId()
    const { data, error } = await db().from('assinaturas_saas').select('*, plano:planos_saas(*)').eq('empresa_id', empresaId).maybeSingle()
    if (error) throw normalizeError(error, 'Erro ao carregar assinatura atual.')
    return data
  },

  async criarCheckout(plano: PlanoSaasV15) {
    const { data: sessionData, error: sessionError } = await db().auth.getSession()
    const accessToken = sessionData.session?.access_token
    if (sessionError || !accessToken) throw new Error('Sessão expirada. Entre novamente para continuar.')
    const res = await fetch('/api/billing/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ plano_codigo: plano.codigo }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data?.error || 'Erro ao criar checkout Stripe.')
    return data as { url?: string; id?: string; mode?: string }
  },

  async masterListarAssinaturas() {
    const ctx = await getTenantContext()
    if (!ctx.isSuperAdmin) throw new Error('Apenas Admin Master Global pode gerenciar assinaturas.')
    const { data, error } = await db()
      .from('assinaturas_saas')
      .select('*, empresa:empresas(id,nome,nome_fantasia,codigo_empresa,matricula_empresa,email,billing_status,trial_indeterminado,cobranca_abolida,billing_bloqueada), plano:planos_saas(*)')
      .order('updated_at', { ascending: false })
    if (error) throw normalizeError(error, 'Erro ao listar assinaturas das empresas.')
    return data ?? []
  },

  async masterListarEmpresasSemAssinatura() {
    const ctx = await getTenantContext()
    if (!ctx.isSuperAdmin) throw new Error('Apenas Admin Master Global pode listar empresas.')
    const { data, error } = await db().from('empresas').select('id,nome,nome_fantasia,codigo_empresa,matricula_empresa,email,billing_status,trial_indeterminado,cobranca_abolida,billing_bloqueada').order('created_at', { ascending: false })
    if (error) throw normalizeError(error, 'Erro ao listar empresas.')
    return data ?? []
  },

  async masterSetTrial(empresaId: string, ativo: boolean, observacao?: string) {
    const { data, error } = await db().rpc('vf_master_set_assinatura_trial', { p_empresa_id: empresaId, p_ativo: ativo, p_observacao: observacao ?? null })
    if (error) throw normalizeError(error, ativo ? 'Erro ao ativar teste.' : 'Erro ao desativar teste.')
    return data as BillingStatusV15
  },

  async masterSetCobrancaAbolida(empresaId: string, ativo: boolean, observacao?: string) {
    const { data, error } = await db().rpc('vf_master_set_cobranca_abolida', { p_empresa_id: empresaId, p_ativo: ativo, p_observacao: observacao ?? null })
    if (error) throw normalizeError(error, ativo ? 'Erro ao abolir cobranças.' : 'Erro ao reativar cobranças.')
    return data as BillingStatusV15
  },

  async masterSalvarPlano(plano: PlanoSaasV15) {
    const ctx = await getTenantContext()
    if (!ctx.isSuperAdmin) throw new Error('Apenas Admin Master Global pode configurar planos.')
    const payload = {
      codigo: plano.codigo.trim().toLowerCase(),
      nome: plano.nome,
      descricao: plano.descricao || null,
      preco_mensal: Number(plano.preco_mensal || 0),
      preco_anual: plano.preco_anual == null ? null : Number(plano.preco_anual),
      stripe_price_id: plano.stripe_price_id || null,
      modulos: plano.modulos || [],
      limites: plano.limites || {},
      recursos: plano.recursos || {},
      ativo: plano.ativo !== false,
      ordem: Number(plano.ordem || 0),
      updated_at: new Date().toISOString(),
    }
    const { data, error } = await db().from('planos_saas').upsert(payload, { onConflict: 'codigo' }).select().single()
    if (error) throw normalizeError(error, 'Erro ao salvar plano SaaS.')
    await AuditoriaService.registrar('billing.plano.salvar', 'planos_saas', data.id, { codigo: data.codigo }).catch(() => null)
    return data
  },
}
