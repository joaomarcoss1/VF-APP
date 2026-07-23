'use client'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { DeliveryFinanceService } from '@/services/entregas'
import { fmtCurrency } from '@/lib/precificacao'
export default function PortalGanhosPage() {
  const { data } = useQuery({ queryKey: ['portal-earnings'], queryFn: DeliveryFinanceService.meusGanhos, retry: false })
  const rows = data ?? []
  const total = rows.reduce((a,g) => a + Number(g.amount || 0), 0)
  return <main className="min-h-dvh bg-[#070A0F] p-4 text-white"><div className="max-w-xl mx-auto space-y-4"><Link className="text-[#C9A84C]" href="/portal-entregador">Voltar</Link><h1 className="text-2xl font-black">Meus ganhos</h1><div className="rounded-[28px] bg-[var(--vf-card)]/[.06] border border-white/10 p-5"><span className="text-white/55">Total</span><b className="block text-3xl text-[#C9A84C]">{fmtCurrency(total)}</b></div>{rows.map(g => <div key={g.id} className="rounded-2xl bg-[var(--vf-card)]/[.05] border border-white/10 p-4 flex justify-between"><span>{new Date(g.earning_date).toLocaleDateString('pt-BR')} · {g.status}</span><b className="text-[#C9A84C]">{fmtCurrency(g.amount)}</b></div>)}</div></main>
}
