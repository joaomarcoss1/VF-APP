'use client'
import Link from 'next/link'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { DeliveryService } from '@/services/entregas'
import { fmtCurrency } from '@/lib/precificacao'
import toast from 'react-hot-toast'

export default function PortalEntregasPage() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ['portal-deliveries'], queryFn: DeliveryService.listarPortal, retry: false, refetchInterval: 25000 })
  const aceitar = useMutation({ mutationFn: DeliveryService.aceitar, onSuccess: (d) => { toast.success('Entrega aceita.'); qc.invalidateQueries({ queryKey: ['portal-deliveries'] }); location.href = `/portal-entregador/entrega/${d.id}` }, onError: (e: Error) => toast.error(e.message) })
  const rows = data ?? []
  return <main className="min-h-dvh p-4 bg-[#070A0F]"><div className="max-w-xl mx-auto space-y-4"><div className="flex items-center justify-between"><div><h1 className="text-2xl font-black text-white">Entregas</h1><p className="text-sm text-white/55">Disponíveis e em andamento</p></div><Link className="text-[#C9A84C] text-sm" href="/portal-entregador">Início</Link></div>{isLoading && <div className="text-white/60">Carregando...</div>}{rows.map(d => <div key={d.id} className="rounded-[26px] bg-[var(--vf-card)]/[.06] border border-white/10 p-4 space-y-3"><div className="flex justify-between gap-3"><div><span className="text-xs text-[#C9A84C]">{d.code} · {d.order_type}</span><b className="block text-white mt-1">{d.customer_name}</b><p className="text-sm text-white/60 line-clamp-2">{d.delivery_address}</p></div><b className="text-[#C9A84C]">{fmtCurrency(d.delivery_fee || 0)}</b></div><p className="text-xs text-white/50">{d.order_description || d.delivery_reference || 'Sem observações adicionais.'}</p>{['pending','offered'].includes(d.status) ? <button onClick={() => aceitar.mutate(d.id)} className="w-full rounded-2xl bg-[#C9A84C] text-black font-bold py-3">Aceitar entrega</button> : <Link className="block text-center rounded-2xl border border-[#C9A84C]/40 text-[#C9A84C] font-bold py-3" href={`/portal-entregador/entrega/${d.id}`}>Abrir entrega</Link>}</div>)}</div></main>
}
