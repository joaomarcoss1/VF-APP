'use client'
import type { ReservationDeposit } from '@/services/reservas-adiantamentos'
import { Empty } from '@/components/ui'
import { ReservationCard } from './ReservationCard'
export function ReservationList({ reservas, onConfirmar, onEditar, onRecibo }: { reservas: ReservationDeposit[]; onConfirmar?: (r: ReservationDeposit) => void; onEditar?: (r: ReservationDeposit) => void; onRecibo?: (r: ReservationDeposit) => void }) {
  if (!reservas.length) return <Empty icon="🧾" title="Nenhuma reserva encontrada" description="Crie a primeira reserva com entrada, sinal ou adiantamento." />
  return <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">{reservas.map(r => <ReservationCard key={r.id} reserva={r} onConfirmar={() => onConfirmar?.(r)} onEditar={() => onEditar?.(r)} onRecibo={() => onRecibo?.(r)} />)}</div>
}
