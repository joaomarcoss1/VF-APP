import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

async function assertBillingSession(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anon) throw new Error('Supabase não configurado.')
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) throw new Error('Sessão obrigatória para checkout.')
  const supabase = createClient(url, anon, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } })
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) throw new Error('Sessão inválida ou expirada.')
  return data.user
}


export async function POST(req: NextRequest) {
  try { await assertBillingSession(req) } catch (error: any) { return NextResponse.json({ error: error.message || 'Sessão obrigatória.' }, { status: 401 }) }
  const body = await req.json().catch(() => ({}))
  const provider = (process.env.BILLING_PROVIDER || 'manual').toLowerCase()
  const site = process.env.NEXT_PUBLIC_SITE_URL || req.nextUrl.origin
  const plano = body?.plano || 'pro'
  const valor = Number(body?.valor || 0)

  if (provider === 'manual') {
    return NextResponse.json({ mode: 'manual', url: `${site}/assinatura/sucesso?plano=${encodeURIComponent(plano)}&modo=manual`, message: 'Cobrança manual ativa. Configure Mercado Pago ou Stripe para checkout real.' })
  }

  if (provider === 'mercadopago') {
    const token = process.env.MERCADOPAGO_ACCESS_TOKEN
    if (!token) return NextResponse.json({ error: 'MERCADOPAGO_ACCESS_TOKEN ausente.' }, { status: 400 })
    const res = await fetch('https://api.mercadopago.com/checkout/preferences', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ items: [{ title: `VF Nexus - Plano ${plano}`, quantity: 1, currency_id: 'BRL', unit_price: valor || 1 }], back_urls: { success: `${site}/assinatura/sucesso`, failure: `${site}/assinatura/falha`, pending: `${site}/assinatura/sucesso?pending=1` }, auto_return: 'approved', metadata: body }) })
    const data = await res.json()
    if (!res.ok) return NextResponse.json({ error: data?.message || 'Erro ao criar checkout Mercado Pago.', details: data }, { status: 400 })
    return NextResponse.json({ provider, url: data.init_point || data.sandbox_init_point, id: data.id })
  }

  if (provider === 'stripe') {
    const key = process.env.STRIPE_SECRET_KEY
    if (!key) return NextResponse.json({ error: 'STRIPE_SECRET_KEY ausente.' }, { status: 400 })
    const params = new URLSearchParams()
    params.set('mode', 'payment')
    params.set('success_url', `${site}/assinatura/sucesso?session_id={CHECKOUT_SESSION_ID}`)
    params.set('cancel_url', `${site}/assinatura/falha`)
    params.set('line_items[0][quantity]', '1')
    params.set('line_items[0][price_data][currency]', 'brl')
    params.set('line_items[0][price_data][unit_amount]', String(Math.round((valor || 1) * 100)))
    params.set('line_items[0][price_data][product_data][name]', `VF Nexus - Plano ${plano}`)
    const res = await fetch('https://api.stripe.com/v1/checkout/sessions', { method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: params })
    const data = await res.json()
    if (!res.ok) return NextResponse.json({ error: data?.error?.message || 'Erro ao criar checkout Stripe.', details: data }, { status: 400 })
    return NextResponse.json({ provider, url: data.url, id: data.id })
  }

  return NextResponse.json({ error: `Provider de cobrança inválido: ${provider}` }, { status: 400 })
}
