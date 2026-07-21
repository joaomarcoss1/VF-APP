'use client'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { DeliveryFinanceService } from '@/services/entregas'
import { fmtCurrency } from '@/lib/precificacao'
export default function PortalRecibosPage() {
  const { data } = useQuery({ queryKey: ['portal-receipts'], queryFn: DeliveryFinanceService.meusRecibos, retry: false })
  return <main className="min-h-dvh bg-[#070A0F] p-4 text-white"><div className="max-w-xl mx-auto space-y-4"><Link className="text-[#C9A84C]" href="/portal-entregador">Voltar</Link><h1 className="text-2xl font-black">Meus recibos</h1>{(data ?? []).map(r => <div key={r.id} className="rounded-[24px] bg-white/[.06] border border-white/10 p-4"><b>{new Date(r.period_start).toLocaleDateString('pt-BR')} até {new Date(r.period_end).toLocaleDateString('pt-BR')}</b><p className="text-white/60 text-sm">{r.total_deliveries} entregas</p><b className="text-[#C9A84C]">{fmtCurrency(r.total_amount || 0)}</b></div>)}</div></main>
}
