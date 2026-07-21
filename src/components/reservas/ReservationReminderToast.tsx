'use client'
import { useEffect } from 'react'
import toast from 'react-hot-toast'
import type { ReservationNotification } from '@/services/reservas-adiantamentos'
export function ReservationReminderToast({ notifications }: { notifications?: ReservationNotification[] }) {
  useEffect(() => {
    const due = (notifications || []).filter(n => !n.lida_em && n.notificar_em && new Date(n.notificar_em).getTime() <= Date.now())
    for (const n of due.slice(0, 3)) {
      toast(`${n.titulo}: ${n.mensagem}`, { icon: '🔔' })
      try { new Audio('/sounds/notification.mp3').play().catch(() => null) } catch {}
    }
  }, [notifications])
  return null
}
