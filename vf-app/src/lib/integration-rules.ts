export type BillingProvider = 'asaas' | 'mercado_pago' | 'stripe' | 'manual' | 'outro'
export type BillingStatus = 'ativa' | 'vencida' | 'bloqueada' | 'cancelada' | 'pendente'

export function normalizarStatusBilling(status: string | null | undefined): BillingStatus {
  const s = String(status || '').toLowerCase().trim()
  if (['paid','received','confirmed','active','ativa','pago','trialing'].includes(s)) return 'ativa'
  if (['overdue','past_due','vencida','expired'].includes(s)) return 'vencida'
  if (['blocked','bloqueada','suspended','paused'].includes(s)) return 'bloqueada'
  if (['cancelled','canceled','cancelada','deleted'].includes(s)) return 'cancelada'
  return 'pendente'
}

export type AssinaturaSaasResumo = {
  status?: string | null
  tipo?: string | null
  valor?: number | string | null
  trial_ate?: string | null
  cancelada_em?: string | null
}

export function calcularMetricasSaas(assinaturas: AssinaturaSaasResumo[]) {
  const rows = assinaturas || []
  const ativas = rows.filter((a) => normalizarStatusBilling(a.status) === 'ativa')
  const canceladas = rows.filter((a) => normalizarStatusBilling(a.status) === 'cancelada')
  const vencidas = rows.filter((a) => normalizarStatusBilling(a.status) === 'vencida')
  const bloqueadas = rows.filter((a) => normalizarStatusBilling(a.status) === 'bloqueada')
  const trials = rows.filter((a) => a.trial_ate && new Date(a.trial_ate) >= new Date())
  const mrr = ativas.filter((a) => String(a.tipo || '').toLowerCase() === 'mensal').reduce((acc, a) => acc + Number(a.valor || 0), 0)
  const base = rows.length || 1
  return {
    total: rows.length,
    ativas: ativas.length,
    trials: trials.length,
    vencidas: vencidas.length,
    bloqueadas: bloqueadas.length,
    canceladas: canceladas.length,
    mrr: Number(mrr.toFixed(2)),
    churn_percentual: Number(((canceladas.length / base) * 100).toFixed(2)),
    risco_receita: Number([...vencidas, ...bloqueadas].reduce((acc, a) => acc + Number(a.valor || 0), 0).toFixed(2)),
  }
}

export function gerarStoragePath(empresaId: string, modulo: string, nomeArquivo: string): string {
  const empresa = String(empresaId || '').trim()
  if (!empresa) throw new Error('empresaId obrigatório para path de Storage.')
  const safeModulo = String(modulo || 'arquivos').toLowerCase().replace(/[^a-z0-9-_]/g, '-')
  const safeName = String(nomeArquivo || 'arquivo').replace(/[^a-zA-Z0-9._-]/g, '_')
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  return `${empresa}/${safeModulo}/${stamp}-${safeName}`
}
