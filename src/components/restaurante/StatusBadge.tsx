import { CheckCircle2, Clock3, Flame, Lock, ReceiptText } from 'lucide-react'

const config: Record<string, { label: string; className: string; icon: any }> = {
  livre: { label: 'Livre', className: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
  ocupada: { label: 'Ocupada', className: 'bg-blue-50 text-blue-700 border-blue-200', icon: ReceiptText },
  aguardando_fechamento: { label: 'Aguardando fechamento', className: 'bg-amber-50 text-amber-700 border-amber-200', icon: Clock3 },
  em_pagamento: { label: 'Em pagamento', className: 'bg-orange-50 text-orange-700 border-orange-200', icon: Clock3 },
  bloqueada: { label: 'Bloqueada', className: 'bg-[var(--vf-surface2)] text-[var(--vf-text2)] border-[var(--vf-border)]', icon: Lock },
  liberada: { label: 'Liberada', className: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
  aberta: { label: 'Aberta', className: 'bg-blue-50 text-blue-700 border-blue-200', icon: ReceiptText },
  itens_enviados: { label: 'Itens enviados', className: 'bg-indigo-50 text-indigo-700 border-indigo-200', icon: ReceiptText },
  paga: { label: 'Paga', className: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
  cancelada: { label: 'Cancelada', className: 'bg-red-50 text-red-700 border-red-200', icon: Flame },
  novo: { label: 'Novo', className: 'bg-red-50 text-red-700 border-red-200', icon: Flame },
  em_preparo: { label: 'Em preparo', className: 'bg-amber-50 text-amber-700 border-amber-200', icon: Clock3 },
  pronto: { label: 'Pronto', className: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
  retirado: { label: 'Retirado', className: 'bg-[var(--vf-surface2)] text-[var(--vf-text2)] border-[var(--vf-border)]', icon: CheckCircle2 },
}

export function StatusBadge({ status, className = '' }: { status: string; className?: string }) {
  const item = config[status] ?? { label: status, className: 'bg-[var(--vf-surface2)] text-[var(--vf-text2)] border-[var(--vf-border)]', icon: Clock3 }
  const Icon = item.icon
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-extrabold ${item.className} ${className}`}>
      <Icon size={13} />
      {item.label}
    </span>
  )
}
