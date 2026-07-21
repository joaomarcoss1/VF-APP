'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useMemo, useState } from 'react'
import { Grid2X2, Home, Menu, Package, QrCode, ReceiptText, Search, ShoppingCart, Tag, UsersRound } from 'lucide-react'
import { ThemeToggle } from '@/components/theme/ThemeToggle'
import { useModulosEmpresa } from '@/hooks/useModulosEmpresa'
import type { FeatureKey } from '@/lib/modules'

const ICONS: Partial<Record<FeatureKey, any>> = {
  dashboard: Home,
  atendimento: ReceiptText,
  pdv: ShoppingCart,
  scanner: QrCode,
  etiquetas: Tag,
  produtos: Package,
  vendas: ShoppingCart,
  clientes: UsersRound,
  reservas_adiantamentos: ReceiptText,
  estoque: Package,
  relatorios: Grid2X2,
  configuracoes: Menu,
}

function iconFor(key: FeatureKey) {
  return ICONS[key] ?? Grid2X2
}

function activeFor(pathname: string, href: string) {
  return pathname === href || (href !== '/dashboard' && pathname.startsWith(`${href}/`))
}

function shortLabel(label: string) {
  const map: Record<string, string> = {
    'Dashboard': 'Início',
    'Atendimento': 'Atender',
    'VF Nexus Atendimento': 'Atender',
    'Reservas e entradas': 'Reserva',
    'Produtos/Serviços': 'Itens',
    'Financeiro': 'Fin.',
    'Relatórios': 'Rel.',
    'Configurações': 'Config.',
    'Etiquetas': 'Etiq.',
    'Clientes': 'Cliente',
  }
  const clean = map[label] || label
  return clean.length > 8 ? `${clean.slice(0, 7)}…` : clean
}

export default function MobileNav() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const { visibleFeatures, ramo, isLoading } = useModulosEmpresa()

  const ordered = useMemo(() => {
    const priority = ['dashboard', 'atendimento', 'pdv', 'scanner', 'etiquetas', 'vendas', 'reservas_adiantamentos', 'produtos', 'clientes', 'estoque']
    return [...visibleFeatures]
      .filter((item) => !item.masterOnly)
      .sort((a, b) => {
        const ai = priority.indexOf(a.key)
        const bi = priority.indexOf(b.key)
        return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
      })
  }, [visibleFeatures])

  // 3 módulos + Mais = 4 colunas. Isso evita nomes tortos/sobrepostos em telas pequenas.
  const visible = ordered.slice(0, 3)
  const extras = ordered.slice(3)

  if (isLoading) {
    return (
      <nav className="vf-mobile-nav md:hidden" aria-label="Carregando navegação mobile">
        <div className="vf-mobile-nav-grid">
          {Array.from({ length: 5 }).map((_, i) => <span key={i} className="vf-mobile-nav-item vf-mobile-nav-skeleton" />)}
        </div>
      </nav>
    )
  }

  if (!visible.length) return null

  return (
    <>
      <nav className="vf-mobile-nav md:hidden" aria-label="Navegação principal mobile">
        <div className="vf-mobile-nav-grid">
          {visible.map((item) => {
            const Icon = iconFor(item.key)
            const active = activeFor(pathname, item.href)
            return (
              <Link key={item.key} href={item.href} className={`vf-mobile-nav-item ${active ? 'is-active' : ''}`} aria-label={item.label}>
                <span className="vf-mobile-nav-icon" aria-hidden="true"><Icon size={19} strokeWidth={2.4} /></span>
                <span className="vf-mobile-nav-label">{shortLabel(item.mobileLabel || item.label)}</span>
              </Link>
            )
          })}
          <button type="button" onClick={() => setOpen(true)} className="vf-mobile-nav-item" aria-label="Abrir mais módulos">
            <span className="vf-mobile-nav-icon" aria-hidden="true"><Search size={19} strokeWidth={2.4} /></span>
            <span className="vf-mobile-nav-label">Mais</span>
          </button>
        </div>
      </nav>

      {open && (
        <div className="vf-mobile-sheet-backdrop md:hidden" onClick={() => setOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} className="vf-mobile-sheet">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <b className="block truncate text-[var(--vf-text)]">{ramo?.nome ?? 'Módulos'}</b>
                <p className="text-xs font-semibold text-[var(--vf-text3)]">Funções disponíveis para esta empresa.</p>
              </div>
              <button onClick={() => setOpen(false)} className="vf-icon-button" aria-label="Fechar">×</button>
            </div>
            <div className="mb-3"><ThemeToggle /></div>
            <div className="grid grid-cols-2 gap-2 pb-5">
              {extras.map((item) => {
                const Icon = iconFor(item.key)
                return (
                  <Link key={item.key} href={item.href} onClick={() => setOpen(false)} className="vf-mobile-extra-card">
                    <span className="vf-mobile-extra-icon"><Icon size={18} /></span>
                    <span className="vf-mobile-extra-title">{shortLabel(item.mobileLabel || item.label)}</span>
                    <span className="vf-mobile-extra-desc">{item.description}</span>
                  </Link>
                )
              })}
              {extras.length === 0 && <div className="col-span-2 vf-empty text-center"><strong>Nenhum módulo extra.</strong><p className="text-xs text-[var(--vf-text3)]">O Admin Master pode liberar outros módulos.</p></div>}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
