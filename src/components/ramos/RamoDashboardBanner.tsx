'use client'

import Link from 'next/link'
import { useModulosEmpresa } from '@/hooks/useModulosEmpresa'

export function RamoDashboardBanner() {
  const { ramo, visibleFeatures } = useModulosEmpresa()
  if (!ramo) return null
  const quick = visibleFeatures.slice(0, 4)
  return (
    <section className="vf-premium-card rounded-[28px] p-5 md:p-6 overflow-hidden relative">
      <div className="absolute right-0 top-0 h-32 w-32 translate-x-8 -translate-y-8 rounded-full opacity-20 blur-2xl" style={{ background: ramo.color }} />
      <div className="relative flex flex-col justify-between gap-5 md:flex-row md:items-center">
        <div>
          <span className="inline-flex rounded-full bg-[color-mix(in_srgb,var(--vf-secondary)_14%,transparent)] px-3 py-1 text-xs font-black uppercase tracking-[.16em] text-[var(--vf-secondary)]">Ramo ativo</span>
          <h2 className="mt-3 text-2xl font-black text-[var(--vf-text)] md:text-3xl">{ramo.icon} {ramo.nome}</h2>
          <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-[var(--vf-text3)]">A interface está personalizada para este ramo. Funções de outros segmentos ficam ocultas, e o Admin Master pode liberar módulos extras por empresa.</p>
        </div>
        <div className="grid grid-cols-2 gap-2 md:min-w-[420px]">
          {quick.map((item) => <Link key={item.key} href={item.href} className="rounded-2xl border border-[var(--vf-border)] bg-[var(--vf-surface2)] p-3 transition hover:-translate-y-0.5 hover:border-[var(--vf-primary)]"><span className="text-xl">{item.icon}</span><strong className="mt-1 block text-xs text-[var(--vf-text)]">{item.mobileLabel}</strong></Link>)}
        </div>
      </div>
    </section>
  )
}
