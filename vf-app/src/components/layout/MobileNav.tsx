'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { FeatureConfigService, IdentidadeService, MasterService, getPerfilAtual } from '@/services'
import { FEATURE_DEFINITIONS, isFeatureEnabled } from '@/lib/modules'
import { canAccessModule } from '@/lib/rbac'

export default function MobileNav() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const { data: identidade } = useQuery({ queryKey: ['identidade-global'], queryFn: IdentidadeService.obter, retry: false })
  const { data: moduleConfig } = useQuery({ queryKey: ['setor-modulos'], queryFn: FeatureConfigService.listar, retry: false, staleTime: 60_000 })
  const { data: masterInfo } = useQuery({ queryKey: ['sou-master'], queryFn: MasterService.souMaster, retry: false, staleTime: 60_000 })
  const { data: perfil } = useQuery({ queryKey: ['perfil-atual-rbac'], queryFn: getPerfilAtual, retry: false, staleTime: 60_000 })

  const modulosAtivos = useMemo(() => moduleConfig?.filter(m => m.ativo).map(m => m.modulo), [moduleConfig])
  const nav = useMemo(() => FEATURE_DEFINITIONS.filter(item => {
    if (item.masterOnly) return Boolean(masterInfo?.is_master) && canAccessModule(perfil, item.key, modulosAtivos)
    return isFeatureEnabled(identidade?.tipo, item.key, moduleConfig) && canAccessModule(perfil, item.key, modulosAtivos)
  }), [identidade?.tipo, moduleConfig, masterInfo?.is_master, perfil, modulosAtivos])

  const primaryKeys = ['dashboard','produtos','vendas','agendamentos','financeiro']
  const primary = primaryKeys.map(k => nav.find(i => i.key === k)).filter(Boolean) as typeof nav
  const activeExtra = nav.find(i => !primaryKeys.includes(i.key) && (pathname === i.href || (i.href !== '/dashboard' && pathname.startsWith(i.href))))
  const visible = activeExtra ? [...primary.slice(0,4), activeExtra] : primary.slice(0,5)
  const extras = nav.filter(i => !visible.some(v => v.key === i.key))

  return (
    <>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/92 backdrop-blur border-t border-[var(--vf-border)] vf-mobile-safe">
        <div className="grid grid-cols-6 px-1 py-1.5 gap-1">
          {visible.map(({ href, icon, mobileLabel }) => {
            const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
            return (
              <Link
                key={href}
                href={href}
                className={`min-w-0 flex flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-[9.5px] border transition-all ${active ? 'text-[var(--vf-secondary)] bg-[rgba(10,141,255,0.12)] border-[var(--vf-border)]' : 'text-[var(--vf-text3)] border-transparent'}`}
              >
                <span className="text-base leading-none">{icon}</span>
                <span className="leading-none whitespace-nowrap truncate max-w-[48px]">{mobileLabel}</span>
              </Link>
            )
          })}
          <button onClick={() => setOpen(true)} className="min-w-0 flex flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-[9.5px] border border-transparent text-[var(--vf-text3)]">
            <span className="text-base leading-none">☰</span>
            <span className="leading-none whitespace-nowrap">Mais</span>
          </button>
        </div>
      </nav>
      {open && <div className="md:hidden fixed inset-0 z-50">
        <div className="absolute inset-0 bg-black/70" onClick={() => setOpen(false)} />
        <div className="absolute left-0 right-0 bottom-0 bg-white border-t border-[var(--vf-border)] rounded-t-3xl p-4 max-h-[78vh] overflow-y-auto vf-fadein">
          <div className="flex items-center justify-between mb-3"><div><b className="text-[var(--vf-text)]">Mais funcionalidades</b><p className="text-xs text-[var(--vf-text3)]">Somente módulos liberados para este ramo.</p></div><button onClick={() => setOpen(false)} className="w-9 h-9 rounded-xl bg-[var(--vf-surface2)] text-[var(--vf-text2)]">✕</button></div>
          <div className="grid grid-cols-2 gap-2 pb-5">
            {extras.map(item => <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className="rounded-2xl border border-[rgba(10,141,255,.18)] bg-[var(--vf-surface)] p-3 min-h-[84px] flex flex-col gap-2">
              <span className="text-xl">{item.icon}</span><span className="text-sm text-[var(--vf-text)] font-medium">{item.label}</span><span className="text-[10px] text-[var(--vf-text3)] line-clamp-2">{item.description}</span>
            </Link>)}
          </div>
        </div>
      </div>}
    </>
  )
}
