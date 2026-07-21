'use client'

import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { BarChart3, ChefHat, Wine, CreditCard, Headset, ShieldCheck, Sparkles } from 'lucide-react'
import { ThemeToggle } from '@/components/theme/ThemeToggle'
import { useRestaurantAccess, canAccessSector } from '@/hooks/useRestaurantAccess'
import { useModulosEmpresa } from '@/hooks/useModulosEmpresa'
import type { RestaurantSector } from '@/services/restaurante'

const sectors: Array<{ id: RestaurantSector; title: string; subtitle: string; href: string; icon: any; tone: string }> = [
  { id: 'atendimento', title: 'VF Nexus Atendimento', subtitle: 'Mesas, comandas, pedidos e fechamento solicitado ao caixa.', href: '/atendimento', icon: Headset, tone: 'from-blue-600 to-sky-400' },
  { id: 'cozinha', title: 'Cozinha', subtitle: 'Receba pedidos de comida, prepare e marque como pronto.', href: '/cozinha', icon: ChefHat, tone: 'from-red-600 to-orange-400' },
  { id: 'bar_drinks', title: 'Bar / Drinks', subtitle: 'Receba bebidas e drinks separados da cozinha.', href: '/bar-drinks', icon: Wine, tone: 'from-emerald-600 to-green-400' },
  { id: 'caixa', title: 'Caixa', subtitle: 'Receba pagamentos, baixe comandas e feche o caixa.', href: '/atendimento/caixa', icon: CreditCard, tone: 'from-violet-600 to-purple-400' },
  { id: 'admin', title: 'Painel Administrativo', subtitle: 'Produtos, funcionários, mesas, estoque e relatórios.', href: '/dashboard', icon: BarChart3, tone: 'from-slate-950 to-slate-700' },
]

export default function SetorPage() {
  const router = useRouter()
  const { staffName, staffSector, isOperationalLogin, isManager, isAdmin } = useRestaurantAccess()
  const { hasModule, ramo } = useModulosEmpresa()
  const visibleSectors = useMemo(() => sectors.filter((sector) => {
    const moduleKey = sector.id === 'bar_drinks' ? 'bar-drinks' : sector.id
    const moduleVisible = sector.id === 'admin' ? true : hasModule(moduleKey)
    const sectorAllowed = !isOperationalLogin || isManager || isAdmin || canAccessSector(staffSector, sector.id)
    return moduleVisible && sectorAllowed
  }), [hasModule, isAdmin, isManager, isOperationalLogin, staffSector])

  function go(id: RestaurantSector, href: string) {
    window.localStorage.setItem('vf_nexus_sector', id)
    router.push(href)
  }

  return (
    <main className="relative min-h-dvh overflow-hidden bg-[#020617] text-white vf-theme-transition">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(37,99,235,.55),transparent_30%),radial-gradient(circle_at_88%_6%,rgba(245,158,11,.28),transparent_32%),linear-gradient(135deg,#020617,#07111f_45%,#020617)]" />
      <div className="absolute left-[-12rem] top-20 h-96 w-96 rounded-full bg-blue-600/20 blur-3xl" />
      <div className="absolute bottom-[-10rem] right-[-8rem] h-96 w-96 rounded-full bg-amber-400/20 blur-3xl" />
      <section className="relative mx-auto flex min-h-dvh max-w-7xl flex-col justify-between px-5 py-6 md:px-8 md:py-10">
        <header className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div className="flex items-center gap-3"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-blue-700 shadow-xl shadow-blue-900/40"><Sparkles size={24} /></div><div><strong className="block text-lg">VF Nexus</strong><span className="text-[11px] font-black uppercase tracking-[.25em] text-blue-200">{ramo?.nome ?? 'Atendimento'}</span></div></div>
          <div className="flex flex-wrap items-center gap-2"><ThemeToggle /><a href="/atendimento/login-funcionario" className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-black text-white backdrop-blur transition hover:bg-white/15"><ShieldCheck size={17} /> Login do funcionário</a></div>
        </header>
        <div className="py-10 md:py-16">
          <span className="inline-flex items-center gap-2 rounded-full border border-amber-300/30 bg-amber-300/10 px-4 py-2 text-xs font-black uppercase tracking-[.2em] text-amber-100">Escolha o setor</span>
          <h1 className="mt-5 max-w-4xl text-4xl font-black leading-[.95] tracking-tight md:text-7xl">Onde você vai trabalhar agora?</h1>
          <p className="mt-5 max-w-2xl text-base font-semibold leading-8 text-slate-300 md:text-lg">Aparecem somente setores liberados para o ramo e para o funcionário. Atendimento, cozinha, bar/drinks e caixa ficam separados por função.</p>
          {staffName && <div className="mt-5 inline-flex rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-bold text-slate-200">Operador: <strong className="ml-2 text-white">{staffName}</strong><span className="ml-2 rounded-full bg-blue-500/20 px-2 text-blue-100">{staffSector}</span></div>}
          <div className="mt-9 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {visibleSectors.map((sector, index) => {
              const Icon = sector.icon
              return <button key={sector.id} onClick={() => go(sector.id, sector.href)} className="group relative overflow-hidden rounded-[30px] border border-white/12 bg-white/[.08] p-5 text-left shadow-2xl shadow-black/30 backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:bg-white/[.13] active:scale-[.985]" style={{ animation: `vf-sector-in .42s ease ${index * 70}ms both` }}><div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${sector.tone}`} /><div className={`grid h-16 w-16 place-items-center rounded-3xl bg-gradient-to-br ${sector.tone} shadow-lg`}><Icon size={31} /></div><h2 className="mt-6 text-xl font-black leading-tight">{sector.title}</h2><p className="mt-3 min-h-[76px] text-sm font-semibold leading-6 text-slate-300">{sector.subtitle}</p><span className="mt-4 inline-flex rounded-full bg-white px-4 py-2 text-xs font-black text-slate-950 transition group-hover:scale-105">Acessar setor</span></button>
            })}
          </div>
          {visibleSectors.length === 0 && <div className="mt-8 rounded-[28px] border border-white/10 bg-white/10 p-5 text-sm font-semibold text-slate-200">Nenhum setor operacional liberado para este usuário. Solicite ao gerente/admin ou ao Admin Master.</div>}
        </div>
        <footer className="flex flex-col justify-between gap-3 border-t border-white/10 pt-5 text-xs font-semibold text-slate-400 md:flex-row"><span>VF Nexus · NexLabs</span><span>Setores ocultos quando não liberados</span></footer>
      </section>
    </main>
  )
}
