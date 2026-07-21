'use client'

import { Badge, Button, Card } from '@/components/ui'
import { fmtCurrency } from '@/lib/precificacao'
import type { ReservationDeposit } from '@/services/reservas-adiantamentos'
import { ReservationStatusBadge } from './ReservationStatusBadge'

export function ReservationCard({ reserva, onConfirmar, onEditar, onRecibo, loading }: { reserva: ReservationDeposit; onConfirmar?: () => void; onEditar?: () => void; onRecibo?: () => void; loading?: boolean }) {
  return (
    <Card className="p-4 vf-slideup overflow-hidden relative">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[var(--vf-primary)] via-[var(--vf-secondary)] to-transparent" />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs text-[var(--vf-text3)]">{reserva.codigo || 'Sem código'} · {reserva.data_reservada || 'Sem data'} {reserva.hora_reservada ? `às ${String(reserva.hora_reservada).slice(0,5)}` : ''}</div>
          <h3 className="text-base font-semibold text-[var(--vf-text)] truncate">{reserva.titulo}</h3>
          <p className="text-sm text-[var(--vf-text2)] truncate">{reserva.cliente_nome} {reserva.cliente_telefone ? `· ${reserva.cliente_telefone}` : ''}</p>
        </div>
        <ReservationStatusBadge status={reserva.status_pagamento} type="pagamento" />
      </div>
      <div className="grid grid-cols-3 gap-2 mt-4">
        <div className="rounded-2xl bg-[var(--vf-surface2)] p-3"><span className="block text-[10px] uppercase tracking-wide text-[var(--vf-text3)]">Total</span><b className="text-[var(--vf-text)]">{fmtCurrency(Number(reserva.valor_total || 0))}</b></div>
        <div className="rounded-2xl bg-[color-mix(in_srgb,var(--vf-success)_10%,var(--vf-surface2))] p-3"><span className="block text-[10px] uppercase tracking-wide text-[var(--vf-text3)]">Entrada</span><b className="text-[var(--vf-success)]">{fmtCurrency(Number(reserva.valor_entrada || 0))}</b></div>
        <div className="rounded-2xl bg-[color-mix(in_srgb,var(--vf-secondary)_12%,var(--vf-surface2))] p-3"><span className="block text-[10px] uppercase tracking-wide text-[var(--vf-text3)]">Restante</span><b className="text-[var(--vf-secondary)]">{fmtCurrency(Number(reserva.valor_restante || 0))}</b></div>
      </div>
      <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex flex-wrap gap-2"><ReservationStatusBadge status={reserva.status_reserva} /><Badge color="blue">{reserva.forma_pagamento || 'pagamento'}</Badge></div>
        <div className="grid grid-cols-3 sm:flex gap-2">
          <Button size="sm" variant="ghost" onClick={onEditar}>Editar</Button>
          <Button size="sm" variant="secondary" onClick={onRecibo}>Recibo</Button>
          {reserva.status_pagamento !== 'pago' && <Button size="sm" onClick={onConfirmar} loading={loading}>Confirmar</Button>}
        </div>
      </div>
    </Card>
  )
}
