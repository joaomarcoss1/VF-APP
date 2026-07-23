'use client'
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getTenantContext, getEmpresaSelecionadaMasterDetalhes, syncEmpresaSelecionadaMasterFromServer } from '@/services/_tenant'
import { logger } from '@/core/logging/logger'

export type TenantState = Awaited<ReturnType<typeof getTenantContext>>
type TenantContextValue = {
  data: TenantState | null
  status: 'initializing' | 'loading' | 'ready' | 'error'
  error: Error | null
  refetch: () => Promise<unknown>
  operationalKey: string
}

const Context = createContext<TenantContextValue | null>(null)

export function TenantProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [key, setKey] = useState('boot')
  const [initializing, setInitializing] = useState(true)

  useEffect(() => {
    let active = true
    const syncKey = () => setKey(getEmpresaSelecionadaMasterDetalhes()?.id || 'profile')
    const boot = async () => {
      try { await syncEmpresaSelecionadaMasterFromServer() } catch (error) { logger.warn('Contexto Master não sincronizado no boot.', { details: error }) }
      if (active) { syncKey(); setInitializing(false) }
    }
    void boot()
    window.addEventListener('storage', syncKey)
    window.addEventListener('vf-nexus-empresa-operacional-change', syncKey)
    return () => {
      active = false
      window.removeEventListener('storage', syncKey)
      window.removeEventListener('vf-nexus-empresa-operacional-change', syncKey)
    }
  }, [])

  const query = useQuery({
    queryKey: ['tenant-context-v9-4', key],
    queryFn: getTenantContext,
    enabled: !initializing,
    retry: 1,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  })

  useEffect(() => {
    if (key === 'boot') return
    queryClient.cancelQueries()
    queryClient.removeQueries({ predicate: (queryItem) => queryItem.queryKey[0] !== 'tenant-context-v9-4' })
  }, [key, queryClient])

  const value = useMemo<TenantContextValue>(() => ({
    data: query.data ?? null,
    status: initializing ? 'initializing' : query.isLoading ? 'loading' : query.error ? 'error' : 'ready',
    error: query.error as Error | null,
    refetch: query.refetch,
    operationalKey: key,
  }), [query.data, query.isLoading, query.error, query.refetch, key, initializing])

  return <Context.Provider value={value}>{children}</Context.Provider>
}

export function useTenant() {
  const value = useContext(Context)
  if (!value) throw new Error('useTenant deve ser usado dentro de TenantProvider')
  return value
}
