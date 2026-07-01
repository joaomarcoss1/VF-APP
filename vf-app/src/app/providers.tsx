'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect, useState, type ReactNode } from 'react'
import { Toaster } from 'react-hot-toast'

export default function Providers({ children }: { children: ReactNode }) {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch((error) => {
        console.warn('Não foi possível registrar o service worker de notificações.', error)
      })
    })
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
      {children}
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#1A1A1A',
            color: '#F5F0E8',
            border: '1px solid rgba(201,168,76,0.25)',
            borderRadius: '8px',
            fontSize: '13px',
          },
          success: { iconTheme: { primary: '#3DAA6B', secondary: '#0A0A0A' } },
          error: { iconTheme: { primary: '#D45050', secondary: '#0A0A0A' } },
        }}
      />
    </QueryClientProvider>
  )
}
