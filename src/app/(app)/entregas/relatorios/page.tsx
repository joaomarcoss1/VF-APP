'use client'
import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import Header from '@/components/layout/Header'
import { Card } from '@/components/ui'
import { DeliveryService } from '@/services/entregas'
import { fmtCurrency } from '@/lib/precificacao'

export default function RelatoriosEntregasPage() {
  const { data } = useQuery({ queryKey: ['delivery-reports'], queryFn: () => DeliveryService.listarEmpresa('todos'), retry: false })
  const rows = data ?? []
  const resumo = useMemo(() => {
    const delivered = rows.filter(d => d.status === 'delivered')
    return { total: rows.length, delivered: delivered.length, canceled: rows.filter(d => d.status === 'canceled').length, offline: rows.filter(d => d.status === 'sync_pending' || d.synced_at).length, valor: delivered.reduce((a,d) => a + Number(d.delivery_fee || 0), 0) }
  }, [rows])
  return <div className="vf-fadein"><Header title="Relatórios de entregas" /><div className="p-4 md:p-6 space-y-4"><h1 className="text-2xl font-bold">Desempenho de entregas</h1><div className="grid grid-cols-2 md:grid-cols-5 gap-3"><Card className="p-4"><span className="text-xs text-[var(--vf-text3)]">Total</span><b className="block text-2xl text-[var(--vf-primary)]">{resumo.total}</b></Card><Card className="p-4"><span className="text-xs text-[var(--vf-text3)]">Entregues</span><b className="block text-2xl text-[var(--vf-success)]">{resumo.delivered}</b></Card><Card className="p-4"><span className="text-xs text-[var(--vf-text3)]">Canceladas</span><b className="block text-2xl text-[var(--vf-error)]">{resumo.canceled}</b></Card><Card className="p-4"><span className="text-xs text-[var(--vf-text3)]">Offline/sync</span><b className="block text-2xl text-[var(--vf-secondary)]">{resumo.offline}</b></Card><Card className="p-4"><span className="text-xs text-[var(--vf-text3)]">Valor pago</span><b className="block text-xl text-[var(--vf-primary)]">{fmtCurrency(resumo.valor)}</b></Card></div><Card className="p-4"><h2 className="font-semibold mb-3">Ranking e eficiência</h2><p className="text-sm text-[var(--vf-text2)]">Os indicadores respeitam empresa_id e usam apenas entregas da empresa atual. Exporte os dados em PDF/XLSX pelos relatórios gerais quando necessário.</p></Card></div></div>
}
