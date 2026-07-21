'use client'

import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Sidebar from '@/components/layout/Sidebar'
import MobileNav from '@/components/layout/MobileNav'
import { AssinaturaService, IdentidadeService, getPerfilAtual } from '@/services'
import { Button, Card, Alert } from '@/components/ui'
import { fmtCurrency } from '@/lib/precificacao'
import { usePathname, useRouter } from 'next/navigation'
import { pathToFeature } from '@/lib/modules'
import { applyBrandingVars, cacheBranding, readCachedBranding } from '@/lib/branding'
import { canAccessPath } from '@/lib/rbac'
import { useModulosEmpresa } from '@/hooks/useModulosEmpresa'
import { getEmpresaSelecionadaMasterDetalhes } from '@/services/_tenant'

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [clientReady, setClientReady] = useState(false)
  useEffect(() => setClientReady(true), [])

  const { data: identidade } = useQuery({ queryKey: ['identidade-global'], queryFn: IdentidadeService.obter, retry: false })
  const { data: assinatura } = useQuery({ queryKey: ['minha-assinatura'], queryFn: AssinaturaService.minhaAssinatura, retry: false })
  const { data: perfil, isLoading: loadingPerfil, isFetching: fetchingPerfil } = useQuery({ queryKey: ['perfil-atual-rbac'], queryFn: getPerfilAtual, retry: false, staleTime: 60_000 })
  const [empresaMasterSelecionada, setEmpresaMasterSelecionada] = useState<string | null>(null)
  const { visibleFeatures, firstHref, contexto, isLoading: loadingModules } = useModulosEmpresa()

  useEffect(() => { applyBrandingVars(readCachedBranding()) }, [])
  useEffect(() => { if (identidade) { applyBrandingVars(identidade, { persist: true }); cacheBranding(identidade) } }, [identidade])
  useEffect(() => { if (!identidade) return; if (!identidade.onboarding_concluido && pathname !== '/onboarding') router.replace('/onboarding') }, [identidade, pathname, router])
  useEffect(() => { const cargo = String((perfil as any)?.cargo || '').toLowerCase(); if (cargo === 'driver' || cargo === 'entregador') router.replace('/portal-entregador') }, [perfil, router])

  useEffect(() => {
    const sync = () => setEmpresaMasterSelecionada(getEmpresaSelecionadaMasterDetalhes()?.id ?? null)
    sync()
    window.addEventListener('vf-nexus-empresa-operacional-change', sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener('vf-nexus-empresa-operacional-change', sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  const cargo = String((perfil as any)?.cargo || '').toLowerCase()
  const isMaster = Boolean((perfil as any)?.is_master || cargo === 'master_admin' || cargo === 'super_admin')
  const rotaPublicaOperacional = pathname === '/onboarding' || pathname.startsWith('/assinatura') || pathname.startsWith('/suporte') || pathname.startsWith('/diagnostico')
  const masterSemEmpresaOperacional = Boolean(isMaster && !pathname.startsWith('/master') && !rotaPublicaOperacional && !empresaMasterSelecionada)

  useEffect(() => {
    if (masterSemEmpresaOperacional) router.replace('/master/empresas')
  }, [masterSemEmpresaOperacional, router])

  const billingStatus = (assinatura as any)?.status_billing
  const semEmpresa = perfil && !(perfil as any).is_master && !(perfil as any).empresa_id
  const rotaLiberadaCobranca = pathname.startsWith('/assinatura') || pathname.startsWith('/suporte') || pathname.startsWith('/diagnostico')
  const bloqueada = !rotaLiberadaCobranca && Boolean(
    semEmpresa ||
    billingStatus?.blocked ||
    ['bloqueada','vencida','unpaid','canceled','blocked','trial_desativado'].includes(String((assinatura as any)?.status || '').toLowerCase())
  ) && !Boolean((assinatura as any)?.cobranca_abolida || billingStatus?.cobranca_abolida || billingStatus?.trial_indeterminado)

  const perfilLoading = (!clientReady || (!perfil && pathname !== '/onboarding' && (loadingPerfil || fetchingPerfil)))
  const currentFeature = pathToFeature(pathname)
  const visibleFeatureKeys = visibleFeatures.map((f) => f.key)
  const hasResolvedModules = !loadingModules && visibleFeatureKeys.length > 0
  const moduleNotVisible = Boolean(currentFeature && hasResolvedModules && !visibleFeatureKeys.includes(currentFeature))
  const permissionDenied = Boolean(clientReady && currentFeature && perfil && hasResolvedModules && !moduleNotVisible && !canAccessPath(perfil, pathname, visibleFeatureKeys))

  useEffect(() => {
    if (moduleNotVisible && firstHref && pathname !== firstHref) router.replace(firstHref)
  }, [moduleNotVisible, firstHref, pathname, router])

  if (pathname === '/onboarding') return <div className="min-h-screen bg-[var(--vf-bg)]">{children}</div>

  if (perfilLoading || loadingModules) {
    return (
      <div className="vf-app-shell min-h-dvh w-full bg-[var(--vf-bg)] text-[var(--vf-text)]">
        <div className="flex min-h-dvh items-center justify-center p-6">
          <Card className="p-6 max-w-sm w-full text-center space-y-3">
            <div className="mx-auto h-10 w-10 rounded-2xl vf-skeleton" />
            <h1 className="text-base font-black text-[var(--vf-text)]">Carregando seu ambiente</h1>
            <p className="text-sm text-[var(--vf-text3)]">Validando empresa, módulos e permissões sem bloquear a tela.</p>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="vf-app-shell flex min-h-dvh w-full bg-[var(--vf-bg)] text-[var(--vf-text)] vf-theme-transition" data-vf-ready={clientReady ? 'true' : 'false'}>
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 w-full">
        <main className="vf-main flex-1 min-w-0 overflow-x-hidden pb-[calc(120px+env(safe-area-inset-bottom))] md:pb-0 scroll-smooth vf-no-horizontal-scroll">
          {masterSemEmpresaOperacional ? (
            <div className="min-h-full flex items-center justify-center p-6"><Card className="p-6 max-w-lg text-center space-y-4" gold><div className="text-5xl">🏢</div><h1 className="text-xl font-semibold text-[var(--vf-text)]">Selecione uma empresa para operar</h1><p className="text-sm text-[var(--vf-text3)]">O Admin Master só acessa dados globais no painel Master. Para usar dashboard, estoque, financeiro, PDV, atendimento ou reservas, escolha uma empresa primeiro.</p><Button onClick={() => window.location.assign('/master/empresas')}>Selecionar empresa</Button></Card></div>
          ) : semEmpresa ? (
            <div className="min-h-full flex items-center justify-center p-6"><Card className="p-6 max-w-lg text-center space-y-4" gold><div className="text-5xl">EMP</div><h1 className="text-xl font-semibold text-[var(--vf-text)]">Conta sem empresa vinculada</h1><p className="text-sm text-[var(--vf-text3)]">Usuários comuns sem empresa_id não acessam dados. Peça ao Admin Master para vincular sua conta.</p><Button onClick={() => window.location.assign('/login')} variant="secondary">Voltar ao login</Button></Card></div>
          ) : bloqueada ? (
            <div className="min-h-full flex items-center justify-center p-6"><Card className="p-6 max-w-lg text-center space-y-4" gold><div className="text-5xl">🔒</div><h1 className="text-xl font-semibold text-[var(--vf-text)]">Assinatura bloqueada ou vencida</h1><p className="text-sm text-[var(--vf-text3)]">Regularize pelo painel de assinatura ou solicite liberação ao Admin Master.</p><div className="grid grid-cols-2 gap-3 text-left text-sm"><div className="bg-[var(--vf-surface2)] rounded-lg p-3"><span className="text-[var(--vf-text3)] block">Status</span><b className="text-[var(--vf-error)]">{billingStatus?.status || (assinatura as any)?.status}</b></div><div className="bg-[var(--vf-surface2)] rounded-lg p-3"><span className="text-[var(--vf-text3)] block">Valor</span><b className="text-[var(--vf-primary)]">{fmtCurrency(Number((assinatura as any)?.valor_mensal || (assinatura as any)?.valor || 0))}</b></div></div><div className="flex gap-2 justify-center"><Button onClick={() => window.location.assign('/assinatura')}>Ver assinatura</Button><Button onClick={() => window.location.reload()} variant="secondary">Atualizar</Button></div></Card></div>
          ) : moduleNotVisible ? (
            <div className="min-h-full flex items-center justify-center p-6"><Card className="p-6 max-w-xl space-y-4" gold><div className="text-4xl">🧭</div><h1 className="text-xl font-semibold text-[var(--vf-text)]">Redirecionando para funções do ramo</h1><Alert type="info">Esta empresa está no ramo <b>{contexto?.ramo.nome}</b>. Funções de outros ramos ficam ocultas e não são renderizadas.</Alert><Button onClick={() => window.location.assign(firstHref)}>Ir para módulo disponível</Button></Card></div>
          ) : permissionDenied ? (
            <div className="min-h-full flex items-center justify-center p-6"><Card className="p-6 max-w-xl space-y-4" gold><div className="text-4xl">🔐</div><h1 className="text-xl font-semibold text-[var(--vf-text)]">Permissão não liberada</h1><Alert type="warn">Este módulo não está liberado para o cargo atual. Se acabou de entrar, aguarde o redirecionamento ou volte para um módulo disponível.</Alert><Button onClick={() => window.location.assign(firstHref)}>Ir para módulo disponível</Button></Card></div>
          ) : children}
        </main>
      </div>
      <MobileNav />
    </div>
  )
}
