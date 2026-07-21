import { Badge } from '@/components/ui'

export function ReservationStatusBadge({ status, type = 'reserva' }: { status?: string | null; type?: 'reserva' | 'pagamento' }) {
  const s = String(status || 'aguardando_pagamento')
  const labels: Record<string, string> = {
    aguardando_pagamento: 'Aguardando pagamento',
    pago: 'Pago',
    cancelado: 'Cancelado',
    reembolsado: 'Reembolsado',
    rascunho: 'Rascunho',
    confirmada: 'Confirmada',
    agendada: 'Agendada',
    concluida: 'Concluída',
    nao_compareceu: 'Não compareceu',
  }
  const color = s === 'pago' || s === 'confirmada' || s === 'agendada' || s === 'concluida' ? 'green' : s === 'cancelado' || s === 'nao_compareceu' ? 'red' : s === 'reembolsado' ? 'gray' : 'amber'
  return <Badge color={color as any}>{labels[s] || s}</Badge>
}
