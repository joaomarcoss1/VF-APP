'use client'
import Link from 'next/link'
import BrandLogo from '@/components/BrandLogo'
import { usePathname, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { getSupabase } from '@/lib/supabase'
import { FeatureConfigService, IdentidadeService, MasterService, getPerfilAtual } from '@/services'
import { FEATURE_DEFINITIONS, isFeatureEnabled } from '@/lib/modules'
import { canAccessModule } from '@/lib/rbac'
import toast from 'react-hot-toast'

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { data: identidade } = useQuery({ queryKey: ['identidade-global'], queryFn: IdentidadeService.obter, retry: false })
  const { data: moduleConfig } = useQuery({ queryKey: ['setor-modulos'], queryFn: FeatureConfigService.listar, retry: false, staleTime: 60_000 })
  const { data: masterInfo } = useQuery({ queryKey: ['sou-master'], queryFn: MasterService.souMaster, retry: false, staleTime: 60_000 })
  const { data: perfil } = useQuery({ queryKey: ['perfil-atual-rbac'], queryFn: getPerfilAtual, retry: false, staleTime: 60_000 })

  const modulosAtivos = moduleConfig?.filter(m => m.ativo).map(m => m.modulo)
  const nav = FEATURE_DEFINITIONS.filter(item => {
    if (item.masterOnly) return Boolean(masterInfo?.is_master) && canAccessModule(perfil, item.key, modulosAtivos)
    return isFeatureEnabled(identidade?.tipo, item.key, moduleConfig) && canAccessModule(perfil, item.key, modulosAtivos)
  })

  const handleLogout = async () => {
    await getSupabase().auth.signOut()
    toast.success('Até logo!')
    router.push('/auth')
  }

  return (
    <aside
      className="vf-sidebar-desktop w-[220px] flex-shrink-0 flex-col bg-white/92 backdrop-blur border-r border-[var(--vf-border)] h-screen sticky top-0 overflow-y-auto"
      style={{ display: 'flex' }}
    >
      <div className="flex items-center gap-3 px-4 py-4 border-b border-[var(--vf-border)]">
        <div className="w-10 h-10 rounded-xl bg-white border border-[rgba(10,141,255,.25)] flex items-center justify-center overflow-hidden flex-shrink-0">
          <BrandLogo src={identidade?.logo_url} alt={identidade?.nome || 'VF Nexus'} width={36} height={36} className="w-9 h-9 object-contain" />
        </div>
        <div>
          <div className="text-[var(--vf-text)] text-xs font-semibold tracking-widest">{identidade?.nome || 'VF Nexus'}</div>
          <div className="text-[var(--vf-secondary)] text-[9px] tracking-widest uppercase">Criado pela NexLabs</div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-0.5">
        {nav.map(({ href, icon, label }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition-all border ${active ? 'bg-[rgba(10,141,255,0.12)] border-[var(--vf-border)] text-[var(--vf-secondary)]' : 'text-[var(--vf-text3)] hover:text-[var(--vf-text)] hover:bg-[var(--vf-surface2)] border-transparent'}`}
            >
              <span className="text-sm w-5 text-center flex-shrink-0">{icon}</span>
              <span className="flex-1">{label}</span>
              {href === '/ia' && <span className="w-1.5 h-1.5 rounded-full bg-[#F2B72E] vf-pulse" />}
            </Link>
          )
        })}
      </nav>

      <div className="p-3 border-t border-[var(--vf-border)]">
        <button onClick={handleLogout} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] text-[var(--vf-text3)] hover:text-[#DC2626] transition-colors">
          <span>⏻</span><span>Sair da conta</span>
        </button>
      </div>
    </aside>
  )
}
