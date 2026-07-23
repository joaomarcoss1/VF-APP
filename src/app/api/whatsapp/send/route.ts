import { NextRequest, NextResponse } from 'next/server'
import { requireBearerUser } from '@/lib/server/auth'
import { checkRateLimit } from '@/lib/server/rate-limit'
import { assertBodySize, clientIp, requestId as createRequestId } from '@/lib/server/request-security'

export const runtime = 'nodejs'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function providerConfig() {
  return {
    provider: String(process.env.WHATSAPP_PROVIDER || 'generic').toLowerCase(),
    baseUrl: process.env.WHATSAPP_API_URL,
    token: process.env.WHATSAPP_API_TOKEN,
    instance: process.env.WHATSAPP_INSTANCE,
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
  }
}

async function sendProvider(message: Record<string, unknown>) {
  const config = providerConfig()
  if (!config.baseUrl || !config.token) throw new Error('Provider do WhatsApp não configurado.')

  const phone = String(message.telefone || '')
  const text = String(message.mensagem || '')
  const documentUrl = message.arquivo_url ? String(message.arquivo_url) : null
  const filename = String(message.arquivo_nome || 'documento.pdf')

  if (config.provider === 'evolution') {
    if (!config.instance) throw new Error('WHATSAPP_INSTANCE não configurado.')
    const base = config.baseUrl.replace(/\/$/, '')
    const endpoint = base.includes('/message/') ? config.baseUrl : `${base}/message/${documentUrl ? 'sendMedia' : 'sendText'}/${config.instance}`
    const body = documentUrl
      ? { number: phone, mediatype: 'document', mimetype: 'application/pdf', caption: text, media: documentUrl, fileName: filename }
      : { number: phone, text }
    const response = await fetch(endpoint, { method: 'POST', headers: { 'content-type': 'application/json', apikey: config.token }, body: JSON.stringify(body), signal: AbortSignal.timeout(25_000) })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(String(payload?.message || payload?.error || 'Falha na Evolution API.'))
    return { id: payload?.key?.id || payload?.id || payload?.messageId, provider: 'evolution' }
  }

  if (config.provider === 'cloud') {
    if (!config.phoneNumberId) throw new Error('WHATSAPP_PHONE_NUMBER_ID não configurado.')
    const endpoint = `${config.baseUrl.replace(/\/$/, '')}/${config.phoneNumberId}/messages`
    const body = documentUrl
      ? { messaging_product: 'whatsapp', to: phone, type: 'document', document: { link: documentUrl, filename, caption: text } }
      : { messaging_product: 'whatsapp', to: phone, type: 'text', text: { body: text } }
    const response = await fetch(endpoint, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${config.token}` }, body: JSON.stringify(body), signal: AbortSignal.timeout(25_000) })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(String(payload?.error?.message || 'Falha na WhatsApp Cloud API.'))
    return { id: payload?.messages?.[0]?.id, provider: 'cloud' }
  }

  const response = await fetch(config.baseUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${config.token}` },
    body: JSON.stringify({ phone, message: text, documentUrl, filename }),
    signal: AbortSignal.timeout(25_000),
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(String(payload?.message || payload?.error || 'Falha no provider do WhatsApp.'))
  return { id: payload?.id || payload?.messageId, provider: 'generic' }
}

export async function POST(req: NextRequest) {
  const requestId = createRequestId(req)
  const rate = checkRateLimit(`whatsapp:${clientIp(req)}`, 12, 60_000)
  if (!rate.allowed) return NextResponse.json({ error: 'Muitas tentativas. Aguarde antes de reenviar.', requestId }, { status: 429 })

  try {
    const { client: supabase } = await requireBearerUser(req)
    const rawBody = await req.text()
    assertBodySize(rawBody, 16 * 1024)
    const body = JSON.parse(rawBody || '{}') as { messageId?: string }
    if (!body.messageId || !UUID_RE.test(body.messageId)) return NextResponse.json({ error: 'messageId inválido.', requestId }, { status: 400 })
    const { data: empresaId, error: tenantError } = await supabase.rpc('vf_effective_empresa_id')
    if (tenantError || !empresaId) return NextResponse.json({ error: 'Empresa operacional não identificada.', requestId }, { status: 403 })

    const { data: message, error: messageError } = await supabase
      .from('whatsapp_messages')
      .select('*')
      .eq('id', body.messageId)
      .eq('empresa_id', empresaId)
      .maybeSingle()
    if (messageError || !message) return NextResponse.json({ error: 'Mensagem não encontrada para a empresa atual.', requestId }, { status: 404 })
    if (message.consentimento !== true) return NextResponse.json({ error: 'Envio sem consentimento registrado.', requestId }, { status: 409 })
    if (['enviado', 'entregue', 'lido'].includes(String(message.status))) {
      return NextResponse.json({ ok: true, idempotent: true, providerMessageId: message.provider_message_id, requestId })
    }

    await supabase.from('whatsapp_messages').update({ status: 'processando', processando_em: new Date().toISOString(), ultimo_erro: null, updated_at: new Date().toISOString() }).eq('id', message.id).eq('empresa_id', empresaId)

    try {
      const sent = await sendProvider(message)
      await supabase.from('whatsapp_messages').update({
        status: 'enviado', provider: sent.provider, provider_message_id: sent.id || null,
        enviado_em: new Date().toISOString(), tentativas: Number(message.tentativas || 0) + 1,
        ultimo_erro: null, updated_at: new Date().toISOString(),
      }).eq('id', message.id).eq('empresa_id', empresaId)
      return NextResponse.json({ ok: true, providerMessageId: sent.id, requestId })
    } catch (providerError) {
      const safeMessage = providerError instanceof Error ? providerError.message.slice(0, 500) : 'Falha no provider.'
      await supabase.from('whatsapp_messages').update({
        status: 'falhou', ultimo_erro: safeMessage, tentativas: Number(message.tentativas || 0) + 1,
        updated_at: new Date().toISOString(),
      }).eq('id', message.id).eq('empresa_id', empresaId)
      return NextResponse.json({ error: 'Não foi possível enviar automaticamente. Use o fallback manual.', fallback: true, requestId }, { status: 502 })
    }
  } catch (error) {
    const message = error instanceof Error && error.message === 'Não autenticado.' ? error.message : 'Não foi possível processar o envio.'
    const status = message === 'Não autenticado.' ? 401 : 400
    return NextResponse.json({ error: message, requestId }, { status })
  }
}
