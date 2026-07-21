'use client'

import Link from 'next/link'
import BrandLogo from '@/components/BrandLogo'
import { ThemeToggle } from '@/components/theme/ThemeToggle'
import { usePathname, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { getSupabase } from '@/lib/supabase'
import { IdentidadeService } from '@/services'
import { useModulosEmpresa } from '@/hooks/useModulosEmpresa'
import toast from 'react-hot-toast'
import { BarChart3, Boxes, CalendarClock, ChefHat, ClipboardList, Coffee, DollarSign, FileText, Headset, Home, Package, QrCode, Receipt, ReceiptText, Settings, ShieldCheck, ShoppingCart, Tags, Users, Wallet, type LucideIcon } from 'lucide-react'
import type { FeatureKey } from '@/lib/modules'


const ICONS: Partial<Record<FeatureKey, LucideIcon>> = {
  dashboard: Home,
  atendimento: Headset,
  cozinha: ChefHat,
  'bar-drinks': Coffee,
  caixa: Wallet,
  pdv: ShoppingCart,
  scanner: QrCode,
  etiquetas: Tags,
  produtos: Package,
  estoque: Boxes,
  vendas: Receipt,
  clientes: Users,
  financeiro: DollarSign,
  reservas_adiantamentos: CalendarClock,
  relatorios: BarChart3,
  configuracoes: Settings,
  'master-admin': ShieldCheck,
  comprovantes: ReceiptText,
  cardapio: FileText,
}

function IconFor({ feature }: { feature: FeatureKey }) {
  const Icon = ICONS[feature] ?? ClipboardList
  return <Icon size={17} strokeWidth={2.35} />
}

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { data: identidade } = useQuery({ queryKey: ['identidade-global'], queryFn: IdentidadeService.obter, retry: false })
  const { visibleFeatures, ramo, isLoading } = useModulosEmpresa()

  const handleLogout = async () => {
    await getSupabase().auth.signOut()
    toast.success('Até logo!')
    router.push('/login')
  }

  return (
    <aside className="vf-sidebar-desktop hidden md:flex w-[248px] flex-shrink-0 flex-col bg-[color-mix(in_srgb,var(--vf-menu)_95%,transparent)] backdrop-blur border-r border-[var(--vf-border)] h-dvh sticky top-0 overflow-y-auto">
      <div className="flex items-center gap-3 px-4 py-4 border-b border-[var(--vf-border)]">
        <div className="w-11 h-11 rounded-2xl bg-[var(--vf-surface)] border border-[color-mix(in_srgb,var(--vf-primary)_25%,transparent)] flex items-center justify-center overflow-hidden flex-shrink-0">
          <BrandLogo src={identidade?.logo_url} alt={identidade?.nome || 'VF Nexus'} width={38} height={38} className="w-full h-full object-contain" />
        </div>
        <div className="min-w-0">
          <div className="text-[var(--vf-text)] text-sm font-black tracking-tight truncate">{identidade?.nome || 'VF Nexus'}</div>
          <div className="text-[var(--vf-secondary)] text-[9px] tracking-widest uppercase truncate">{ramo?.nome ?? 'SaaS modular'}</div>
        </div>
      </div>

      <div className="px-3 py-3 border-b border-[var(--vf-border)]">
        <div className="rounded-2xl bg-[var(--vf-surface2)] border border-[var(--vf-border)] p-3">
          <div className="text-[11px] font-black uppercase tracking-[.18em] text-[var(--vf-text3)]">Ramo ativo</div>
          <div className="mt-1 flex items-center gap-2 text-sm font-black text-[var(--vf-text)]"><span>{ramo?.icon}</span>{ramo?.nome ?? 'Personalizado'}</div>
          <p className="mt-1 text-[11px] font-semibold leading-4 text-[var(--vf-text3)]">Somente funções liberadas para esta empresa aparecem.</p>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-0.5">
        {isLoading && Array.from({ length: 7 }).map((_, i) => <div key={i} className="mb-2 h-10 vf-skeleton rounded-xl" />)}
        {!isLoading && visibleFeatures.map(({ href, label, key }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
          return (
            <Link key={key} href={href} className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] transition-all border ${active ? 'bg-[color-mix(in_srgb,var(--vf-primary)_14%,transparent)] border-[color-mix(in_srgb,var(--vf-primary)_28%,transparent)] text-[var(--vf-secondary)]' : 'text-[var(--vf-text3)] hover:text-[var(--vf-text)] hover:bg-[var(--vf-surface2)] border-transparent'}`}>
              <span className="w-7 flex items-center justify-center flex-shrink-0 text-[var(--vf-primary)]"><IconFor feature={key} /></span>
              <span className="flex-1 truncate">{label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="p-3 border-t border-[var(--vf-border)] space-y-2">
        <ThemeToggle />
        <button onClick={() => router.push('/selecionar-ramo')} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] text-[var(--vf-text3)] hover:text-[var(--vf-primary)] hover:bg-[var(--vf-surface2)] transition-colors"><span>🧭</span><span>Trocar ramo inicial</span></button>
        <button onClick={handleLogout} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] text-[var(--vf-text3)] hover:text-[var(--vf-error)] hover:bg-[var(--vf-surface2)] transition-colors"><span>⏻</span><span>Sair da conta</span></button>
      </div>
    </aside>
  )
}
