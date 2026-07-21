'use client'
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Header from '@/components/layout/Header'
import { Badge, Button, Card, Field, Input, Select } from '@/components/ui'
import { DeliveryDriverService, DeliveryFinanceService } from '@/services/entregas'
import { fmtCurrency } from '@/lib/precificacao'
import toast from 'react-hot-toast'

export default function RecibosEntregasPage() {
  const qc = useQueryClient()
  const [driverId, setDriverId] = useState('')
  const [periodStart, setPeriodStart] = useState(new Date().toISOString().split('T')[0])
  const [periodEnd, setPeriodEnd] = useState(new Date().toISOString().split('T')[0])
  const { data: drivers } = useQuery({ queryKey: ['delivery-drivers'], queryFn: DeliveryDriverService.listar, retry: false })
  const { data: recibos } = useQuery({ queryKey: ['delivery-receipts'], queryFn: () => DeliveryFinanceService.listarRecibos(), retry: false })
  const gerar = useMutation({ mutationFn: () => DeliveryFinanceService.gerarRecibo(driverId, periodStart, periodEnd, 'periodo'), onSuccess: () => { toast.success('Recibo gerado.'); qc.invalidateQueries({ queryKey: ['delivery-receipts'] }) }, onError: (e: Error) => toast.error(e.message) })
  return <div className="vf-fadein"><Header title="Recibos de entrega" /><div className="p-4 md:p-6 space-y-4"><div><h1 className="text-2xl font-bold text-[var(--vf-text)]">Recibos dos entregadores</h1><p className="text-sm text-[var(--vf-text2)]">Gere recibos por dia, semana, quinzena, mês ou período personalizado.</p></div><Card className="p-4 grid grid-cols-1 md:grid-cols-4 gap-3 items-end"><Field label="Entregador"><Select value={driverId} onChange={e => setDriverId(e.target.value)}><option value="">Selecione</option>{(drivers ?? []).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</Select></Field><Field label="Início"><Input type="date" value={periodStart} onChange={e => setPeriodStart(e.target.value)} /></Field><Field label="Fim"><Input type="date" value={periodEnd} onChange={e => setPeriodEnd(e.target.value)} /></Field><Button disabled={!driverId} loading={gerar.isPending} onClick={() => gerar.mutate()}>Gerar recibo</Button></Card><div className="grid grid-cols-1 lg:grid-cols-2 gap-4">{(recibos ?? []).map((r:any) => <Card key={r.id} className="p-4 space-y-3"><div className="flex justify-between"><div><b>{r.driver?.name || 'Entregador'}</b><p className="text-xs text-[var(--vf-text3)]">{new Date(r.period_start).toLocaleDateString('pt-BR')} até {new Date(r.period_end).toLocaleDateString('pt-BR')}</p></div><Badge color={r.status === 'paid' ? 'green' : 'blue'}>{r.status}</Badge></div><div className="grid grid-cols-2 gap-2"><div className="rounded-xl bg-[var(--vf-surface2)] p-3"><span className="text-xs text-[var(--vf-text3)]">Entregas</span><b className="block">{r.total_deliveries}</b></div><div className="rounded-xl bg-[var(--vf-surface2)] p-3"><span className="text-xs text-[var(--vf-text3)]">Total</span><b className="block text-[var(--vf-primary)]">{fmtCurrency(r.total_amount || 0)}</b></div></div><Button size="sm" variant="secondary" onClick={() => window.print()}>Imprimir recibo</Button></Card>)}</div></div></div>
}
