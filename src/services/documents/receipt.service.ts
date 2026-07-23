import type { ComprovantePayload, IdentidadeEmpresa } from '@/types'
import { gerarTextoComprovante } from '@/services/comprovantes'
import { WhatsAppService } from '@/services/whatsapp/whatsapp.service'
import { StorageService } from '@/services/storage'

function safeName(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'recibo'
}

export const ReceiptService = {
  preview(payload: ComprovantePayload) {
    return gerarTextoComprovante(payload)
  },

  async generatePdf(payload: ComprovantePayload, branding?: Partial<IdentidadeEmpresa>) {
    const { gerarComprovantePDFBlob } = await import('@/lib/exports')
    return gerarComprovantePDFBlob(payload, branding)
  },

  async shareWhatsApp(
    payload: ComprovantePayload,
    options?: { entidadeId?: string; branding?: Partial<IdentidadeEmpresa>; consentimento?: boolean },
  ) {
    if (!payload.cliente_whatsapp) throw new Error('Cadastre o WhatsApp do cliente antes de enviar o recibo.')
    if (options?.consentimento !== true) throw new Error('Confirme o consentimento do cliente para enviar o recibo.')

    const blob = await this.generatePdf(payload, options?.branding)
    const base = safeName(payload.cliente_nome || payload.empresa_nome || 'recibo')
    const filename = `comprovante-${base}.pdf`
    const uploaded = await StorageService.upload('vf-comprovantes', blob, filename, {
      modulo: 'recibos',
      contentType: 'application/pdf',
      upsert: true,
    })
    const signedUrl = await StorageService.signedUrl('vf-comprovantes', uploaded.path, 60 * 60)
    const mensagem = `Olá${payload.cliente_nome ? `, ${payload.cliente_nome}` : ''}! Segue seu comprovante em PDF emitido por ${payload.empresa_nome}.`

    return WhatsAppService.sendDocumentOrFallback({
      telefone: payload.cliente_whatsapp,
      mensagem,
      tipo: 'recibo_pdf',
      entidade: 'comprovante',
      entidadeId: options?.entidadeId,
      consentimento: true,
      arquivoUrl: signedUrl,
      arquivoNome: filename,
      idempotencyKey: `comprovante:${options?.entidadeId || base}:v1`,
    })
  },
}
