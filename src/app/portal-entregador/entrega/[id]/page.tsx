'use client'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { DeliveryService, deliveryMapsUrl } from '@/services/entregas'
import { DeliveryOfflineDB } from '@/lib/delivery-offline'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { fmtCurrency } from '@/lib/precificacao'
import toast from 'react-hot-toast'

export default function PortalEntregaDetalhePage() {
  const { id } = useParams<{ id: string }>()
  const online = useOnlineStatus()
  const qc = useQueryClient()
  const { data: entrega } = useQuery({ queryKey: ['delivery-detail', id], queryFn: () => DeliveryService.buscar(id), retry: false })
  const aceitar = useMutation({ mutationFn: () => DeliveryService.aceitar(id), onSuccess: () => { toast.success('Entrega aceita.'); qc.invalidateQueries({ queryKey: ['delivery-detail', id] }) }, onError: (e: Error) => toast.error(e.message) })
  const retirar = useMutation({ mutationFn: () => DeliveryService.marcarRetirado(id), onSuccess: () => { toast.success('Pedido marcado como retirado.'); qc.invalidateQueries({ queryKey: ['delivery-detail', id] }) }, onError: (e: Error) => toast.error(e.message) })
  async function finalizar() {
    if (!entrega) return
    const reported_at = new Date().toISOString()
    if (!online) {
      await DeliveryOfflineDB.saveFinish(entrega, { reported_at, notes: 'Finalizada sem internet pelo portal do entregador.' })
      toast.success('Entrega finalizada offline. Será sincronizada quando a internet voltar.')
      return
    }
    try { await DeliveryService.finalizarOnline(entrega.id, reported_at); toast.success('Entrega finalizada.'); qc.invalidateQueries({ queryKey: ['delivery-detail', id] }) } catch (e:any) { toast.error(e.message) }
  }
  if (!entrega) return <main className="min-h-dvh bg-[#070A0F] p-4 text-white"><Link href="/portal-entregador">Voltar</Link><p className="mt-8 text-white/60">Carregando entrega...</p></main>
  return <main className="min-h-dvh bg-[#070A0F] p-4"><div className="max-w-xl mx-auto space-y-4"><div className="flex items-center justify-between"><Link className="text-[#C9A84C]" href="/portal-entregador/entregas">Voltar</Link><span className={`rounded-full px-3 py-1 text-xs border ${online ? 'text-emerald-300 border-emerald-400/30' : 'text-amber-300 border-amber-400/30'}`}>{online ? 'Online' : 'Offline'}</span></div><section className="rounded-[30px] bg-[var(--vf-card)]/[.06] border border-white/10 p-5 space-y-4"><div><span className="text-xs text-[#C9A84C]">{entrega.code} · {entrega.status}</span><h1 className="text-2xl font-black text-white mt-1">{entrega.customer_name}</h1><p className="text-white/60 text-sm">{entrega.order_type} · {fmtCurrency(entrega.delivery_fee || 0)}</p></div><div className="rounded-2xl bg-black/20 p-4"><b className="text-white">Endereço</b><p className="text-white/70 text-sm mt-1">{entrega.delivery_address}</p>{entrega.delivery_reference && <p className="text-white/45 text-xs mt-2">Referência: {entrega.delivery_reference}</p>}</div><div className="grid grid-cols-2 gap-2"><a className="rounded-2xl bg-[#C9A84C] text-black font-bold text-center py-3" target="_blank" href={deliveryMapsUrl(entrega)}>Abrir Google Maps</a>{entrega.customer_phone && <a className="rounded-2xl border border-[#C9A84C]/50 text-[#C9A84C] font-bold text-center py-3" href={`https://wa.me/${String(entrega.customer_phone).replace(/\D/g,'')}`}>WhatsApp</a>}</div>{['pending','offered'].includes(entrega.status) && <button onClick={() => aceitar.mutate()} className="w-full rounded-2xl bg-[var(--vf-card)] text-black font-bold py-3">Aceitar entrega</button>}{entrega.status === 'accepted' && <button onClick={() => retirar.mutate()} className="w-full rounded-2xl bg-blue-500 text-white font-bold py-3">Marcar como retirado</button>}{['accepted','picked_up','on_route','sync_pending'].includes(entrega.status) && <button onClick={finalizar} className="w-full rounded-2xl bg-emerald-500 text-white font-bold py-3">Finalizar entrega</button>}{!online && <p className="text-xs text-amber-300">Sem internet: a finalização será salva localmente com horário real e sincronizada depois.</p>}</section></div></main>
}
