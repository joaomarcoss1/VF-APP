'use client'

import { useEffect, useState } from 'react'
import { Download, RefreshCw, Smartphone, X } from 'lucide-react'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

export default function InstallAppPrompt() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [showInstall, setShowInstall] = useState(false)
  const [updateReady, setUpdateReady] = useState<ServiceWorkerRegistration | null>(null)
  const [isStandalone, setIsStandalone] = useState(false)

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true
    setIsStandalone(standalone)

    const onBeforeInstall = (event: Event) => {
      event.preventDefault()
      setInstallEvent(event as BeforeInstallPromptEvent)
      if (!standalone) setShowInstall(true)
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    const onManualInstall = () => { if (!standalone) setShowInstall(true) }
    window.addEventListener('vf-pwa-install-request', onManualInstall)

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.addEventListener('updatefound', () => {
          const worker = registration.installing
          if (!worker) return
          worker.addEventListener('statechange', () => {
            if (worker.state === 'installed' && navigator.serviceWorker.controller) setUpdateReady(registration)
          })
        })
      }).catch(() => null)
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('vf-pwa-install-request', onManualInstall)
    }
  }, [])

  async function install() {
    if (!installEvent) return
    await installEvent.prompt()
    await installEvent.userChoice.catch(() => null)
    setInstallEvent(null)
    setShowInstall(false)
  }

  function updateApp() {
    if (!updateReady?.waiting) return setUpdateReady(null)
    updateReady.waiting.postMessage({ type: 'VF_NEXUS_APPLY_UPDATE' })
    setUpdateReady(null)
    window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent('vf-nexus-update-applied'))
    }, 250)
  }

  if (updateReady) {
    return (
      <div className="fixed inset-x-3 bottom-24 z-[80] rounded-[24px] border border-[var(--vf-border)] bg-[var(--vf-surface-elevated)] p-4 text-[var(--vf-text)] shadow-2xl md:left-auto md:right-5 md:w-[380px]">
        <div className="flex gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[var(--vf-accent-soft)] text-[var(--vf-primary)]"><RefreshCw size={20} /></div>
          <div className="min-w-0 flex-1"><strong className="block text-sm font-black">Atualização disponível</strong><p className="mt-1 text-xs font-semibold text-[var(--vf-text3)]">Atualização preparada. Toque em atualizar, feche e abra o app se o navegador não trocar automaticamente.</p></div>
          <button onClick={() => setUpdateReady(null)} className="text-[var(--vf-text3)]"><X size={16} /></button>
        </div>
        <button onClick={updateApp} className="vf-btn vf-btn-primary mt-3 w-full">Preparar atualização</button>
      </div>
    )
  }

  if (isStandalone || !showInstall) return null

  return (
    <div className="fixed inset-x-3 bottom-24 z-[80] rounded-[24px] border border-[var(--vf-border)] bg-[var(--vf-surface-elevated)] p-4 text-[var(--vf-text)] shadow-2xl md:left-auto md:right-5 md:w-[390px]">
      <div className="flex gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[var(--vf-accent-soft)] text-[var(--vf-primary)]"><Smartphone size={20} /></div>
        <div className="min-w-0 flex-1"><strong className="block text-sm font-black">Instalar VF Nexus Atendimento</strong><p className="mt-1 text-xs font-semibold text-[var(--vf-text3)]">Use como aplicativo no celular, com tela cheia, cache e atalhos rápidos.</p></div>
        <button onClick={() => setShowInstall(false)} className="text-[var(--vf-text3)]"><X size={16} /></button>
      </div>
      {installEvent ? <button onClick={install} className="vf-btn vf-btn-primary mt-3 w-full"><Download size={16} /> Instalar app</button> : <div className="mt-3 rounded-2xl bg-[var(--vf-surface2)] p-3 text-xs font-bold leading-5 text-[var(--vf-text2)]">No iPhone/Safari: toque em Compartilhar e depois em Adicionar à Tela de Início. No Chrome Android, abra o menu ⋮ e toque em Instalar app.</div>}
    </div>
  )
}
