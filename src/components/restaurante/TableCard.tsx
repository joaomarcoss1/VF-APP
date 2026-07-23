import { UsersRound } from 'lucide-react'
import { formatCurrency } from '@/lib/restaurante-calculos'
import type { RestaurantTable } from '@/services/restaurante'
import { StatusBadge } from './StatusBadge'

export function TableCard({ table, onClick }: { table: RestaurantTable; onClick?: () => void }) {
  const highlight = table.status === 'livre' ? 'border-emerald-200 bg-emerald-50/50' : table.status === 'aguardando_fechamento' ? 'border-amber-300 bg-amber-50/80 animate-[vf-attention_1.9s_ease-in-out_infinite]' : table.status === 'ocupada' ? 'border-blue-200 bg-blue-50/60' : 'border-[var(--vf-border)] bg-[var(--vf-card)]'
  return (
    <button onClick={onClick} className={`vf-motion flex min-h-[150px] flex-col justify-between rounded-[24px] border p-4 text-left shadow-sm ${highlight}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-4xl font-black leading-none tracking-tight text-[var(--vf-text)]">{table.numero}</div>
          <div className="mt-1 text-xs font-bold uppercase tracking-wide text-[var(--vf-text3)]">{table.nome ?? `Mesa ${table.numero}`}</div>
        </div>
        <StatusBadge status={table.status} />
      </div>
      <div className="mt-4 flex items-end justify-between gap-2">
        <div className="text-xs font-semibold text-[var(--vf-text3)]">
          <span className="flex items-center gap-1"><UsersRound size={13} /> {table.capacidade ?? 4} lugares</span>
          {table.cliente_nome && <span className="mt-1 block truncate text-[var(--vf-text2)]">{table.cliente_nome}</span>}
        </div>
        <strong className="text-sm text-[var(--vf-text)]">{formatCurrency(table.total_atual ?? 0)}</strong>
      </div>
    </button>
  )
}
