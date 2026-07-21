'use client'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'

export default function OfflineBanner() {
  const online = useOnlineStatus()
  if (online) return null
  return <div className="fixed left-3 right-3 top-[calc(env(safe-area-inset-top)+10px)] z-[70] rounded-2xl border border-amber-300/60 bg-amber-50 text-amber-900 px-4 py-3 text-sm shadow-xl">
    <b>Você está offline.</b> Algumas ações serão salvas na fila e sincronizadas quando a internet voltar.
  </div>
}
