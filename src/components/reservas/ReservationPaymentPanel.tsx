'use client'
import { Button, Card } from '@/components/ui'
import { fmtCurrency } from '@/lib/precificacao'
import type { ReservationDeposit } from '@/services/reservas-adiantamentos'
export function ReservationPaymentPanel({ reserva, onConfirmar, loading }: { reserva: ReservationDeposit; onConfirmar?: () => void; loading?: boolean }) {
  return <Card className="p-4"><div className="text-sm text-[var(--vf-text2)]">Pagamento</div><div className="grid grid-cols-3 gap-2 my-3"><b>{fmtCurrency(reserva.valor_total)}</b><b className="text-[var(--vf-success)]">{fmtCurrency(reserva.valor_entrada)}</b><b className="text-[var(--vf-secondary)]">{fmtCurrency(reserva.valor_restante)}</b></div>{reserva.status_pagamento !== 'pago' && <Button fullWidth onClick={onConfirmar} loading={loading}>Confirmar pagamento</Button>}</Card>
}
