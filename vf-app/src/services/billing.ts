import { calcularMetricasSaas } from '@/lib/integration-rules'
import { db, normalizeError, assertPermission } from './_base'
import { AuditoriaService } from './auditoria'

export const BillingService = {
  async eventos(limit = 100) {
    await assertPermission('master-admin', 'administrar')
    const { data, error } = await db().from('billing_webhook_eventos').select('*, empresa:empresas(nome), assinatura:assinaturas(*)').order('recebido_em', { ascending: false }).limit(limit)
    if (error) throw normalizeError(error, 'Erro ao listar eventos de billing.')
    return data ?? []
  },

  async historicoAssinatura(assinaturaId: string) {
    await assertPermission('master-admin', 'administrar')
    const { data, error } = await db().from('assinaturas_historico').select('*').eq('assinatura_id', assinaturaId).order('created_at', { ascending: false })
    if (error) throw normalizeError(error, 'Erro ao listar histórico da assinatura.')
    return data ?? []
  },

  async metricas() {
    await assertPermission('master-admin', 'administrar')
    const { data, error } = await db().from('assinaturas').select('status,tipo,valor,trial_ate,cancelada_em')
    if (error) throw normalizeError(error, 'Erro ao calcular métricas SaaS.')
    return calcularMetricasSaas((data ?? []) as any[])
  },

  async registrarDeployValidacao(args: { ambiente: string; versao?: string; commit_sha?: string; status: 'pendente' | 'aprovado' | 'falhou'; checks: Record<string, unknown>; observacoes?: string }) {
    await assertPermission('master-admin', 'administrar')
    const { data, error } = await db().rpc('vf_registrar_deploy_validacao', {
      p_ambiente: args.ambiente,
      p_versao: args.versao ?? null,
      p_commit_sha: args.commit_sha ?? null,
      p_status: args.status,
      p_checks: args.checks,
      p_observacoes: args.observacoes ?? null,
    })
    if (error) throw normalizeError(error, 'Erro ao registrar validação de deploy.')
    await AuditoriaService.registrar('deploy.validacao.registrar', 'deploy_validacoes', String(data), args).catch(() => null)
    return String(data)
  },
}
