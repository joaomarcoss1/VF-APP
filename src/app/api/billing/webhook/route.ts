import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/core/logging/logger'
import { consumeRateLimit } from '@/lib/server/rate-limit'
import { assertBodySize, clientIp, requestId, safeEqual, sha256 } from '@/lib/server/request-security'
import { createSupabaseAdmin } from '@/lib/server/supabase-admin'

export async function POST(req: NextRequest) {
  const rid = requestId(req)
  const rate = consumeRateLimit(`billing-webhook:${clientIp(req)}`, { limit: 60, windowMs: 60_000 })
  if (!rate.ok) return NextResponse.json({ error: 'Muitas requisições.', requestId: rid }, { status: 429, headers: { 'Retry-After': String(rate.retryAfter) } })

  const secret = process.env.BILLING_WEBHOOK_SECRET
  if (!secret) return NextResponse.json({ error: 'Webhook de cobrança não configurado.', requestId: rid }, { status: 503 })
  const provided = req.headers.get('x-vf-billing-secret') || ''
  if (!provided || !safeEqual(provided, secret)) return NextResponse.json({ error: 'Webhook não autorizado.', requestId: rid }, { status: 401 })

  let raw = ''
  try {
    raw = await req.text()
    assertBodySize(raw)
  } catch {
    return NextResponse.json({ error: 'Payload inválido ou muito grande.', requestId: rid }, { status: 413 })
  }

  let payload: Record<string, any>
  try { payload = JSON.parse(raw || '{}') as Record<string, any> } catch { return NextResponse.json({ error: 'JSON inválido.', requestId: rid }, { status: 400 }) }
  const eventName = String(payload.type || payload.action || '').trim()
  if (!eventName) return NextResponse.json({ error: 'Tipo de evento obrigatório.', requestId: rid }, { status: 400 })

  const providerEventId = String(payload.id || payload.event_id || sha256(raw))
  try {
    const admin = createSupabaseAdmin()
    const { data: existing } = await admin.from('eventos_billing').select('id,status').eq('provider_event_id', providerEventId).maybeSingle()
    if (existing) return NextResponse.json({ ok: true, duplicate: true, requestId: rid })
    const { error } = await admin.from('eventos_billing').insert({
      provedor: process.env.BILLING_PROVIDER || 'manual',
      provider_event_id: providerEventId,
      evento: eventName,
      payload,
      status: 'recebido',
    })
    if (error) throw error
    logger.info('Webhook genérico de cobrança registrado.', { code: eventName, requestId: rid })
    return NextResponse.json({ ok: true, requestId: rid })
  } catch (error) {
    logger.error('Falha ao registrar webhook de cobrança.', { code: eventName, requestId: rid, details: error })
    return NextResponse.json({ error: 'Não foi possível registrar o evento.', requestId: rid }, { status: 500 })
  }
}
