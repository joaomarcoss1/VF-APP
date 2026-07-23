import type { ReservationDeposit } from '@/services/reservas-adiantamentos'
import { getReservationLabelByBranch, montarTextoRecibo } from '@/services/reservas-adiantamentos'

function money(v?: number | null) {
  return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export async function gerarReciboReservaPDFBlob(reserva: ReservationDeposit, empresaNome = 'Empresa'): Promise<Blob> {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const labels = getReservationLabelByBranch(reserva.ramo_atividade)
  const custom = reserva.recibo_custom || {}
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const margin = 44
  const contentW = pageW - margin * 2
  let y = 48

  const ensureSpace = (height: number) => {
    if (y + height <= pageH - 54) return
    doc.addPage()
    y = 48
  }
  const text = (value: unknown, maxWidth = contentW) => doc.splitTextToSize(String(value ?? '—'), maxWidth)

  doc.setFillColor(10, 141, 255)
  doc.rect(0, 0, pageW, 5, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.setTextColor(16, 32, 51)
  doc.text(text(custom.titulo || labels.recibo), margin, y)
  y += 26
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(100, 116, 139)
  doc.text(text(empresaNome), margin, y)
  doc.text(`Emitido em ${new Date().toLocaleString('pt-BR')}`, pageW - margin, y, { align: 'right' })
  y += 22
  doc.setDrawColor(220, 230, 240)
  doc.line(margin, y, pageW - margin, y)
  y += 22

  const rows: Array<[string, string]> = [
    ['Cliente', reserva.cliente_nome || '—'],
    ['Telefone', reserva.cliente_telefone || '—'],
    ['Código', reserva.codigo || '—'],
    ['Reserva/serviço', reserva.titulo || '—'],
    ['Data e hora', `${reserva.data_reservada || '—'}${reserva.hora_reservada ? ` às ${String(reserva.hora_reservada).slice(0, 5)}` : ''}`],
    ['Valor total', money(reserva.valor_total)],
    ['Entrada/sinal', money(reserva.valor_entrada)],
    ['Valor restante', money(reserva.valor_restante)],
    ['Forma de pagamento', String(reserva.forma_pagamento || '—')],
    ['Status', reserva.status_pagamento === 'pago' ? 'Pagamento confirmado' : 'Aguardando pagamento'],
  ]

  for (const [label, value] of rows) {
    const valueLines = text(value, contentW - 130)
    const rowHeight = Math.max(20, valueLines.length * 13 + 7)
    ensureSpace(rowHeight)
    doc.setFillColor(248, 250, 252)
    doc.roundedRect(margin, y - 11, contentW, rowHeight, 5, 5, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(100, 116, 139)
    doc.text(`${label}:`, margin + 10, y + 3)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(16, 32, 51)
    doc.text(valueLines, margin + 130, y + 3)
    y += rowHeight + 6
  }

  const blocks = [
    custom.mensagem || labels.mensagem,
    reserva.descricao,
    reserva.observacao,
    custom.observacao_cliente,
    custom.termos,
  ].filter(Boolean) as string[]

  for (const block of blocks) {
    const lines = text(block, contentW - 24)
    const height = lines.length * 14 + 24
    ensureSpace(height)
    doc.setFillColor(255, 255, 255)
    doc.setDrawColor(220, 230, 240)
    doc.roundedRect(margin, y, contentW, height, 6, 6, 'FD')
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(64, 83, 103)
    doc.text(lines, margin + 12, y + 18)
    y += height + 10
  }

  doc.setDrawColor(220, 230, 240)
  doc.line(margin, pageH - 38, pageW - margin, pageH - 38)
  doc.setFontSize(8)
  doc.setTextColor(100, 116, 139)
  doc.text('Documento gerado pelo VF Nexus', margin, pageH - 22)
  doc.text(`Página ${doc.getNumberOfPages()}`, pageW - margin, pageH - 22, { align: 'right' })
  return doc.output('blob')
}

export async function baixarReciboReservaPDF(reserva: ReservationDeposit, empresaNome = 'Empresa') {
  const blob = await gerarReciboReservaPDFBlob(reserva, empresaNome)
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `${reserva.codigo || 'recibo-reserva'}.pdf`
  anchor.click()
  setTimeout(() => URL.revokeObjectURL(url), 1500)
}

export async function compartilharReciboReservaWhatsApp(reserva: ReservationDeposit, empresaNome = 'Empresa', consentimento = false) {
  if (!reserva.cliente_telefone) throw new Error('Cadastre o telefone do cliente antes de enviar o recibo.')
  if (!consentimento) throw new Error('Confirme o consentimento do cliente para enviar o recibo.')
  const [{ StorageService }, { WhatsAppService }] = await Promise.all([
    import('@/services/storage'),
    import('@/services/whatsapp/whatsapp.service'),
  ])
  const blob = await gerarReciboReservaPDFBlob(reserva, empresaNome)
  const filename = `${reserva.codigo || `recibo-reserva-${reserva.id}`}.pdf`.replace(/[^a-zA-Z0-9._-]+/g, '-')
  const uploaded = await StorageService.upload('vf-comprovantes', blob, filename, { modulo: 'reservas', contentType: 'application/pdf', upsert: true })
  const signedUrl = await StorageService.signedUrl('vf-comprovantes', uploaded.path, 3600)
  return WhatsAppService.sendDocumentOrFallback({
    telefone: reserva.cliente_telefone,
    mensagem: `Olá, ${reserva.cliente_nome}! Segue o recibo ${reserva.codigo || ''} emitido por ${empresaNome}.`,
    tipo: 'recibo_reserva_pdf',
    entidade: 'reservas',
    entidadeId: reserva.id,
    consentimento: true,
    arquivoUrl: signedUrl,
    arquivoNome: filename,
    idempotencyKey: `reserva:${reserva.id}:recibo:v1`,
  })
}

export function copiarTextoRecibo(reserva: ReservationDeposit, empresaNome = 'Empresa') {
  return montarTextoRecibo(reserva, empresaNome, reserva.ramo_atividade)
}
