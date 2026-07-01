'use client'

import { useQuery } from '@tanstack/react-query'
import Header from '@/components/layout/Header'
import { Alert, Badge, Button, Card, Empty, Skeleton } from '@/components/ui'
import { NotasFiscaisService } from '@/services'
import { fmtCurrency } from '@/lib/precificacao'
import Link from 'next/link'

export default function NotasPage() {
  const { data: notas, isLoading } = useQuery({ queryKey: ['notas-fiscais'], queryFn: () => NotasFiscaisService.listar(60) })
  return (
    <div className="vf-fadein">
      <Header title="Notas e abastecimento" />
      <div className="p-4 md:p-6 space-y-5">
        <Alert type="info">Central de notas de compra, importação de abastecimento e base fiscal. A emissão fiscal oficial deve ser integrada posteriormente com provedor fiscal/SEFAZ.</Alert>
        <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
          <div><h2 className="text-lg font-semibold">Histórico de notas</h2><p className="text-sm text-[var(--vf-text2)]">Controle de compras, fretes, impostos e itens abastecidos.</p></div>
          <div className="flex gap-2"><Button variant="secondary" onClick={() => NotasFiscaisService.exportarModeloCSV()}>Baixar modelo Excel</Button><Link href="/estoque"><Button>Lançar nota no estoque</Button></Link></div>
        </div>
        <Card className="overflow-hidden">
          {isLoading ? <div className="p-4"><Skeleton className="h-40" /></div> : (notas?.length ?? 0) === 0 ? <Empty icon="🧾" title="Nenhuma nota registrada" description="Lance uma nota no módulo Estoque para abastecer insumos ou produtos finais." action={<Link href="/estoque"><Button>Lançar nota</Button></Link>} /> : <div className="overflow-x-auto"><table className="vf-table min-w-[860px]"><thead><tr><th>Número</th><th>Fornecedor</th><th>Entrada</th><th>Produtos</th><th>Frete</th><th>Impostos</th><th>Total</th><th>Status</th></tr></thead><tbody>{notas!.map(n => <tr key={n.id}><td className="font-medium text-[var(--vf-text)]">{n.numero || '—'}</td><td>{n.fornecedor_nome || '—'}</td><td>{n.data_entrada ? new Date(n.data_entrada).toLocaleDateString('pt-BR') : '—'}</td><td>{fmtCurrency(Number(n.valor_produtos || 0))}</td><td>{fmtCurrency(Number(n.valor_frete || 0))}</td><td>{fmtCurrency(Number(n.valor_impostos || 0))}</td><td className="text-[var(--vf-primary)] font-semibold">{fmtCurrency(Number(n.valor_total || 0))}</td><td><Badge color={n.status === 'cancelada' ? 'red' : 'blue'}>{n.status}</Badge></td></tr>)}</tbody></table></div>}
        </Card>
      </div>
    </div>
  )
}
