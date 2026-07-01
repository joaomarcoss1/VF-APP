'use client'

import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import Sidebar from '@/components/layout/Sidebar'
import MobileNav from '@/components/layout/MobileNav'
import { AssinaturaService, FeatureConfigService, IdentidadeService, MasterService, getPerfilAtual } from '@/services'
import { Button, Card, Alert } from '@/components/ui'
import { fmtCurrency } from '@/lib/precificacao'
import { usePathname, useRouter } from 'next/navigation'
import { isFeatureEnabled, pathToFeature } from '@/lib/modules'
import { applyBrandingVars } from '@/lib/branding'
import { canAccessPath } from '@/lib/rbac'

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { data: identidade } = useQuery({ queryKey: ['identidade-global'], queryFn: IdentidadeService.obter, retry: false })
  const { data: assinatura } = useQuery({ queryKey: ['minha-assinatura'], queryFn: AssinaturaService.minhaAssinatura, retry: false })
  const { data: moduleConfig } = useQuery({ queryKey: ['setor-modulos'], queryFn: FeatureConfigService.listar, retry: false, staleTime: 60_000 })
  const { data: masterInfo } = useQuery({ queryKey: ['sou-master'], queryFn: MasterService.souMaster, retry: false, staleTime: 60_000 })
  const { data: perfil } = useQuery({ queryKey: ['perfil-atual-rbac'], queryFn: getPerfilAtual, retry: false, staleTime: 60_000 })

  useEffect(() => {
    applyBrandingVars(identidade)
  }, [identidade])

  useEffect(() => {
    if (!identidade) return
    if (!identidade.onboarding_concluido && pathname !== '/onboarding') {
      router.replace('/onboarding')
    }
  }, [identidade, pathname, router])

  const bloqueada = assinatura?.status === 'bloqueada' || assinatura?.status === 'vencida'
  const currentFeature = pathToFeature(pathname)
  const featureDisabled = Boolean(
    (currentFeature === 'master-admin' && masterInfo && !masterInfo.is_master) ||
    (currentFeature && currentFeature !== 'master-admin' && currentFeature !== 'configuracoes' && identidade && !isFeatureEnabled(identidade.tipo, currentFeature, moduleConfig))
  )
  const permissionDenied = Boolean(currentFeature && perfil && !canAccessPath(perfil, pathname, moduleConfig?.filter(m => m.ativo).map(m => m.modulo)))

  if (pathname === '/onboarding') {
    return <div className="min-h-screen bg-[var(--vf-bg)]">{children}</div>
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--vf-bg)] text-[var(--vf-text)]">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
          {bloqueada ? (
            <div className="min-h-full flex items-center justify-center p-6">
              <Card className="p-6 max-w-lg text-center space-y-4" gold>
                <div className="text-5xl">🔒</div>
                <h1 className="text-xl font-semibold text-[var(--vf-text)]">Assinatura bloqueada ou vencida</h1>
                <p className="text-sm text-[var(--vf-text3)]">
                  O acesso desta empresa está temporariamente bloqueado. Entre em contato com o administrador do VF Nexus para regularizar a assinatura.
                </p>
                <div className="grid grid-cols-2 gap-3 text-left text-sm">
                  <div className="bg-[var(--vf-surface2)] rounded-lg p-3"><span className="text-[var(--vf-text3)] block">Status</span><b className="text-[#D45050]">{assinatura.status}</b></div>
                  <div className="bg-[var(--vf-surface2)] rounded-lg p-3"><span className="text-[var(--vf-text3)] block">Valor</span><b className="text-[var(--vf-primary)]">{fmtCurrency(assinatura.valor ?? 0)}</b></div>
                </div>
                <Button onClick={() => window.location.reload()} variant="secondary">Atualizar status</Button>
              </Card>
            </div>
          ) : featureDisabled ? (
            <div className="min-h-full flex items-center justify-center p-6">
              <Card className="p-6 max-w-xl space-y-4" gold>
                <div className="text-4xl">🧩</div>
                <h1 className="text-xl font-semibold text-[var(--vf-text)]">Funcionalidade indisponível para este ramo</h1>
                <Alert type="info">Esta tela foi desativada na configuração de módulos do ramo <b>{identidade?.tipo}</b>. O administrador master pode ativar ou remover funcionalidades por setor em Master Admin.</Alert>
                <Button onClick={() => window.location.href = '/dashboard'}>Voltar ao dashboard</Button>
              </Card>
            </div>
          ) : permissionDenied ? (
            <div className="min-h-full flex items-center justify-center p-6">
              <Card className="p-6 max-w-xl space-y-4" gold>
                <div className="text-4xl">🔐</div>
                <h1 className="text-xl font-semibold text-[var(--vf-text)]">Acesso negado</h1>
                <Alert type="warn">Seu cargo atual não possui permissão para visualizar esta funcionalidade. Peça ao dono ou administrador para liberar o módulo/ação em Equipe e Permissões.</Alert>
                <Button onClick={() => window.location.href = '/dashboard'}>Voltar ao dashboard</Button>
              </Card>
            </div>
          ) : children}
        </main>
      </div>
      <MobileNav />
    </div>
  )
}
