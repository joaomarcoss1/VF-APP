import { getEmpresaIdObrigatoria } from '@/services/_tenant'
import { db, normalizeError } from '@/services/_base'
import type { WhatsAppDocumentRequest, WhatsAppSendResult, WhatsAppTextRequest } from './whatsapp.types'

export function normalizeWhatsAppPhone(value?: string | null) {
  let digits = String(value ?? '').replace(/\D/g, '')
  if (!digits) return ''
  digits = digits.replace(/^0+/, '')
  if (digits.length === 10 || digits.length === 11) digits = `55${digits}`
  if (digits.length < 12 || digits.length > 15) return ''
  return digits
}

export function buildWhatsAppLink(phone: string | undefined | null, message: string) {
  const normalized = normalizeWhatsAppPhone(phone)
  const base = normalized ? `https://wa.me/${normalized}` : 'https://wa.me/'
  return `${base}?text=${encodeURIComponent(message)}`
}

function stableKey(parts: Array<string | undefined | null>) {
  const input = parts.filter(Boolean).join('|')
  let hash = 2166136261
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return `vf-${(hash >>> 0).toString(16)}`
}

async function queue(input: WhatsAppTextRequest | WhatsAppDocumentRequest) {
  const empresaId = await getEmpresaIdObrigatoria()
  const telefone = normalizeWhatsAppPhone(input.telefone)
  if (!telefone) throw new Error('Telefone inválido. Informe DDD e número do cliente.')
  if (input.consentimento !== true) throw new Error('O consentimento do cliente é obrigatório para enviar mensagens.')

  const isDocument = 'arquivoUrl' in input
  const idempotencyKey = input.idempotencyKey || stableKey([
    empresaId,
    input.entidade,
    input.entidadeId,
    input.tipo,
    isDocument ? input.arquivoNome : input.mensagem,
  ])

  const payload = {
    empresa_id: empresaId,
    provider: 'pendente',
    telefone,
    tipo: input.tipo || (isDocument ? 'documento' : 'texto'),
    entidade: input.entidade || null,
    entidade_id: input.entidadeId || null,
    mensagem: input.mensagem,
    arquivo_url: isDocument ? input.arquivoUrl : null,
    arquivo_nome: isDocument ? input.arquivoNome : null,
    consentimento: true,
    idempotency_key: idempotencyKey,
    status: 'pendente',
    tentativas: 0,
    ultimo_erro: null,
  }

  const { data, error } = await db()
    .from('whatsapp_messages')
    .upsert(payload, { onConflict: 'empresa_id,idempotency_key', ignoreDuplicates: true })
    .select('*')
    .maybeSingle()

  if (error) throw normalizeError(error, 'Não foi possível registrar o envio de WhatsApp.')
  if (data) return data

  const { data: existing, error: existingError } = await db()
    .from('whatsapp_messages')
    .select('*')
    .eq('empresa_id', empresaId)
    .eq('idempotency_key', idempotencyKey)
    .maybeSingle()
  if (existingError || !existing) throw normalizeError(existingError || new Error('Mensagem idempotente não localizada.'), 'Não foi possível recuperar o envio já registrado.')
  return existing
}

async function processQueued(messageId: string): Promise<Response> {
  const { data: sessionData } = await db().auth.getSession()
  const token = sessionData.session?.access_token
  if (!token) throw new Error('Sua sessão expirou. Entre novamente para enviar o documento.')
  return fetch('/api/whatsapp/send', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify({ messageId }),
  })
}

export const WhatsAppService = {
  queueText(input: WhatsAppTextRequest) {
    return queue(input)
  },

  queueDocument(input: WhatsAppDocumentRequest) {
    return queue(input)
  },

  async sendTextOrFallback(input: WhatsAppTextRequest): Promise<WhatsAppSendResult> {
    const queued = await this.queueText(input)
    const fallbackUrl = buildWhatsAppLink(input.telefone, input.mensagem)
    try {
      const response = await processQueued(queued.id)
      const payload = await response.json().catch(() => ({}))
      if (response.ok) return { mode: 'provider', messageId: queued.id, providerMessageId: payload.providerMessageId }
      return { mode: 'fallback', messageId: queued.id, fallbackUrl, warning: payload.error || 'Provider indisponível.' }
    } catch (error) {
      return { mode: 'fallback', messageId: queued.id, fallbackUrl, warning: error instanceof Error ? error.message : 'Provider indisponível.' }
    }
  },

  async sendDocumentOrFallback(input: WhatsAppDocumentRequest): Promise<WhatsAppSendResult> {
    const queued = await this.queueDocument(input)
    const fallbackMessage = `${input.mensagem}\n\nO PDF foi preparado para download. Caso o envio automático não esteja configurado, anexe o arquivo manualmente nesta conversa.`
    const fallbackUrl = buildWhatsAppLink(input.telefone, fallbackMessage)
    try {
      const response = await processQueued(queued.id)
      const payload = await response.json().catch(() => ({}))
      if (response.ok) return { mode: 'provider', messageId: queued.id, providerMessageId: payload.providerMessageId }
      return { mode: 'fallback', messageId: queued.id, fallbackUrl, warning: payload.error || 'O PDF não foi enviado automaticamente.' }
    } catch (error) {
      return { mode: 'fallback', messageId: queued.id, fallbackUrl, warning: error instanceof Error ? error.message : 'O PDF não foi enviado automaticamente.' }
    }
  },

  // Compatibilidade com chamadas V9.3.
  sendOrFallback(input: Omit<WhatsAppTextRequest, 'consentimento'> & { consentimento?: boolean }) {
    return this.sendTextOrFallback({ ...input, consentimento: input.consentimento === true })
  },
}
