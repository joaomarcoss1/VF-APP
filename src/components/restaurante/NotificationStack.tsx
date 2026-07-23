'use client'
import { BellRing, CheckCheck, ExternalLink, X } from 'lucide-react'
import type { RestaurantNotification } from '@/services/restaurante'

export function NotificationStack({ notifications, onDismiss, onOpen }: { notifications: RestaurantNotification[]; onDismiss?: (id: string) => void; onOpen?: (n: RestaurantNotification) => void }) {
  if (!notifications.length) return null
  return (
    <div className="fixed right-3 top-20 z-50 flex w-[min(390px,calc(100vw-1.5rem))] flex-col gap-3 md:right-4">
      {notifications.slice(0, 3).map((n) => (
        <div key={n.id} className={`animate-[vf-slidein_.22s_ease-out] rounded-[22px] border bg-[var(--vf-card)] p-4 shadow-2xl shadow-blue-950/15 ${n.type === 'danger' ? 'border-red-200' : n.type === 'success' ? 'border-emerald-200' : 'border-blue-100'}`}>
          <div className="flex gap-3">
            <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl ${n.type === 'danger' ? 'bg-red-50 text-red-700' : n.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'}`}><BellRing size={18} /></div>
            <div className="min-w-0 flex-1">
              <strong className="block text-sm font-black text-[var(--vf-text)]">{n.title}</strong>
              <p className="mt-1 text-sm font-semibold text-[var(--vf-text2)]">{n.message}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {onOpen && <button onClick={() => onOpen(n)} className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1.5 text-[11px] font-black text-blue-700"><ExternalLink size={13} /> Abrir</button>}
                {onDismiss && <button onClick={() => onDismiss(n.id)} className="inline-flex items-center gap-1 rounded-full bg-[var(--vf-surface2)] px-3 py-1.5 text-[11px] font-black text-[var(--vf-text2)]"><CheckCheck size={13} /> Marcar lida</button>}
              </div>
            </div>
            {onDismiss && <button onClick={() => onDismiss(n.id)} className="h-8 w-8 shrink-0 rounded-full text-[var(--vf-text3)] hover:bg-[var(--vf-surface2)] hover:text-[var(--vf-text2)]"><X size={16} className="mx-auto" /></button>}
          </div>
        </div>
      ))}
    </div>
  )
}
