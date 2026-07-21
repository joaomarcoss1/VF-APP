'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { Bell, CheckCheck, ChefHat, Wine, CreditCard, Download, LayoutDashboard, LogOut, Menu, ReceiptText, ShieldAlert, Utensils, UsersRound, X } from 'lucide-react'
import BrandLogo from '@/components/BrandLogo'
import { useRestaurantNotifications } from '@/hooks/useRestaurantNotifications'
import { clearOperationalLogin, useRestaurantAccess } from '@/hooks/useRestaurantAccess'
import { useModulosEmpresa } from '@/hooks/useModulosEmpresa'
import type { RestaurantNotification, RestaurantSector } from '@/services/restaurante'

const nav = [
  { href: '/atendimento', label: 'Atendimento', icon: Utensils, sector: 'atendimento' as RestaurantSector },
  { href: '/cozinha', label: 'Cozinha', icon: ChefHat, sector: 'cozinha' as RestaurantSector },
  { href: '/bar-drinks', label: 'Bar / Drinks', icon: Wine, sector: 'bar_drinks' as RestaurantSector },
  { href: '/atendimento/caixa', label: 'Caixa', icon: CreditCard, sector: 'caixa' as RestaurantSector },
  { href: '/atendimento/funcionarios', label: 'Equipe', icon: UsersRound, sector: 'admin' as RestaurantSector },
  { href: '/dashboard', label: 'Admin', icon: LayoutDashboard, sector: 'admin' as RestaurantSector },
]

function notificationTarget(notification: RestaurantNotification) {
  if (notification.entity_type === 'comanda' && notification.entity_id) return `/atendimento/comanda/${notification.entity_id}`
  if (notification.entity_type === 'pedido') return notification.target_sector === 'caixa' ? '/atendimento/caixa' : notification.target_sector === 'bar_drinks' ? '/bar-drinks' : notification.target_sector === 'cozinha' ? '/cozinha' : '/atendimento'
  return notification.target_sector === 'cozinha' ? '/cozinha' : notification.target_sector === 'bar_drinks' ? '/bar-drinks' : notification.target_sector === 'caixa' ? '/atendimento/caixa' : '/atendimento'
}

export function OperationalShell({ sector, title, subtitle, children, actions }: { sector: RestaurantSector; title: string; subtitle?: string; children: React.ReactNode; actions?: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { ready, staffName, staffSector, isOperationalLogin, canAccess } = useRestaurantAccess(sector)
  const { hasModule, firstHref } = useModulosEmpresa()
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useRestaurantNotifications(sector)
  const [panelOpen, setPanelOpen] = useState(false)

  const visibleNav = useMemo(() => nav.filter((item) => {
    const moduleKey = item.sector === 'bar_drinks' ? 'bar-drinks' : item.sector
    const moduleVisible = item.sector === 'admin' ? true : hasModule(moduleKey)
    return moduleVisible && canAccess(item.sector)
  }), [canAccess, hasModule])

  function trocarSetor() {
    if (isOperationalLogin && staffSector !== 'gerente' && staffSector !== 'admin') return router.push(staffSector === 'cozinha' ? '/cozinha' : staffSector === 'bar_drinks' ? '/bar-drinks' : staffSector === 'caixa' ? '/atendimento/caixa' : '/atendimento')
    window.localStorage.removeItem('vf_nexus_sector')
    router.push('/setor')
  }

  function sairOperacional() {
    clearOperationalLogin()
    router.push('/atendimento/login-funcionario')
  }

  function openNotification(notification: RestaurantNotification) {
    markAsRead(notification.id)
    router.push(notificationTarget(notification))
  }

  const requiredModule = sector === 'bar_drinks' ? 'bar-drinks' : sector
  const moduleUnavailable = sector !== 'admin' && sector !== 'gerente' && !hasModule(requiredModule)

  if (moduleUnavailable) {
    return (
      <main className="grid min-h-dvh place-items-center bg-[#020617] p-5 text-white">
        <section className="w-full max-w-md rounded-[32px] border border-white/10 bg-white/[.08] p-6 text-center shadow-2xl backdrop-blur">
          <h1 className="text-2xl font-black">Módulo não liberado para este ramo</h1>
          <p className="mt-3 text-sm font-semibold leading-6 text-slate-300">Esta tela não pertence ao ramo atual da empresa ou não foi liberada pelo Admin Master.</p>
          <button onClick={() => router.push(firstHref)} className="vf-btn vf-btn-primary mt-5 w-full">Ir para uma função disponível</button>
        </section>
      </main>
    )
  }

  if (ready && !canAccess(sector)) {
    return (
      <main className="grid min-h-dvh place-items-center bg-[#020617] p-5 text-white">
        <section className="w-full max-w-md rounded-[32px] border border-white/10 bg-white/[.08] p-6 text-center shadow-2xl backdrop-blur">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-red-500/15 text-red-200"><ShieldAlert size={32} /></div>
          <h1 className="mt-5 text-2xl font-black">Acesso restrito ao setor</h1>
          <p className="mt-3 text-sm font-semibold leading-6 text-slate-300">Este funcionário está definido para o setor <strong>{staffSector}</strong> e não pode acessar <strong>{sector}</strong>. Gerente e Admin podem transitar entre setores.</p>
          <button onClick={trocarSetor} className="vf-btn vf-btn-primary mt-5 w-full">Voltar ao meu setor</button>
          <button onClick={sairOperacional} className="mt-3 text-sm font-bold text-slate-300 hover:text-white">Sair do login operacional</button>
        </section>
      </main>
    )
  }

  return (
    <main className="min-h-dvh bg-[var(--vf-bg)] text-[var(--vf-text)] vf-attendimento-app">
      <div className="grid min-h-dvh grid-cols-1 lg:grid-cols-[248px,1fr]">
        <aside className="hidden border-r border-white/10 bg-[#030816] text-white shadow-2xl lg:flex lg:flex-col">
          <div className="flex items-center gap-3 border-b border-white/10 px-5 py-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white p-1.5 shadow-lg shadow-blue-500/20"><BrandLogo src="/nexlabs-logo.png" alt="VF Nexus" className="h-full w-full object-contain" /></div>
            <div>
              <strong className="block leading-tight">VF Nexus</strong>
              <span className="text-[11px] font-bold uppercase tracking-[.18em] text-blue-200">Atendimento</span>
            </div>
          </div>
          <nav className="flex-1 space-y-2 p-3">
            {visibleNav.map((item) => {
              const Icon = item.icon
              const active = pathname === item.href || pathname?.startsWith(`${item.href}/`)
              return <Link key={item.href} href={item.href} className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold transition ${active ? 'bg-gradient-to-r from-blue-600 to-sky-500 text-white shadow-lg shadow-blue-500/25' : 'text-slate-300 hover:bg-white/10 hover:text-white'}`}><Icon size={18} /> {item.label}</Link>
            })}
          </nav>
          {staffName && <div className="mx-3 mb-2 rounded-2xl border border-white/10 bg-white/5 p-3 text-xs font-bold text-slate-300">Operador<br /><span className="text-white">{staffName}</span><br /><span className="mt-1 inline-flex rounded-full bg-blue-500/15 px-2 py-1 uppercase text-blue-100">{staffSector}</span></div>}
          <button onClick={trocarSetor} className="m-3 flex items-center justify-center gap-2 rounded-2xl border border-white/10 px-4 py-3 text-sm font-bold text-slate-200 hover:bg-white/10"><ReceiptText size={16} /> {isOperationalLogin && staffSector !== 'gerente' ? 'Meu setor' : 'Trocar setor'}</button>
          <button onClick={sairOperacional} className="m-3 mt-0 flex items-center justify-center gap-2 rounded-2xl border border-white/10 px-4 py-3 text-sm font-bold text-slate-200 hover:bg-white/10"><LogOut size={16} /> Sair</button>
        </aside>
        <section className="min-w-0">
          <header className="sticky top-0 z-30 border-b border-[var(--vf-border)] bg-[var(--vf-surface)]/92 text-[var(--vf-text)] backdrop-blur-xl vf-operational-header">
            <div className="flex items-center justify-between gap-3 px-4 py-3 lg:px-6">
              <div className="flex min-w-0 items-center gap-3">
                <button onClick={trocarSetor} className="grid h-11 w-11 place-items-center rounded-2xl border border-[var(--vf-border)] bg-[var(--vf-card)] text-[var(--vf-text)] shadow-sm lg:hidden"><Menu size={19} /></button>
                <div>
                  <h1 className="truncate text-lg font-black tracking-tight text-[var(--vf-text)] lg:text-xl">{title}</h1>
                  {subtitle && <p className="truncate text-xs font-semibold text-[var(--vf-text3)]">{subtitle}</p>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => window.dispatchEvent(new Event('vf-pwa-install-request'))} className="hidden h-11 items-center gap-2 rounded-2xl border border-[var(--vf-border)] bg-[var(--vf-surface2)] px-3 text-xs font-black text-[var(--vf-primary)] md:inline-flex"><Download size={15} /> Instalar</button>
                {actions}
                <button onClick={() => setPanelOpen(true)} className="relative grid h-11 w-11 place-items-center rounded-2xl border border-[var(--vf-border)] bg-[var(--vf-surface2)] text-[var(--vf-primary)]">
                  <Bell size={18} />
                  {unreadCount > 0 && <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-red-600 px-1 text-[10px] font-black text-white">{unreadCount}</span>}
                </button>
              </div>
            </div>
          </header>
          <div className="vf-page-container pb-28 lg:pb-6">{children}</div>
        </section>
      </div>
      <nav className="fixed inset-x-3 bottom-3 z-40 grid gap-2 rounded-[26px] border border-[var(--vf-border)] bg-[var(--vf-surface)]/95 p-2 shadow-2xl backdrop-blur lg:hidden vf-operational-bottom-nav" style={{ gridTemplateColumns: `repeat(${Math.max(Math.min(visibleNav.slice(0, 4).length, 4), 1)}, minmax(0, 1fr))` }}>
        {visibleNav.slice(0, 4).map((item) => {
          const Icon = item.icon
          const active = pathname === item.href || pathname?.startsWith(`${item.href}/`)
          return <Link key={item.href} href={item.href} className={`vf-operational-nav-item ${active ? 'is-active' : ''}`}><Icon size={18} /><span>{item.label}</span></Link>
        })}
      </nav>
      {panelOpen && <div className="fixed inset-0 z-[90] bg-slate-950/45 p-3 backdrop-blur-sm md:grid md:place-items-start md:justify-items-end md:p-5">
        <div className="ml-auto mt-16 w-full max-w-md rounded-[28px] bg-[var(--vf-surface)] p-4 text-[var(--vf-text)] shadow-2xl md:mt-0">
          <div className="flex items-center justify-between gap-3"><div><h2 className="text-lg font-black text-[var(--vf-text)]">Notificações</h2><p className="text-xs font-semibold text-[var(--vf-text3)]">Pedidos, cozinha, caixa e alertas do setor.</p></div><button onClick={() => setPanelOpen(false)} className="grid h-10 w-10 place-items-center rounded-2xl bg-slate-100"><X size={16} /></button></div>
          <div className="mt-4 max-h-[60dvh] space-y-3 overflow-y-auto pr-1">
            {notifications.map((notification) => <div key={notification.id} className="rounded-2xl border border-[var(--vf-border)] bg-[var(--vf-surface2)] p-3"><strong className="block text-sm text-[var(--vf-text)]">{notification.title}</strong><p className="mt-1 text-xs font-semibold leading-5 text-[var(--vf-text2)]">{notification.message}</p><div className="mt-3 grid grid-cols-2 gap-2"><button onClick={() => openNotification(notification)} className="rounded-xl bg-blue-600 px-3 py-2 text-xs font-black text-white">Abrir</button><button onClick={() => markAsRead(notification.id)} className="rounded-xl bg-white px-3 py-2 text-xs font-black text-slate-700 ring-1 ring-slate-200">Lida</button></div></div>)}
            {notifications.length === 0 && <div className="vf-empty py-8 text-center"><Bell size={22} /><strong className="mt-2 block">Nenhuma notificação pendente.</strong></div>}
          </div>
          {notifications.length > 0 && <button onClick={markAllAsRead} className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white"><CheckCheck size={16} /> Marcar todas como lidas</button>}
        </div>
      </div>}
    </main>
  )
}
