'use client'
import type { ReactNode } from 'react'
import Link from 'next/link'
import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { DeliveryDriverService, DeliveryFinanceService, DeliveryService } from '@/services/entregas'
import { DeliveryOfflineDB } from '@/lib/delivery-offline'
import { fmtCurrency } from '@/lib/precificacao'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import toast from 'react-hot-toast'

function PortalCard({ children, className='' }: { children: ReactNode; className?: string }) { return <div className={`rounded-[28px] border border-white/10 bg-white/[.06] backdrop-blur p-4 shadow-2xl shadow-black/20 ${className}`}>{children}</div> }

export default function PortalEntregadorPage() {
  const online = useOnlineStatus()
  const { data: driver } = useQuery({ queryKey: ['portal-driver'], queryFn: DeliveryDriverService.meuCadastro, retry: false })
  const { data: entregas, refetch } = useQuery({ queryKey: ['portal-deliveries'], queryFn: DeliveryService.listarPortal, refetchInterval: 30000, retry: false })
  const { data: ganhos } = useQuery({ queryKey: ['portal-earnings'], queryFn: DeliveryFinanceService.meusGanhos, retry: false })
  useEffect(() => { if (online) DeliveryOfflineDB.syncPending().then(r => { if (r.synced) { toast.success(`${r.synced} entrega(s) offline sincronizada(s).`); refetch() } }).catch(() => null) }, [online, refetch])
  const rows = entregas ?? []
  const disponiveis = rows.filter(d => ['pending','offered'].includes(d.status))
  const andamento = rows.filter(d => ['accepted','picked_up','on_route','sync_pending'].includes(d.status))
  const ganhosHoje = (ganhos ?? []).filter(g => g.earning_date === new Date().toISOString().split('T')[0]).reduce((a,g) => a + Number(g.amount || 0), 0)
  return <main className="min-h-dvh p-4 pb-24 bg-[radial-gradient(circle_at_top_left,rgba(201,168,76,.22),transparent_32%),#070A0F]"><div className="max-w-xl mx-auto space-y-4"><header className="flex items-center justify-between pt-2"><div><span className="text-xs uppercase tracking-[.28em] text-[#C9A84C]">VF Nexus Entregas</span><h1 className="text-2xl font-black mt-1">Olá, {driver?.name?.split(' ')[0] || 'entregador'}</h1></div><span className={`rounded-full px-3 py-1 text-xs font-bold border ${online ? 'bg-emerald-400/10 border-emerald-400/30 text-emerald-300' : 'bg-amber-400/10 border-amber-400/30 text-amber-300'}`}>{online ? 'Online' : 'Offline'}</span></header><PortalCard><div className="grid grid-cols-3 gap-2 text-center"><div><span className="text-xs text-white/55">Ganhos hoje</span><b className="block text-[#C9A84C] text-lg">{fmtCurrency(ganhosHoje)}</b></div><div><span className="text-xs text-white/55">Disponíveis</span><b className="block text-white text-lg">{disponiveis.length}</b></div><div><span className="text-xs text-white/55">Em andamento</span><b className="block text-white text-lg">{andamento.length}</b></div></div></PortalCard>{disponiveis.length > 0 && <PortalCard className="border-[#C9A84C]/40"><div className="flex items-center justify-between"><div><b>Nova entrega disponível</b><p className="text-sm text-white/60">Toque para aceitar e abrir rota.</p></div><Link href="/portal-entregador/entregas" className="rounded-2xl bg-[#C9A84C] text-black font-bold px-4 py-2">Ver</Link></div></PortalCard>}<div className="grid grid-cols-2 gap-3"><Link href="/portal-entregador/entregas"><PortalCard><b className="block">Entregas</b><span className="text-sm text-white/55">Aceitar e acompanhar</span></PortalCard></Link><Link href="/portal-entregador/ganhos"><PortalCard><b className="block">Ganhos</b><span className="text-sm text-white/55">Dia, semana e mês</span></PortalCard></Link><Link href="/portal-entregador/recibos"><PortalCard><b className="block">Recibos</b><span className="text-sm text-white/55">Pagamentos</span></PortalCard></Link><Link href="/portal-entregador/perfil"><PortalCard><b className="block">Perfil</b><span className="text-sm text-white/55">Dados e veículo</span></PortalCard></Link></div>{andamento.map(d => <Link key={d.id} href={`/portal-entregador/entrega/${d.id}`}><PortalCard><span className="text-xs text-[#C9A84C]">Em andamento · {d.code}</span><b className="block mt-1">{d.customer_name}</b><p className="text-sm text-white/60 line-clamp-2">{d.delivery_address}</p></PortalCard></Link>)}</div></main>
}
