'use client'

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AssinaturaService, IdentidadeService } from '@/services'
import { getDefaultFeatureKeys, type FeatureKey } from '@/lib/modules'
import { PLAN_LIMITS, type PlanoCodigo } from '@/lib/commercial-engine'

function normalizePlano(plano?: string | null): PlanoCodigo {
  const p = String(plano || 'free').toLowerCase()
  if (p.includes('enterprise')) return 'enterprise'
  if (p.includes('premium')) return 'premium'
  if (p.includes('prof')) return 'profissional'
  if (p.includes('ess')) return 'essencial'
  return 'free'
}

export function useCommercialContext() {
  const identidadeQ = useQuery({ queryKey: ['commercial-identidade'], queryFn: IdentidadeService.obter, staleTime: 1000 * 60 * 5 })
  const assinaturaQ = useQuery<any | null>({ queryKey: ['commercial-assinatura'], queryFn: AssinaturaService.minhaAssinatura, staleTime: 1000 * 60 * 5 })

  const assinatura = assinaturaQ.data as any | null
  const plano = normalizePlano(assinatura?.tipo || assinatura?.plano || assinatura?.status || 'free')
  const limits = PLAN_LIMITS[plano]
  const modules = useMemo<FeatureKey[]>(() => {
    const empresaModules = getDefaultFeatureKeys(identidadeQ.data?.tipo)
    const modulosPermitidos = limits.modulos as Array<FeatureKey | '*'>
    if (modulosPermitidos.includes('*')) return empresaModules
    return empresaModules.filter(m => (modulosPermitidos as FeatureKey[]).includes(m))
  }, [identidadeQ.data?.tipo, limits.modulos])

  return {
    empresa: identidadeQ.data,
    assinatura,
    plano,
    limits,
    modules,
    isLoading: identidadeQ.isLoading || assinaturaQ.isLoading,
    isBlocked: assinatura?.status === 'bloqueada' || assinatura?.status === 'vencida',
  }
}
