'use client'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { Button, Card } from '@/components/ui'

export function MobilePageShell({ title, subtitle, children, action }: { title: string; subtitle?: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="vf-v14-mobile-page md:contents">
      <div className="md:hidden px-4 pt-3 pb-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-[1.22rem] leading-tight font-bold tracking-[-0.03em] text-[var(--vf-text)] truncate">{title}</h1>
            {subtitle && <p className="text-[12px] text-[var(--vf-text2)] leading-snug mt-1">{subtitle}</p>}
          </div>
          {action}
        </div>
      </div>
      {children}
    </div>
  )
}

export function MobileKpiCarousel({ children }: { children: ReactNode }) {
  return <div className="vf-v14-kpi-carousel md:grid md:grid-cols-4 md:gap-3">{children}</div>
}

export function MobileActionCard({ href, icon, title, description }: { href: string; icon: string; title: string; description?: string }) {
  return (
    <Link href={href} className="vf-v14-action-card">
      <span className="text-2xl leading-none">{icon}</span>
      <span className="min-w-0">
        <b className="block text-[13px] text-[var(--vf-text)] leading-tight truncate">{title}</b>
        {description && <small className="block text-[10px] text-[var(--vf-text3)] leading-tight line-clamp-2 mt-1">{description}</small>}
      </span>
    </Link>
  )
}

export function MobileQuickActions({ actions }: { actions: Array<{ href: string; icon: string; label: string; description?: string }> }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
      {actions.map(action => <MobileActionCard key={action.href + action.label} href={action.href} icon={action.icon} title={action.label} description={action.description} />)}
    </div>
  )
}

export function MobileDataCard({ title, subtitle, meta, children, actions }: { title: string; subtitle?: string; meta?: ReactNode; children?: ReactNode; actions?: ReactNode }) {
  return (
    <Card className="vf-v14-data-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-[14px] font-semibold text-[var(--vf-text)] truncate">{title}</h3>
          {subtitle && <p className="text-[11px] text-[var(--vf-text3)] line-clamp-2 mt-1">{subtitle}</p>}
        </div>
        {meta && <div className="shrink-0 text-right">{meta}</div>}
      </div>
      {children && <div className="mt-3">{children}</div>}
      {actions && <div className="mt-3 pt-3 border-t border-[var(--vf-border)] flex flex-wrap gap-2">{actions}</div>}
    </Card>
  )
}

export function MobileFabButton({ href = '/pdv', label = 'Nova venda' }: { href?: string; label?: string }) {
  return (
    <Link href={href} className="vf-v14-fab md:hidden" aria-label={label}>
      <span className="text-lg">＋</span>
      <span>{label}</span>
    </Link>
  )
}

export function MobileFilterSheet({ open, title, children, onClose }: { open: boolean; title: string; children: ReactNode; onClose: () => void }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 md:hidden">
      <div className="absolute inset-0 bg-[var(--vf-overlay)]" onClick={onClose} />
      <div className="absolute left-0 right-0 bottom-0 rounded-t-[28px] border-t border-[var(--vf-border)] bg-[var(--vf-surface)] p-4 pb-[calc(18px+env(safe-area-inset-bottom))] max-h-[86dvh] overflow-y-auto vf-fadein">
        <div className="flex items-center justify-between mb-4">
          <b className="text-[var(--vf-text)]">{title}</b>
          <button className="w-10 h-10 rounded-2xl bg-[var(--vf-surface2)] text-[var(--vf-text2)]" onClick={onClose}>✕</button>
        </div>
        {children}
        <div className="mt-4"><Button fullWidth onClick={onClose}>Aplicar</Button></div>
      </div>
    </div>
  )
}
