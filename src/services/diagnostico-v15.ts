import { db, getEmpresaId, getPerfilAtual } from './_base'
import { getSupabaseEnvStatus } from '@/lib/supabase'
import { BillingV15Service } from './billing-v15'

export type DiagnosticoCheckV15 = {
  chave: string
  titulo: string
  status: 'ok' | 'warn' | 'error'
  detalhe: string
}

async function tableCount(table: string, empresaId: string) {
  const { count, error } = await db().from(table).select('id', { count: 'exact', head: true }).eq('empresa_id', empresaId)
  if (error) return { ok: false, count: 0, error: error.message }
  return { ok: true, count: count || 0 }
}

export const DiagnosticoV15Service = {
  async executar(): Promise<DiagnosticoCheckV15[]> {
    const env = getSupabaseEnvStatus()
    const perfil = await getPerfilAtual().catch(() => null)
    const empresaId = await getEmpresaId().catch(() => null)
    const billing = await BillingV15Service.statusAtual().catch((e) => ({ ok: false, blocked: true, status: 'erro', reason: e.message }))
    const health = await fetch('/api/health').then(r => r.json()).catch(() => null)

    const checks: DiagnosticoCheckV15[] = [
      { chave: 'supabase_env', titulo: 'Supabase configurado', status: env.ok ? 'ok' : 'error', detalhe: env.ok ? 'Variáveis públicas do Supabase encontradas.' : env.message },
      { chave: 'profile', titulo: 'Perfil carregado', status: perfil?.id ? 'ok' : 'error', detalhe: perfil?.id ? `Usuário ${(perfil as any).nome || (perfil as any).email || perfil.id}` : 'Perfil não encontrado.' },
      { chave: 'empresa_id', titulo: 'Empresa atual detectada', status: empresaId ? 'ok' : 'error', detalhe: empresaId || 'Usuário comum sem empresa_id deve ser bloqueado.' },
      { chave: 'billing', titulo: 'Status de assinatura', status: billing.blocked ? 'error' : billing.status === 'past_due' ? 'warn' : 'ok', detalhe: `${billing.status}: ${billing.reason || 'acesso liberado'}` },
      { chave: 'health_api', titulo: 'Healthcheck API', status: health?.ok ? 'ok' : 'warn', detalhe: health?.ok ? `Versão ${health.version || 'indefinida'}` : 'API de saúde não respondeu.' },
      { chave: 'stripe_env', titulo: 'Stripe preparado', status: health?.stripe?.configured ? 'ok' : 'warn', detalhe: health?.stripe?.configured ? 'STRIPE_SECRET_KEY e webhook configurados.' : 'Configure STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET e os Price IDs na Vercel.' },
    ]

    if (empresaId) {
      const tabelas = ['produtos','vendas','clientes','caixas','logs_auditoria']
      for (const tabela of tabelas) {
        const result = await tableCount(tabela, empresaId)
        checks.push({ chave: `table_${tabela}`, titulo: `Tabela ${tabela}`, status: result.ok ? 'ok' : 'warn', detalhe: result.ok ? `${result.count} registros desta empresa.` : `Falha ao consultar ${tabela}: ${result.error}` })
      }
    }

    return checks
  },
}
