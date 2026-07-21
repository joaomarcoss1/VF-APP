import type { Assinatura } from '@/types'
import { db, getEmpresaId, normalizeError } from './_base'
import { BillingV15Service, type BillingStatusV15 } from './billing-v15'

export type AssinaturaComStatus = (Assinatura & {
  status_billing?: BillingStatusV15
  trial_indeterminado?: boolean
  trial_ativo?: boolean
  cobranca_abolida?: boolean
  modo_acesso?: string
  plano_codigo?: string
  valor_mensal?: number
}) | null

export const AssinaturaService = {
  async minhaAssinatura(): Promise<AssinaturaComStatus> {
    const empresaId = await getEmpresaId()
    const status = await BillingV15Service.statusAtual().catch(() => null)
    const { data, error } = await db().from('assinaturas_saas').select('*, plano:planos_saas(*)').eq('empresa_id', empresaId).maybeSingle()
    if (error) {
      const fallback = await db().from('assinaturas').select('*').eq('empresa_id', empresaId).maybeSingle()
      if (fallback.error) throw normalizeError(fallback.error, 'Erro ao carregar assinatura.')
      return { ...(fallback.data as any), status_billing: status ?? undefined } as AssinaturaComStatus
    }
    return ({ ...(data as any), status_billing: status ?? undefined } as AssinaturaComStatus) ?? null
  },
}
