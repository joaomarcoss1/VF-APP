import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const vapidPublic = process.env.VAPID_PUBLIC_KEY
const vapidPrivate = process.env.VAPID_PRIVATE_KEY
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@vfapp.com'
const cronSecret = process.env.CRON_SECRET

function adminClient() {
  if (!url || !serviceKey) throw new Error('Supabase Admin não configurado.')
  return createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
}

function assertCron(req: NextRequest) {
  if (!cronSecret) throw new Error('CRON_SECRET não configurado.')
  const token = (req.headers.get('authorization') || '').replace('Bearer ', '').trim()
  if (token !== cronSecret) throw new Error('Acesso negado.')
}

async function processar(req: NextRequest) {
  assertCron(req)
  if (!vapidPublic || !vapidPrivate) throw new Error('Chaves VAPID não configuradas.')
  webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate)

  const supabase = adminClient()
  const { data: dashboards, error } = await supabase.from('vw_dashboard').select('*')
  if (error) throw error

  let empresasComAlerta = 0
  let notificacoes = 0
  const falhas: Array<{ empresa_id: string; erro: string }> = []

  for (const dash of dashboards ?? []) {
    const estoque = Number((dash as any).alertas_estoque_critico ?? 0)
    const vencimento = Number((dash as any).alertas_vencimento ?? 0)
    if (estoque <= 0 && vencimento <= 0) continue

    empresasComAlerta += 1
    const { data: subs, error: subError } = await supabase
      .from('push_subscriptions')
      .select('endpoint,p256dh,auth_key')
      .eq('empresa_id', (dash as any).empresa_id)

    if (subError) {
      falhas.push({ empresa_id: (dash as any).empresa_id, erro: subError.message })
      continue
    }
    if (!subs?.length) continue

    const payload = JSON.stringify({
      title: 'Resumo diário VF Nexus',
      body: `Você tem ${estoque} alerta(s) de estoque crítico e ${vencimento} vencimento(s) próximos.`,
      url: '/dashboard',
      tag: `dashboard-alertas-${(dash as any).empresa_id}`,
    })

    const results = await Promise.allSettled(subs.map((sub: any) => webpush.sendNotification({
      endpoint: sub.endpoint,
      keys: { p256dh: sub.p256dh, auth: sub.auth_key },
    }, payload)))
    notificacoes += results.filter(r => r.status === 'fulfilled').length
  }

  return NextResponse.json({ ok: true, empresasComAlerta, notificacoes, falhas })
}

export async function GET(req: NextRequest) {
  try { return await processar(req) } catch (e: any) { return NextResponse.json({ error: e.message ?? 'Erro ao processar alertas.' }, { status: 401 }) }
}

export async function POST(req: NextRequest) {
  try { return await processar(req) } catch (e: any) { return NextResponse.json({ error: e.message ?? 'Erro ao processar alertas.' }, { status: 401 }) }
}
