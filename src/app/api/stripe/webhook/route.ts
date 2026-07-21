import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

function verifyStripeSignature(rawBody: string, signature: string | null, secret: string) {
  if (!signature) return false
  const parts = Object.fromEntries(signature.split(',').map(part => {
    const [k, v] = part.split('=')
    return [k, v]
  }))
  const timestamp = parts.t
  const v1 = parts.v1
  if (!timestamp || !v1) return false
  const payload = `${timestamp}.${rawBody}`
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex')
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(v1))
  } catch {
    return false
  }
}

async function upsertSubscription(admin: any, payload: any, status: string) {
  const object = payload?.data?.object || {}
  let empresaId = object?.metadata?.empresa_id || object?.client_reference_id || null
  const subscriptionId = typeof object?.subscription === 'string' ? object.subscription : object?.id?.startsWith?.('sub_') ? object.id : null
  const customerId = typeof object?.customer === 'string' ? object.customer : object?.customer?.id || null
  const priceId = object?.items?.data?.[0]?.price?.id || object?.lines?.data?.[0]?.price?.id || null
  const planoCodigo = object?.metadata?.plano_codigo || null

  if (!empresaId && customerId) {
    const found = await admin.from('assinaturas_saas').select('empresa_id').eq('stripe_customer_id', customerId).maybeSingle()
    empresaId = found.data?.empresa_id || null
  }
  if (!empresaId) return null

  const update = {
    empresa_id: empresaId,
    modo_acesso: 'stripe',
    status,
    plano_codigo: planoCodigo,
    trial_indeterminado: false,
    trial_ativo: false,
    bloqueada: ['canceled','unpaid','incomplete_expired'].includes(status),
    bloqueio_motivo: ['canceled','unpaid','incomplete_expired'].includes(status) ? 'Assinatura Stripe inativa ou inadimplente.' : null,
    stripe_customer_id: customerId,
    stripe_subscription_id: subscriptionId,
    stripe_price_id: priceId,
    current_period_start: object?.current_period_start ? new Date(object.current_period_start * 1000).toISOString() : null,
    current_period_end: object?.current_period_end ? new Date(object.current_period_end * 1000).toISOString() : null,
    cancel_at_period_end: Boolean(object?.cancel_at_period_end),
    metadata: object,
    updated_at: new Date().toISOString(),
  }
  await admin.from('assinaturas_saas').upsert(update, { onConflict: 'empresa_id' })
  await admin.from('empresas').update({ billing_status: status, billing_bloqueada: update.bloqueada, trial_indeterminado: false, stripe_customer_id: customerId, bloqueio_motivo: update.bloqueio_motivo, updated_at: new Date().toISOString() }).eq('id', empresaId)
  return empresaId
}

export async function POST(req: NextRequest) {
  const raw = await req.text()
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (webhookSecret && !verifyStripeSignature(raw, req.headers.get('stripe-signature'), webhookSecret)) {
    return NextResponse.json({ error: 'Assinatura do webhook Stripe inválida.' }, { status: 401 })
  }

  const payload = JSON.parse(raw || '{}')
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return NextResponse.json({ ok: true, warning: 'Supabase service role não configurado.' })
  const admin = createClient(url, key, { auth: { persistSession: false } })

  let empresaId: string | null = null
  let status = 'received'
  try {
    const type = payload?.type
    if (type === 'checkout.session.completed') empresaId = await upsertSubscription(admin, payload, 'active')
    else if (type === 'customer.subscription.created' || type === 'customer.subscription.updated') empresaId = await upsertSubscription(admin, payload, payload?.data?.object?.status || 'active')
    else if (type === 'customer.subscription.deleted') empresaId = await upsertSubscription(admin, payload, 'canceled')
    else if (type === 'invoice.paid') empresaId = await upsertSubscription(admin, payload, 'active')
    else if (type === 'invoice.payment_failed') empresaId = await upsertSubscription(admin, payload, 'past_due')
    status = 'processed'
  } catch (error: any) {
    status = 'error'
    await admin.from('stripe_webhook_events').insert({ stripe_event_id: payload?.id, type: payload?.type, empresa_id: empresaId, status, payload, error_message: error?.message || String(error) })
    return NextResponse.json({ error: error?.message || 'Erro ao processar webhook.' }, { status: 400 })
  }

  await admin.from('stripe_webhook_events').upsert({ stripe_event_id: payload?.id, type: payload?.type, empresa_id: empresaId, status, payload, processed_at: new Date().toISOString() }, { onConflict: 'stripe_event_id' })
  return NextResponse.json({ ok: true })
}
