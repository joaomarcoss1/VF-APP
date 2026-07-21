'use client'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Header from '@/components/layout/Header'
import { Alert, Badge, Button, Card, Empty, Field, Select } from '@/components/ui'
import { DeliveryService, deliveryMapsUrl } from '@/services/entregas'
import { fmtCurrency } from '@/lib/precificacao'
import type { Delivery } from '@/types'
import toast from 'react-hot-toast'

const statusLabel: Record<string,string> = { pending: 'Pendente', offered: 'Oferecida', accepted: 'Aceita', picked_up: 'Retirada', on_route: 'Em rota', delivered: 'Entregue', canceled: 'Cancelada', failed: 'Falha', sync_pending: 'Sync pendente' }

export default function EntregasPage() {
  const qc = useQueryClient()
  const [status, setStatus] = useState('todos')
  const { data, isLoading, error } = useQuery({ queryKey: ['deliveries-company', status], queryFn: () => DeliveryService.listarEmpresa(status), retry: false })
  const cancelar = useMutation({ mutationFn: (id: string) => DeliveryService.cancelar(id, 'Cancelada pelo painel da empresa'), onSuccess: () => { toast.success('Entrega cancelada.'); qc.invalidateQueries({ queryKey: ['deliveries-company'] }) }, onError: (e: Error) => toast.error(e.message) })
  const rows = data ?? []
  const kpis = useMemo(() => ({ total: rows.length, andamento: rows.filter(d => ['accepted','picked_up','on_route'].includes(d.status)).length, entregues: rows.filter(d => d.status === 'delivered').length, valor: rows.reduce((a,d) => a + Number(d.delivery_fee || 0), 0) }), [rows])

  return <div className="vf-fadein"><Header title="Entregas" /><div className="p-4 md:p-6 space-y-5">
    <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3"><div><h1 className="text-2xl font-bold text-[var(--vf-text)]">VF Nexus Entregas</h1><p className="text-sm text-[var(--vf-text2)]">Controle entregadores, rotas pelo Google Maps, faturamento, recibos e entregas offline.</p></div><div className="flex flex-wrap gap-2"><Link className="vf-btn inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold text-white bg-[linear-gradient(135deg,var(--vf-primary),var(--vf-secondary))]" href="/entregas/nova">Nova entrega</Link><Link className="vf-btn inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold border border-[var(--vf-border)] text-[var(--vf-primary)]" href="/entregas/entregadores">Entregadores</Link><Link className="vf-btn inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold border border-[var(--vf-border)] text-[var(--vf-primary)]" href="/entregas/faturamento">Faturamento</Link></div></div>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3"><Card className="p-4"><span className="text-xs text-[var(--vf-text3)]">Total</span><b className="block text-2xl text-[var(--vf-primary)]">{kpis.total}</b></Card><Card className="p-4"><span className="text-xs text-[var(--vf-text3)]">Em andamento</span><b className="block text-2xl text-[var(--vf-secondary)]">{kpis.andamento}</b></Card><Card className="p-4"><span className="text-xs text-[var(--vf-text3)]">Entregues</span><b className="block text-2xl text-[var(--vf-success)]">{kpis.entregues}</b></Card><Card className="p-4"><span className="text-xs text-[var(--vf-text3)]">Valor em entregas</span><b className="block text-xl text-[var(--vf-primary)]">{fmtCurrency(kpis.valor)}</b></Card></div>
    <Card className="p-4"><Field label="Filtrar status"><Select value={status} onChange={e => setStatus(e.target.value)}><option value="todos">Todos</option>{Object.entries(statusLabel).map(([k,v]) => <option key={k} value={k}>{v}</option>)}</Select></Field></Card>
    {error && <Alert type="error">{(error as Error).message}</Alert>}
    {isLoading ? <Card className="p-6 text-sm text-[var(--vf-text3)]">Carregando entregas...</Card> : !rows.length ? <Empty icon="▣" title="Nenhuma entrega encontrada" description="Crie entregas avulsas ou atribua pedidos a entregadores ativos." /> : <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">{rows.map((d: Delivery) => <Card key={d.id} className="p-4 space-y-3"><div className="flex justify-between gap-3"><div><div className="flex items-center gap-2"><b className="text-[var(--vf-text)]">{d.code}</b><Badge color={d.status === 'delivered' ? 'green' : d.priority === 'urgente' ? 'red' : 'blue'}>{statusLabel[d.status] || d.status}</Badge></div><p className="text-sm text-[var(--vf-text2)] mt-1">{d.customer_name} · {d.order_type}</p><p className="text-xs text-[var(--vf-text3)] mt-1 line-clamp-2">{d.delivery_address}</p></div><b className="text-[var(--vf-primary)] whitespace-nowrap">{fmtCurrency(d.delivery_fee || 0)}</b></div><div className="flex flex-wrap gap-2 text-xs text-[var(--vf-text3)]"><span>Entregador: {(d as any).driver?.name || 'Disponível'}</span>{d.accepted_at && <span>• Aceita: {new Date(d.accepted_at).toLocaleString('pt-BR')}</span>}</div><div className="flex flex-wrap gap-2"><a target="_blank" href={deliveryMapsUrl(d)} className="inline-flex items-center justify-center rounded-xl px-3 py-2 text-xs font-semibold border border-[var(--vf-border)] text-[var(--vf-primary)]">Google Maps</a>{!['delivered','canceled'].includes(d.status) && <Button size="sm" variant="danger" loading={cancelar.isPending} onClick={() => cancelar.mutate(d.id)}>Cancelar</Button>}</div></Card>)}</div>}
  </div></div>
}
