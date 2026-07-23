'use client'
import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { getSupabase } from '@/lib/supabase'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { IdentidadeService, MultiempresaService } from '@/services'
import { getBrandingLogo } from '@/lib/branding'
import BrandLogo from '@/components/BrandLogo'
import { clearEmpresaSelecionadaMaster, getEmpresaSelecionadaMasterDetalhes, type EmpresaSelecionadaMaster } from '@/services/_tenant'

function shortName(title?: string) {
  if (!title) return 'Início'
  return title.length > 22 ? `${title.slice(0, 21)}…` : title
}

export default function Header({ title }: { title?: string }) {
  const [userName, setUserName] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [empresaOperacional, setEmpresaOperacional] = useState<EmpresaSelecionadaMaster | null>(null)
  const router = useRouter()
  const queryClient = useQueryClient()
  const pathname = usePathname()
  const { data: identidade } = useQuery({ queryKey: ['identidade-global'], queryFn: IdentidadeService.obter, retry: false, staleTime: 60_000 })
  const { data: tenant } = useQuery({ queryKey: ['tenant-context-header'], queryFn: MultiempresaService.contexto, retry: false, staleTime: 60_000 })

  useEffect(() => {
    getSupabase().auth.getUser().then(({ data }) => {
      const name = data.user?.user_metadata?.full_name || data.user?.email?.split('@')[0] || ''
      setUserName(name)
    })
  }, [])

  useEffect(() => {
    const syncEmpresa = () => setEmpresaOperacional(getEmpresaSelecionadaMasterDetalhes())
    syncEmpresa()
    window.addEventListener('vf-nexus-empresa-operacional-change', syncEmpresa)
    window.addEventListener('storage', syncEmpresa)
    return () => {
      window.removeEventListener('vf-nexus-empresa-operacional-change', syncEmpresa)
      window.removeEventListener('storage', syncEmpresa)
    }
  }, [])

  return (
    <header className="vf-app-header sticky top-0 z-30 bg-[var(--vf-header-bg,var(--vf-surface))] backdrop-blur-xl border-b border-[var(--vf-border)]">
      <div className="vf-app-header-inner flex items-center justify-between px-3 sm:px-4 md:px-6 py-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="vf-mobile-logo w-10 h-10 md:w-8 md:h-8 rounded-2xl md:rounded-lg border border-[color-mix(in_srgb,var(--vf-primary)_25%,transparent)] bg-[var(--vf-surface)] flex-shrink-0 overflow-hidden shadow-sm">
            <BrandLogo src={getBrandingLogo(identidade)} alt={identidade?.nome || 'VF Nexus'} width={44} height={44} className="w-full h-full object-contain p-0.5" />
          </div>
          <div className="min-w-0">
            <h1 className="vf-header-title text-[15px] md:text-[15px] font-semibold text-[var(--vf-text)] truncate">{shortName(title)}</h1>
            <p className="md:hidden text-[10px] text-[var(--vf-text3)] truncate leading-tight">{identidade?.nome || 'VF Nexus'} · App de gestão</p>
          </div>
        </div>

        <div
          onClick={() => router.push('/ia')}
          className="hidden md:flex items-center gap-2 bg-[color-mix(in_srgb,var(--vf-primary)_10%,transparent)] border border-[color-mix(in_srgb,var(--vf-primary)_30%,transparent)] rounded-full px-3 py-1.5 cursor-pointer hover:bg-[color-mix(in_srgb,var(--vf-primary)_18%,transparent)] transition-colors"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--vf-secondary)] vf-pulse" />
          <span className="text-[11px] text-[var(--vf-secondary)] font-medium">VF Nexus IA</span>
        </div>

        <div className="relative">
          <button
            aria-label="Abrir menu do usuário"
            onClick={() => setMenuOpen(o => !o)}
            className="vf-touch flex items-center gap-2 px-2.5 py-1.5 rounded-2xl hover:bg-[var(--vf-surface2)] transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-[color-mix(in_srgb,var(--vf-primary)_16%,transparent)] border border-[color-mix(in_srgb,var(--vf-primary)_35%,transparent)] flex items-center justify-center text-[var(--vf-secondary)] text-xs font-semibold">
              {userName.charAt(0).toUpperCase() || 'U'}
            </div>
            <span className="text-[13px] text-[var(--vf-text3)] hidden md:block max-w-[120px] truncate">{userName}</span>
            {tenant?.papelLabel && <span className="hidden lg:inline-flex rounded-full bg-[color-mix(in_srgb,var(--vf-primary)_10%,transparent)] px-2 py-1 text-[10px] font-bold text-[var(--vf-primary)]">{tenant.papelLabel}</span>}
            <span className="text-[var(--vf-text3)] text-xs">▾</span>
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 w-56 bg-[var(--vf-surface)] border border-[color-mix(in_srgb,var(--vf-primary)_22%,transparent)] rounded-2xl shadow-xl py-1 z-50 vf-fadein">
              <div className="px-4 py-2 border-b border-[var(--vf-border)] md:hidden">
                <div className="text-xs font-semibold text-[var(--vf-text)] truncate">{userName || 'Usuário'}</div>
                <div className="text-[10px] text-[var(--vf-text3)] truncate">{pathname}</div>
              </div>
              <button onClick={() => { router.push('/configuracoes'); setMenuOpen(false) }}
                className="w-full text-left px-4 py-3 text-[13px] text-[var(--vf-text3)] hover:text-[var(--vf-text)] hover:bg-[var(--vf-surface2)] transition-colors">
                ⚙️ Configurações
              </button>
              <div className="h-px bg-[color-mix(in_srgb,var(--vf-secondary)_12%,transparent)] my-1" />
              <button onClick={async () => {
                await getSupabase().auth.signOut()
                router.push('/login')
              }} className="w-full text-left px-4 py-3 text-[13px] text-[var(--vf-text3)] hover:text-[var(--vf-error)] transition-colors">
                ⏻ Sair
              </button>
            </div>
          )}
        </div>
      </div>
      {tenant?.isSuperAdmin && empresaOperacional?.id && !pathname.startsWith('/master') && (
        <div className="border-t border-[var(--vf-border)] bg-[color-mix(in_srgb,var(--vf-primary)_10%,var(--vf-surface))] px-3 sm:px-4 md:px-6 py-2 text-xs font-bold text-[var(--vf-text)] flex flex-wrap items-center justify-between gap-2">
          <span>Operando como: <b>{empresaOperacional.nome || empresaOperacional.codigo_empresa || empresaOperacional.matricula_empresa || empresaOperacional.id}</b></span>
          <button
            type="button"
            className="rounded-full border border-[var(--vf-border)] bg-[var(--vf-card)] px-3 py-1 text-[var(--vf-primary)] hover:bg-[var(--vf-surface2)]"
            onClick={async () => { try { await clearEmpresaSelecionadaMaster(); queryClient.clear(); router.push('/master') } catch { router.push('/master') } }}
          >
            Sair do modo empresa
          </button>
        </div>
      )}
    </header>
  )
}
