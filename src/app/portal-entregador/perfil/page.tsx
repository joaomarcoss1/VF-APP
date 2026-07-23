'use client'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { DeliveryDriverService } from '@/services/entregas'
import { fmtCurrency } from '@/lib/precificacao'
export default function PortalPerfilPage() {
  const { data: d } = useQuery({ queryKey: ['portal-driver'], queryFn: DeliveryDriverService.meuCadastro, retry: false })
  return <main className="min-h-dvh bg-[#070A0F] p-4 text-white"><div className="max-w-xl mx-auto space-y-4"><Link className="text-[#C9A84C]" href="/portal-entregador">Voltar</Link><h1 className="text-2xl font-black">Meu perfil</h1><div className="rounded-[28px] bg-[var(--vf-card)]/[.06] border border-white/10 p-5 space-y-3"><p><span className="text-white/50">Nome</span><b className="block">{d?.name || '—'}</b></p><p><span className="text-white/50">Contato</span><b className="block">{d?.phone || d?.email || '—'}</b></p><p><span className="text-white/50">Veículo</span><b className="block">{d?.vehicle_type || '—'} {d?.vehicle_plate || ''}</b></p><p><span className="text-white/50">Valor padrão</span><b className="block text-[#C9A84C]">{fmtCurrency(d?.base_delivery_fee || 0)}</b></p></div></div></main>
}
