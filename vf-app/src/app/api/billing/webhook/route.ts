import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { hashAssinaturaWebhook, validarAssinaturaHmac } from '@/lib/webhook-signature'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const webhookSecret = process.env.BILLING_WEBHOOK_SECRET

function adminClient() {
  if (!url || !serviceKey) throw new Error('Supabase Admin não configurado para billing webhook.')
  return createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
}

function extractEvent(payload: any) {
  const provider = String(payload?.provider || payload?.gateway || payload?.source || 'outro').toLowerCase()
  const eventId = String(payload?.id || payload?.event_id || payload?.data?.id || payload?.subscription?.id || '')
  const eventType = String(payload?.event || payload?.type || payload?.event_type || payload?.data?.type || 'billing.webhook')
  return { provider: ['asaas','mercado_pago','stripe','manual'].includes(provider) ? provider : 'outro', eventId, eventType }
}

export async function POST(req: NextRequest) {
  try {
    if (!webhookSecret) {
      return NextResponse.json({ error: 'BILLING_WEBHOOK_SECRET não configurado. Webhook real recusado para evitar integração falsa.' }, { status: 503 })
    }

    const raw = await req.text()
    const signature = req.headers.get('x-vf-signature') || req.headers.get('x-hub-signature-256') || req.headers.get('stripe-signature') || req.headers.get('x-signature')
    if (!validarAssinaturaHmac(raw, signature, webhookSecret)) {
      return NextResponse.json({ error: 'Assinatura do webhook inválida.' }, { status: 401 })
    }

    const payload = raw ? JSON.parse(raw) : {}
    const { provider, eventId, eventType } = extractEvent(payload)
    const supabase = adminClient()
    const { data, error } = await supabase.rpc('vf_registrar_billing_webhook', {
      p_provider: provider,
      p_event_id: eventId,
      p_event_type: eventType,
      p_payload: payload,
      p_signature_hash: hashAssinaturaWebhook(signature),
    })
    if (error) throw error
    return NextResponse.json({ ok: true, id: data })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'Erro ao processar webhook de billing.' }, { status: 400 })
  }
}
