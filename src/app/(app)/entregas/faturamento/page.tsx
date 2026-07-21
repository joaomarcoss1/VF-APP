'use client'
import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Header from '@/components/layout/Header'
import { Card, Field, Select } from '@/components/ui'
import { DeliveryDriverService, DeliveryFinanceService } from '@/services/entregas'
import { fmtCurrency } from '@/lib/precificacao'

export default function FaturamentoEntregasPage() {
  const [driverId, setDriverId] = useState('')
  const { data: drivers } = useQuery({ queryKey: ['delivery-drivers'], queryFn: DeliveryDriverService.listar, retry: false })
  const { data: ganhos } = useQuery({ queryKey: ['delivery-earnings', driverId], queryFn: () => DeliveryFinanceService.ganhosDoEntregador(driverId || undefined), retry: false })
  const resumo = useMemo(() => ({ total: (ganhos ?? []).reduce((a,g) => a + Number(g.amount || 0), 0), qtd: ganhos?.length || 0, pagos: (ganhos ?? []).filter(g => g.status === 'paid').reduce((a,g) => a + Number(g.amount || 0), 0) }), [ganhos])
  return <div className="vf-fadein"><Header title="Faturamento de entregas" /><div className="p-4 md:p-6 space-y-4"><div><h1 className="text-2xl font-bold text-[var(--vf-text)]">Faturamento dos entregadores</h1><p className="text-sm text-[var(--vf-text2)]">Ganhos por entregador, pagamentos pendentes e totais por período.</p></div><Card className="p-4"><Field label="Entregador"><Select value={driverId} onChange={e => setDriverId(e.target.value)}><option value="">Todos</option>{(drivers ?? []).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</Select></Field></Card><div className="grid grid-cols-1 md:grid-cols-3 gap-3"><Card className="p-4"><span className="text-xs text-[var(--vf-text3)]">Total gerado</span><b className="block text-2xl text-[var(--vf-primary)]">{fmtCurrency(resumo.total)}</b></Card><Card className="p-4"><span className="text-xs text-[var(--vf-text3)]">Entregas</span><b className="block text-2xl text-[var(--vf-secondary)]">{resumo.qtd}</b></Card><Card className="p-4"><span className="text-xs text-[var(--vf-text3)]">Pago</span><b className="block text-2xl text-[var(--vf-success)]">{fmtCurrency(resumo.pagos)}</b></Card></div><Card className="p-0 overflow-hidden"><div className="overflow-x-auto"><table className="vf-table w-full"><thead><tr><th>Data</th><th>Entrega</th><th>Entregador</th><th>Status</th><th className="text-right">Valor</th></tr></thead><tbody>{(ganhos ?? []).map((g:any) => <tr key={g.id}><td>{new Date(g.earning_date).toLocaleDateString('pt-BR')}</td><td>{g.delivery?.code || g.delivery_id.slice(0,8)}</td><td>{(drivers ?? []).find(d => d.id === g.driver_id)?.name || '—'}</td><td>{g.status}</td><td className="text-right font-semibold text-[var(--vf-primary)]">{fmtCurrency(g.amount || 0)}</td></tr>)}</tbody></table></div></Card></div></div>
}
