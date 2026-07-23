import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/core/logging/logger'
import { createSupabaseAdmin } from '@/lib/server/supabase-admin'
import { assertBodySize, clientIp, requestId, verifyStripeSignature } from '@/lib/server/request-security'
import { consumeRateLimit } from '@/lib/server/rate-limit'

const SUPPORTED_EVENTS = new Set([
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.paid',
  'invoice.payment_failed',
])

type StripeEvent = {
  id: string
  type: string
  created?: number
  data?: { object?: Record<string, unknown> }
}

async function upsertSubscription(admin: ReturnType<typeof createSupabaseAdmin>, payload: StripeEvent, status: string) {
  const object = (payload.data?.object || {}) as Record<string, any>
  let empresaId = object.metadata?.empresa_id || object.client_reference_id || null
  const subscriptionId = typeof object.subscription === 'string'
    ? object.subscription
    : typeof object.id === 'string' && object.id.startsWith('sub_')
      ? object.id
      : null
  const customerId = typeof object.customer === 'string' ? object.customer : object.customer?.id || null
  const priceId = object.items?.data?.[0]?.price?.id || object.lines?.data?.[0]?.price?.id || null
  const planoCodigo = object.metadata?.plano_codigo || null

  if (!empresaId && customerId) {
    const { data, error } = await admin.from('assinaturas_saas').select('empresa_id').eq('stripe_customer_id', customerId).maybeSingle()
    if (error) throw new Error('Não foi possível localizar a empresa da assinatura.')
    empresaId = data?.empresa_id || null
  }
  if (!empresaId) throw new Error('Evento Stripe sem empresa identificável.')

  const blocked = ['canceled', 'unpaid', 'incomplete_expired'].includes(status)
  const update = {
    empresa_id: empresaId,
    modo_acesso: 'stripe',
    status,
    plano_codigo: planoCodigo,
    trial_indeterminado: false,
    trial_ativo: false,
    bloqueada: blocked,
    bloqueio_motivo: blocked ? 'Assinatura Stripe inativa ou inadimplente.' : null,
    stripe_customer_id: customerId,
    stripe_subscription_id: subscriptionId,
    stripe_price_id: priceId,
    current_period_start: object.current_period_start ? new Date(Number(object.current_period_start) * 1000).toISOString() : null,
    current_period_end: object.current_period_end ? new Date(Number(object.current_period_end) * 1000).toISOString() : null,
    cancel_at_period_end: Boolean(object.cancel_at_period_end),
    metadata: { stripe_event_id: payload.id, stripe_event_type: payload.type },
    updated_at: new Date().toISOString(),
  }

  const { error: subscriptionError } = await admin.from('assinaturas_saas').upsert(update, { onConflict: 'empresa_id' })
  if (subscriptionError) throw new Error('Não foi possível atualizar a assinatura.')

  const { error: companyError } = await admin.from('empresas').update({
    billing_status: status,
    billing_bloqueada: blocked,
    trial_indeterminado: false,
    stripe_customer_id: customerId,
    bloqueio_motivo: update.bloqueio_motivo,
    updated_at: new Date().toISOString(),
  }).eq('id', empresaId)
  if (companyError) throw new Error('Não foi possível atualizar a empresa da assinatura.')
  return String(empresaId)
}

export async function POST(req: NextRequest) {
  const rid = requestId(req)
  const rate = consumeRateLimit(`stripe-webhook:${clientIp(req)}`, { limit: 120, windowMs: 60_000 })
  if (!rate.ok) return NextResponse.json({ error: 'Muitas requisições.', requestId: rid }, { status: 429, headers: { 'Retry-After': String(rate.retryAfter) } })

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    logger.error('Webhook Stripe bloqueado por ausência de segredo.', { code: 'STRIPE_SECRET_MISSING', requestId: rid })
    return NextResponse.json({ error: 'Webhook Stripe não configurado.', requestId: rid }, { status: 503 })
  }

  let raw = ''
  try {
    raw = await req.text()
    assertBodySize(raw)
  } catch {
    return NextResponse.json({ error: 'Payload inválido ou muito grande.', requestId: rid }, { status: 413 })
  }

  if (!verifyStripeSignature(raw, req.headers.get('stripe-signature'), webhookSecret)) {
    logger.warn('Assinatura Stripe inválida ou expirada.', { code: 'STRIPE_SIGNATURE_INVALID', requestId: rid })
    return NextResponse.json({ error: 'Assinatura do webhook Stripe inválida.', requestId: rid }, { status: 401 })
  }

  let payload: StripeEvent
  try {
    payload = JSON.parse(raw) as StripeEvent
  } catch {
    return NextResponse.json({ error: 'JSON inválido.', requestId: rid }, { status: 400 })
  }

  if (!payload?.id || !payload?.type) return NextResponse.json({ error: 'Evento Stripe incompleto.', requestId: rid }, { status: 400 })
  if (!SUPPORTED_EVENTS.has(payload.type)) return NextResponse.json({ ok: true, ignored: true, requestId: rid })

  let admin: ReturnType<typeof createSupabaseAdmin>
  try {
    admin = createSupabaseAdmin()
  } catch {
    return NextResponse.json({ error: 'Integração de cobrança indisponível.', requestId: rid }, { status: 503 })
  }

  const { data: existing } = await admin.from('stripe_webhook_events').select('status').eq('stripe_event_id', payload.id).maybeSingle()
  if (existing?.status === 'processed') return NextResponse.json({ ok: true, duplicate: true, requestId: rid })

  const { error: reserveError } = await admin.from('stripe_webhook_events').upsert({
    stripe_event_id: payload.id,
    type: payload.type,
    status: 'processing',
    payload: { id: payload.id, type: payload.type, created: payload.created },
    error_message: null,
  }, { onConflict: 'stripe_event_id' })
  if (reserveError) return NextResponse.json({ error: 'Não foi possível reservar o evento.', requestId: rid }, { status: 503 })

  let empresaId: string | null = null
  try {
    if (payload.type === 'checkout.session.completed') empresaId = await upsertSubscription(admin, payload, 'active')
    else if (payload.type === 'customer.subscription.created' || payload.type === 'customer.subscription.updated') {
      const object = payload.data?.object as Record<string, any> | undefined
      empresaId = await upsertSubscription(admin, payload, String(object?.status || 'active'))
    } else if (payload.type === 'customer.subscription.deleted') empresaId = await upsertSubscription(admin, payload, 'canceled')
    else if (payload.type === 'invoice.paid') empresaId = await upsertSubscription(admin, payload, 'active')
    else if (payload.type === 'invoice.payment_failed') empresaId = await upsertSubscription(admin, payload, 'past_due')

    await admin.from('stripe_webhook_events').update({
      empresa_id: empresaId,
      status: 'processed',
      processed_at: new Date().toISOString(),
      error_message: null,
    }).eq('stripe_event_id', payload.id)

    logger.info('Webhook Stripe processado.', { code: payload.type, requestId: rid, empresaId })
    return NextResponse.json({ ok: true, requestId: rid })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao processar webhook.'
    await admin.from('stripe_webhook_events').update({ status: 'error', empresa_id: empresaId, error_message: message }).eq('stripe_event_id', payload.id)
    logger.error('Falha no webhook Stripe.', { code: payload.type, requestId: rid, empresaId, details: error })
    return NextResponse.json({ error: 'Não foi possível processar o evento.', requestId: rid }, { status: 500 })
  }
}
