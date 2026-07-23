import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/core/logging/logger'
import { requireBearerUser } from '@/lib/server/auth'
import { resolveOfficialPlan, type BillingPeriod } from '@/lib/server/plans'
import { consumeRateLimit } from '@/lib/server/rate-limit'
import { clientIp, requestId } from '@/lib/server/request-security'
import { createSupabaseAdmin } from '@/lib/server/supabase-admin'

export async function POST(req: NextRequest) {
  const rid = requestId(req)
  const rate = consumeRateLimit(`billing-checkout:${clientIp(req)}`, { limit: 12, windowMs: 60_000 })
  if (!rate.ok) return NextResponse.json({ error: 'Muitas tentativas de checkout.', requestId: rid }, { status: 429, headers: { 'Retry-After': String(rate.retryAfter) } })

  try {
    const { user } = await requireBearerUser(req)
    const body = await req.json().catch(() => ({}))
    const planCode = String(body?.plano_codigo || body?.plano || '').trim().toLowerCase()
    const period: BillingPeriod = body?.periodicidade === 'yearly' || body?.periodicidade === 'anual' ? 'yearly' : 'monthly'
    if (!planCode) return NextResponse.json({ error: 'Plano obrigatório.', requestId: rid }, { status: 400 })

    const admin = createSupabaseAdmin()
    const { data: profile, error: profileError } = await admin.from('perfis').select('id,empresa_id,email,bloqueado').eq('id', user.id).maybeSingle()
    if (profileError || !profile?.empresa_id || profile.bloqueado) return NextResponse.json({ error: 'Usuário sem empresa autorizada.', requestId: rid }, { status: 403 })

    const plan = await resolveOfficialPlan(admin, planCode, period)
    const provider = String(process.env.BILLING_PROVIDER || (process.env.STRIPE_SECRET_KEY ? 'stripe' : 'manual')).toLowerCase()
    const site = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin

    if (provider === 'manual') {
      return NextResponse.json({
        mode: 'manual',
        url: `${site}/assinatura/sucesso?plano=${encodeURIComponent(plan.codigo)}&modo=manual`,
        message: 'Cobrança manual ativa.',
        requestId: rid,
      })
    }

    if (provider === 'mercadopago') {
      const token = process.env.MERCADOPAGO_ACCESS_TOKEN
      if (!token) return NextResponse.json({ error: 'Mercado Pago não configurado.', requestId: rid }, { status: 503 })
      const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'X-Idempotency-Key': `${profile.empresa_id}:${plan.id}:${period}` },
        body: JSON.stringify({
          items: [{ title: `VF Nexus - ${plan.nome}`, quantity: 1, currency_id: plan.currency, unit_price: plan.amount }],
          payer: { email: profile.email || user.email },
          back_urls: {
            success: `${site}/assinatura/sucesso`,
            failure: `${site}/assinatura/falha`,
            pending: `${site}/assinatura/sucesso?pending=1`,
          },
          auto_return: 'approved',
          external_reference: profile.empresa_id,
          metadata: { empresa_id: profile.empresa_id, plano_codigo: plan.codigo, periodicidade: period },
        }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data?.message || 'Erro ao criar checkout Mercado Pago.')
      return NextResponse.json({ provider, url: data.init_point || data.sandbox_init_point, id: data.id, requestId: rid })
    }

    if (provider === 'stripe') {
      const secret = process.env.STRIPE_SECRET_KEY
      if (!secret) return NextResponse.json({ error: 'Stripe não configurada.', requestId: rid }, { status: 503 })
      const params = new URLSearchParams()
      params.set('mode', 'subscription')
      params.set('success_url', `${site}/assinatura/sucesso?session_id={CHECKOUT_SESSION_ID}`)
      params.set('cancel_url', `${site}/assinatura/falha`)
      params.set('client_reference_id', profile.empresa_id)
      params.set('customer_email', profile.email || user.email || '')
      params.set('metadata[empresa_id]', profile.empresa_id)
      params.set('metadata[plano_codigo]', plan.codigo)
      params.set('metadata[periodicidade]', period)
      params.set('subscription_data[metadata][empresa_id]', profile.empresa_id)
      params.set('subscription_data[metadata][plano_codigo]', plan.codigo)
      params.set('line_items[0][quantity]', '1')
      if (plan.stripe_price_id && period === 'monthly') {
        params.set('line_items[0][price]', plan.stripe_price_id)
      } else {
        params.set('line_items[0][price_data][currency]', plan.currency.toLowerCase())
        params.set('line_items[0][price_data][unit_amount]', String(Math.round(plan.amount * 100)))
        params.set('line_items[0][price_data][recurring][interval]', period === 'yearly' ? 'year' : 'month')
        params.set('line_items[0][price_data][product_data][name]', `VF Nexus - ${plan.nome}`)
      }
      const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/x-www-form-urlencoded', 'Idempotency-Key': `${profile.empresa_id}:${plan.id}:${period}` },
        body: params,
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data?.error?.message || 'Erro ao criar checkout Stripe.')
      return NextResponse.json({ provider, url: data.url, id: data.id, requestId: rid })
    }

    return NextResponse.json({ error: 'Provider de cobrança inválido.', requestId: rid }, { status: 400 })
  } catch (error) {
    logger.error('Falha ao criar checkout.', { requestId: rid, details: error })
    const status = error instanceof Error && /sessão/i.test(error.message) ? 401 : 500
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Não foi possível criar o checkout.', requestId: rid }, { status })
  }
}
