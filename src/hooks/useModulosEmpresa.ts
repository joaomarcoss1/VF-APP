'use client'

import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ModulosEmpresaService } from '@/services/modulos-empresa'
import { FEATURE_DEFINITIONS } from '@/lib/modules'
import { getRamoDefinition, moduleMatchesDefinition, type ModuloCodigo } from '@/config/ramos'

const ESSENTIAL_MODULES: ModuloCodigo[] = [
  'dashboard', 'atendimento', 'cozinha', 'bar-drinks', 'caixa',
  'pdv' as ModuloCodigo, 'scanner' as ModuloCodigo, 'etiquetas' as ModuloCodigo,
  'produtos', 'vendas', 'clientes', 'reservas_adiantamentos', 'estoque', 'financeiro', 'relatorios', 'configuracoes',
]

function getSafeLocal(key: string) {
  if (typeof window === 'undefined') return ''
  try { return window.localStorage.getItem(key) || '' } catch { return '' }
}

function stablePublicFallback() {
  const ramo = getRamoDefinition('bar_restaurante')
  const modules = ['dashboard', 'pdv', 'scanner', 'etiquetas', 'produtos', 'vendas', 'clientes'] as ModuloCodigo[]
  const features = FEATURE_DEFINITIONS.filter((feature) => modules.some((module) => moduleMatchesDefinition(module, feature)) && !feature.masterOnly)
  return { empresaId: null, ramo, modules, features, isMaster: false, rawOverrides: [] }
}

export function useModulosEmpresa() {
  const fallback = useMemo(() => stablePublicFallback(), [])
  const [empresaKey, setEmpresaKey] = useState('carregando')

  useEffect(() => {
    const read = () => {
      setEmpresaKey(
        getSafeLocal('vf_nexus_empresa_operacional') ||
        getSafeLocal('vf_nexus_empresa_id') ||
        getSafeLocal('vf_nexus_empresa_codigo') ||
        'sem-empresa'
      )
    }
    read()
    window.addEventListener('vf-nexus-empresa-operacional-change', read)
    window.addEventListener('storage', read)
    return () => {
      window.removeEventListener('vf-nexus-empresa-operacional-change', read)
      window.removeEventListener('storage', read)
    }
  }, [])

  const query = useQuery({
    queryKey: ['empresa-modulos-visiveis-v9-2-3', empresaKey],
    queryFn: () => ModulosEmpresaService.obterContexto(),
    enabled: empresaKey !== 'carregando',
    retry: false,
    staleTime: 30 * 60_000,
    gcTime: 60 * 60_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    placeholderData: (previousData) => previousData,
  })

  const isLoading = (empresaKey === 'carregando' || query.isLoading) && !query.data
  const contexto = query.data ?? null
  const hasRealContext = Boolean(contexto?.empresaId || contexto?.features?.length)
  const modules = contexto?.modules?.length ? contexto.modules : (isLoading ? [] : fallback.modules)
  const visibleFeatures = contexto?.features?.length ? contexto.features : (isLoading ? [] : fallback.features)
  const moduleSet = useMemo(() => new Set(modules), [modules])
  const firstHref = visibleFeatures.find((feature) => feature.href !== '/master-admin')?.href ?? '/dashboard'

  return {
    ...query,
    isLoading,
    isFallback: !isLoading && !hasRealContext,
    contexto,
    ramo: contexto?.ramo ?? fallback.ramo,
    modules,
    visibleFeatures,
    firstHref,
    hasModule: (module: ModuloCodigo | string) => {
      if (ESSENTIAL_MODULES.includes(module as ModuloCodigo) && isLoading) return false
      return moduleSet.has(module as ModuloCodigo) || visibleFeatures.some((feature) => feature.key === module)
    },
  }
}
