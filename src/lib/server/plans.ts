import type { SupabaseClient } from '@supabase/supabase-js'

export type BillingPeriod = 'monthly' | 'yearly'

export async function resolveOfficialPlan(admin: SupabaseClient, code: string, period: BillingPeriod = 'monthly') {
  const normalized = String(code || '').trim().toLowerCase()
  if (!/^[a-z0-9_-]{2,40}$/.test(normalized)) throw new Error('Plano inválido.')
  const { data, error } = await admin
    .from('planos_saas')
    .select('id,codigo,nome,preco_mensal,preco_anual,moeda,stripe_price_id,stripe_product_id,ativo,limites,recursos')
    .eq('codigo', normalized)
    .eq('ativo', true)
    .maybeSingle()
  if (error) throw new Error('Não foi possível consultar o plano.')
  if (!data) throw new Error('Plano não encontrado ou inativo.')
  const amount = period === 'yearly' ? Number(data.preco_anual || Number(data.preco_mensal || 0) * 12) : Number(data.preco_mensal || 0)
  if (!Number.isFinite(amount) || amount < 0) throw new Error('Preço oficial do plano inválido.')
  return { ...data, amount, period, currency: String(data.moeda || 'BRL').toUpperCase() }
}
