'use client'

import { useQuery } from '@tanstack/react-query'
import Header from '@/components/layout/Header'
import { Alert, Badge, Button, Card, Empty, Skeleton } from '@/components/ui'
import { FiscalService, NotasFiscaisService } from '@/services'
import { fmtCurrency } from '@/lib/precificacao'
import Link from 'next/link'

export default function NotasPage() {
  const { data: notas, isLoading } = useQuery({ queryKey: ['notas-fiscais'], queryFn: () => NotasFiscaisService.listar(60) })
  const { data: fiscal } = useQuery({ queryKey: ['fiscal-diagnostico'], queryFn: () => FiscalService.diagnostico() })
  return (
    <div className="vf-fadein">
      <Header title="Notas e abastecimento" />
      <div className="vf-page-container space-y-5">
        <Alert type="info">Central de notas de compra, importação de abastecimento e base fiscal. A emissão fiscal oficial deve ser integrada com provedor fiscal/certificado antes de uso real em produção.</Alert>

        <Card className="p-4 vf-gradient-border">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <div className="text-[12px] text-[var(--vf-text3)] uppercase tracking-wide mb-1">Prontidão fiscal</div>
              <h2 className="text-lg font-semibold text-[var(--vf-text)]">Estrutura fiscal preparada, emissão oficial controlada</h2>
              <p className="text-sm text-[var(--vf-text3)] mt-1">Use este módulo para controle interno de notas/abastecimento. Para NF-e/NFC-e/NFS-e oficial, configure provedor e certificado em Configurações.</p>
            </div>
            <Badge color={fiscal?.pronto ? 'green' : 'amber'}>{fiscal?.pronto ? 'Pronta para homologação' : 'Pendente de configuração'}</Badge>
          </div>
          {(fiscal?.mensagens?.length ?? 0) > 0 && <div className="grid md:grid-cols-2 gap-2 mt-4">{fiscal!.mensagens.map((m, i) => <Alert key={i} type="warn">{m}</Alert>)}</div>}
        </Card>

        <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
          <div><h2 className="text-lg font-semibold text-[var(--vf-text)]">Histórico de notas</h2><p className="text-sm text-[var(--vf-text2)]">Controle de compras, fretes, impostos e itens abastecidos.</p></div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2"><Button variant="secondary" onClick={() => NotasFiscaisService.exportarModeloCSV()}>Modelo Excel</Button><Link href="/configuracoes"><Button variant="secondary" fullWidth>Configurar fiscal</Button></Link><Link href="/estoque"><Button fullWidth>Lançar nota</Button></Link></div>
        </div>

        <Card className="overflow-hidden">
          {isLoading ? <div className="p-4"><Skeleton className="h-40" /></div> : (notas?.length ?? 0) === 0 ? <Empty icon="🧾" title="Nenhuma nota registrada" description="Lance uma nota no módulo Estoque para abastecer insumos ou produtos finais." action={<Link href="/estoque"><Button>Lançar nota</Button></Link>} /> : <>
            <div className="md:hidden p-3 space-y-3">{notas!.map(n => <Card key={n.id} className="p-3 bg-[var(--vf-surface2)]">
              <div className="flex items-start justify-between gap-2"><div><div className="font-semibold text-[var(--vf-text)]">NF {n.numero || 'sem número'}</div><div className="text-xs text-[var(--vf-text3)]">{n.fornecedor_nome || 'Fornecedor não informado'}</div></div><Badge color={n.status === 'cancelada' ? 'red' : 'blue'}>{n.status}</Badge></div>
              <div className="grid grid-cols-2 gap-2 mt-3 text-xs"><div><span className="text-[var(--vf-text3)] block">Entrada</span><b>{n.data_entrada ? new Date(n.data_entrada).toLocaleDateString('pt-BR') : '—'}</b></div><div><span className="text-[var(--vf-text3)] block">Total</span><b className="text-[var(--vf-primary)]">{fmtCurrency(Number(n.valor_total || 0))}</b></div></div>
            </Card>)}</div>
            <div className="hidden md:block vf-table-wrap"><table className="vf-table min-w-[860px]"><thead><tr><th>Número</th><th>Fornecedor</th><th>Entrada</th><th>Produtos</th><th>Frete</th><th>Impostos</th><th>Total</th><th>Status</th></tr></thead><tbody>{notas!.map(n => <tr key={n.id}><td className="font-medium text-[var(--vf-text)]">{n.numero || '—'}</td><td>{n.fornecedor_nome || '—'}</td><td>{n.data_entrada ? new Date(n.data_entrada).toLocaleDateString('pt-BR') : '—'}</td><td>{fmtCurrency(Number(n.valor_produtos || 0))}</td><td>{fmtCurrency(Number(n.valor_frete || 0))}</td><td>{fmtCurrency(Number(n.valor_impostos || 0))}</td><td className="text-[var(--vf-primary)] font-semibold">{fmtCurrency(Number(n.valor_total || 0))}</td><td><Badge color={n.status === 'cancelada' ? 'red' : 'blue'}>{n.status}</Badge></td></tr>)}</tbody></table></div>
          </>}
        </Card>
      </div>
    </div>
  )
}
