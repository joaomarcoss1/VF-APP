import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  const secret = process.env.BILLING_WEBHOOK_SECRET
  const got = req.headers.get('x-vf-billing-secret') || req.nextUrl.searchParams.get('secret')
  if (secret && got !== secret) return NextResponse.json({ error: 'Webhook não autorizado.' }, { status: 401 })
  const payload = await req.json().catch(() => ({}))
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (url && key) {
    const db = createClient(url, key, { auth: { persistSession: false } })
    await db.from('eventos_billing').insert({ provedor: process.env.BILLING_PROVIDER || 'manual', evento: payload?.type || payload?.action || 'billing.webhook', payload, status: 'recebido' })
  }
  return NextResponse.json({ ok: true })
}
