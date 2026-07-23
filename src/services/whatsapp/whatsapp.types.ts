export type WhatsAppSendStatus = 'pendente' | 'processando' | 'enviado' | 'entregue' | 'lido' | 'falhou' | 'cancelado'

export type WhatsAppTextRequest = {
  telefone: string
  mensagem: string
  tipo?: string
  entidade?: string
  entidadeId?: string
  consentimento: boolean
  idempotencyKey?: string
}

export type WhatsAppDocumentRequest = WhatsAppTextRequest & {
  arquivoUrl: string
  arquivoNome: string
}

export type WhatsAppSendResult = {
  mode: 'provider' | 'fallback'
  messageId?: string
  providerMessageId?: string
  fallbackUrl?: string
  warning?: string
}

export interface WhatsAppProvider {
  sendText(input: WhatsAppTextRequest): Promise<{ id?: string; status: WhatsAppSendStatus }>
  sendDocument(input: WhatsAppDocumentRequest): Promise<{ id?: string; status: WhatsAppSendStatus }>
  getStatus(id: string): Promise<WhatsAppSendStatus>
}
