'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect, useState, type ReactNode } from 'react'
import { Toaster } from 'react-hot-toast'
import OfflineBanner from '@/components/mobile/OfflineBanner'
import InstallAppPrompt from '@/components/mobile/InstallAppPrompt'
import { VFThemeProvider } from '@/components/theme/ThemeProvider'

export default function Providers({ children }: { children: ReactNode }) {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return
    let cancelled = false
    const register = () => {
      if (cancelled) return
      navigator.serviceWorker.register('/sw.js', { updateViaCache: 'imports' }).catch((error) => {
        console.warn('Não foi possível registrar o service worker do app.', error)
      })
    }
    if (document.readyState === 'complete') register()
    else window.addEventListener('load', register, { once: true })
    return () => {
      cancelled = true
      window.removeEventListener('load', register)
    }
  }, [])

  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  )

  return (
    <QueryClientProvider client={queryClient}>
      <VFThemeProvider>
        {children}
      </VFThemeProvider>
      <OfflineBanner />
      <InstallAppPrompt />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: 'var(--vf-surface)',
            color: 'var(--vf-text)',
            border: '1px solid var(--vf-border)',
            borderRadius: '8px',
            fontSize: '13px',
          },
          success: { iconTheme: { primary: '#16A34A', secondary: 'var(--vf-surface)' } },
          error: { iconTheme: { primary: '#DC2626', secondary: 'var(--vf-surface)' } },
        }}
      />
    </QueryClientProvider>
  )
}
