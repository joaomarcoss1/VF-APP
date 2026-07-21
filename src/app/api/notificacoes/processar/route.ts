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
  const auth = req.headers.get('authorization') || ''
  const token = auth.replace('Bearer ', '').trim()
  if (token !== cronSecret) throw new Error('Acesso negado ao processamento de notificações.')
}

function formatarDataHora(data?: string, hora?: string) {
  if (!data && !hora) return 'horário agendado'
  return `${data ?? ''}${hora ? ` às ${String(hora).slice(0, 5)}` : ''}`.trim()
}

async function processar(req: NextRequest) {
  assertCron(req)
  if (!vapidPublic || !vapidPrivate) throw new Error('Chaves VAPID não configuradas.')
  webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate)

  const supabase = adminClient()
  const { data: fila, error } = await supabase
    .from('notificacoes_agendadas')
    .select('id,empresa_id,agendamento_id,enviar_em,agendamentos(cliente_nome,servico_nome,data_agendamento,hora_inicio)')
    .eq('enviada', false)
    .lte('enviar_em', new Date().toISOString())
    .order('enviar_em', { ascending: true })
    .limit(50)

  if (error) throw error

  let enviadas = 0
  let falhas = 0

  for (const item of fila ?? []) {
    try {
      const agendamento = Array.isArray((item as any).agendamentos) ? (item as any).agendamentos[0] : (item as any).agendamentos
      const { data: subscriptions, error: subError } = await supabase
        .from('push_subscriptions')
        .select('endpoint,p256dh,auth_key')
        .eq('empresa_id', (item as any).empresa_id)

      if (subError) throw subError
      if (!subscriptions?.length) throw new Error('Nenhum dispositivo inscrito para esta empresa.')

      const payload = JSON.stringify({
        title: 'Lembrete de agendamento',
        body: `${agendamento?.cliente_nome ?? 'Cliente'} — ${agendamento?.servico_nome ?? 'Serviço'} em ${formatarDataHora(agendamento?.data_agendamento, agendamento?.hora_inicio)}.`,
        url: '/agendamentos',
        tag: `agendamento-${(item as any).agendamento_id}`,
        requireInteraction: true,
      })

      await Promise.allSettled(subscriptions.map((sub: any) => webpush.sendNotification({
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth_key },
      }, payload)))

      await supabase.from('notificacoes_agendadas').update({ enviada: true, enviada_em: new Date().toISOString(), erro: null }).eq('id', (item as any).id)
      enviadas += 1
    } catch (err: any) {
      falhas += 1
      await supabase.from('notificacoes_agendadas').update({ erro: err?.message ?? 'Erro desconhecido' }).eq('id', (item as any).id)
    }
  }

  return NextResponse.json({ ok: true, processadas: fila?.length ?? 0, enviadas, falhas })
}

export async function GET(req: NextRequest) {
  try { return await processar(req) } catch (e: any) { return NextResponse.json({ error: e.message ?? 'Erro ao processar notificações.' }, { status: 401 }) }
}

export async function POST(req: NextRequest) {
  try { return await processar(req) } catch (e: any) { return NextResponse.json({ error: e.message ?? 'Erro ao processar notificações.' }, { status: 401 }) }
}
