import { db, normalizeError, assertPermission } from './_base'
import { AuditoriaService } from './auditoria'

export const MasterService = {
  async souMaster() {
    const { data: user } = await db().auth.getUser()
    if (!user.user?.id) return { is_master: false }
    const { data, error } = await db().from('master_admins').select('*').eq('user_id', user.user.id).maybeSingle()
    if (error) return { is_master: false }
    return { is_master: Boolean(data), data }
  },
  async dashboard() {
    await assertPermission('master-admin', 'administrar')
    const [{ data: empresas, error: empresasError }, { data: assinaturas, error: assError }, { data: perfis, error: perfisError }] = await Promise.all([
      db().from('empresas').select('*').order('created_at', { ascending: false }),
      db().from('assinaturas').select('*'),
      db().from('perfis').select('*'),
    ])
    if (empresasError) throw normalizeError(empresasError, 'Erro ao carregar empresas.')
    if (assError) throw normalizeError(assError, 'Erro ao carregar assinaturas.')
    if (perfisError) throw normalizeError(perfisError, 'Erro ao carregar usuários.')
    const ativos = (assinaturas ?? []).filter((a: any) => a.status === 'ativa')
    const vencidas = (assinaturas ?? []).filter((a: any) => ['vencida','bloqueada'].includes(a.status))
    const mrr = ativos.filter((a: any) => a.tipo === 'mensal').reduce((acc: number, a: any) => acc + Number(a.valor || 0), 0)
    const churn = (assinaturas ?? []).length ? ((assinaturas ?? []).filter((a: any) => a.status === 'cancelada').length / (assinaturas ?? []).length) * 100 : 0
    return { total_empresas: empresas?.length ?? 0, total_usuarios: perfis?.length ?? 0, assinantes_ativos: ativos.length, assinaturas_vencidas: vencidas.length, mrr, churn, inadimplencia: vencidas.reduce((a: number, s: any) => a + Number(s.valor || 0), 0), empresas: empresas ?? [], assinaturas: assinaturas ?? [] }
  },
  async impersonar(empresaId: string, motivo: string) {
    await assertPermission('master-admin', 'impersonar')
    if (!motivo || motivo.trim().length < 8) throw new Error('Informe motivo de suporte para impersonar esta empresa.')
    const { data, error } = await db().rpc('vf_iniciar_impersonar', { p_empresa_id: empresaId, p_motivo: motivo.trim() })
    if (error) throw normalizeError(error, 'Erro ao iniciar sessão de suporte/impersonar.')
    await AuditoriaService.registrar('master.impersonar.frontend', 'empresas', empresaId, { motivo: motivo.trim(), sessao_id: data }).catch(() => null)
    return { id: data as string, empresa_id: empresaId, iniciado_em: new Date().toISOString(), motivo: motivo.trim(), status: 'ativa' }
  },
  async encerrarImpersonar(sessaoId: string) {
    await assertPermission('master-admin', 'impersonar')
    const { error } = await db().rpc('vf_encerrar_impersonar', { p_sessao_id: sessaoId })
    if (error) throw normalizeError(error, 'Erro ao encerrar sessão de suporte/impersonar.')
  },
  async sessoesImpersonar(limit = 50) {
    await assertPermission('master-admin', 'impersonar')
    const { data, error } = await db().from('impersonar_sessoes').select('*, empresa:empresas(nome,email)').order('iniciado_em', { ascending: false }).limit(limit)
    if (error) throw normalizeError(error, 'Erro ao listar sessões de suporte/impersonar.')
    return data ?? []
  },
}
