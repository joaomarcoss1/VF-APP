import type { ReservationDeposit } from '@/services/reservas-adiantamentos'
import { getReservationLabelByBranch, montarTextoRecibo } from '@/services/reservas-adiantamentos'

function money(v?: number | null) {
  return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export async function baixarReciboReservaPDF(reserva: ReservationDeposit, empresaNome = 'Empresa') {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const labels = getReservationLabelByBranch(reserva.ramo_atividade)
  const custom = reserva.recibo_custom || {}
  const margin = 42
  let y = 48
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.text(custom.titulo || labels.recibo, margin, y)
  y += 22
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text(`Emitido em ${new Date().toLocaleString('pt-BR')}`, margin, y)
  y += 26
  doc.setDrawColor(226, 232, 240)
  doc.line(margin, y, 553, y)
  y += 26

  const rows = [
    ['Empresa', empresaNome],
    ['Cliente', reserva.cliente_nome || '—'],
    ['Telefone', reserva.cliente_telefone || '—'],
    ['Código', reserva.codigo || '—'],
    ['Reserva/serviço', reserva.titulo || '—'],
    ['Data e hora', `${reserva.data_reservada || '—'} ${reserva.hora_reservada ? `às ${String(reserva.hora_reservada).slice(0,5)}` : ''}`],
    ['Valor total', money(reserva.valor_total)],
    ['Entrada/sinal', money(reserva.valor_entrada)],
    ['Valor restante', money(reserva.valor_restante)],
    ['Forma de pagamento', String(reserva.forma_pagamento || '—')],
    ['Status', reserva.status_pagamento === 'pago' ? 'Pagamento confirmado' : 'Aguardando pagamento'],
  ]
  doc.setFontSize(11)
  for (const [label, value] of rows) {
    doc.setFont('helvetica', 'bold')
    doc.text(`${label}:`, margin, y)
    doc.setFont('helvetica', 'normal')
    doc.text(String(value), margin + 130, y)
    y += 20
  }
  y += 10
  const obs = [reserva.descricao, reserva.observacao, custom.observacao_cliente, custom.mensagem || labels.mensagem, custom.termos].filter(Boolean).join('\n\n')
  const lines = doc.splitTextToSize(obs || labels.mensagem, 500)
  doc.setFontSize(11)
  doc.text(lines, margin, y)
  doc.save(`${reserva.codigo || 'recibo-reserva'}.pdf`)
}

export function copiarTextoRecibo(reserva: ReservationDeposit, empresaNome = 'Empresa') {
  return montarTextoRecibo(reserva, empresaNome, reserva.ramo_atividade)
}
