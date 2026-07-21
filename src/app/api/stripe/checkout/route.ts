import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

function appUrl(req: NextRequest) {
  return process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || req.nextUrl.origin
}

function stripePriceFromEnv(codigo: string) {
  const key = `STRIPE_PRICE_${codigo.toUpperCase().replace(/[^A-Z0-9]/g, '_')}`
  return process.env[key] || null
}

export async function POST(req: NextRequest) {
  const secretKey = process.env.STRIPE_SECRET_KEY
  if (!secretKey) return NextResponse.json({ error: 'STRIPE_SECRET_KEY ausente. Configure a chave secreta da Stripe na Vercel ou no .env.local.' }, { status: 400 })

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) return NextResponse.json({ error: 'Supabase service role ausente. Configure SUPABASE_SERVICE_ROLE_KEY para criar checkout com segurança.' }, { status: 400 })

  const body = await req.json().catch(() => ({}))
  const planoCodigo = String(body?.plano_codigo || body?.plano || 'profissional').toLowerCase()

  const supabaseAuth = createRouteHandlerClient({ cookies })
  const { data: userData } = await supabaseAuth.auth.getUser()
  if (!userData.user) return NextResponse.json({ error: 'Usuário não autenticado.' }, { status: 401 })

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } })
  const { data: perfil, error: perfilError } = await admin.from('perfis').select('id,empresa_id,email,nome').eq('id', userData.user.id).maybeSingle()
  if (perfilError || !perfil?.empresa_id) return NextResponse.json({ error: 'Perfil sem empresa vinculada.' }, { status: 403 })

  const { data: plano } = await admin.from('planos_saas').select('*').eq('codigo', planoCodigo).maybeSingle()
  if (!plano) return NextResponse.json({ error: `Plano ${planoCodigo} não encontrado.` }, { status: 404 })

  let priceId = plano.stripe_price_id || stripePriceFromEnv(plano.codigo)
  const site = appUrl(req)
  const params = new URLSearchParams()
  params.set('mode', 'subscription')
  params.set('success_url', `${site}/assinatura/sucesso?session_id={CHECKOUT_SESSION_ID}`)
  params.set('cancel_url', `${site}/assinatura/falha`)
  params.set('client_reference_id', perfil.empresa_id)
  params.set('customer_email', perfil.email || userData.user.email || '')
  params.set('metadata[empresa_id]', perfil.empresa_id)
  params.set('metadata[plano_codigo]', plano.codigo)
  params.set('subscription_data[metadata][empresa_id]', perfil.empresa_id)
  params.set('subscription_data[metadata][plano_codigo]', plano.codigo)

  if (priceId) {
    params.set('line_items[0][price]', priceId)
    params.set('line_items[0][quantity]', '1')
  } else {
    params.set('line_items[0][quantity]', '1')
    params.set('line_items[0][price_data][currency]', 'brl')
    params.set('line_items[0][price_data][unit_amount]', String(Math.max(100, Math.round(Number(plano.preco_mensal || 1) * 100))))
    params.set('line_items[0][price_data][recurring][interval]', 'month')
    params.set('line_items[0][price_data][product_data][name]', `VF Nexus - ${plano.nome}`)
  }

  const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${secretKey}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params,
  })
  const data = await res.json()
  if (!res.ok) return NextResponse.json({ error: data?.error?.message || 'Erro ao criar checkout Stripe.', details: data }, { status: 400 })

  await admin.from('assinaturas_saas').upsert({
    empresa_id: perfil.empresa_id,
    plano_id: plano.id,
    plano_codigo: plano.codigo,
    modo_acesso: 'stripe',
    status: 'checkout_created',
    trial_indeterminado: false,
    trial_ativo: false,
    bloqueada: false,
    stripe_price_id: priceId,
    valor_mensal: plano.preco_mensal || 0,
    metadata: { checkout_session_id: data.id },
    updated_by: userData.user.id,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'empresa_id' })

  return NextResponse.json({ provider: 'stripe', url: data.url, id: data.id })
}
