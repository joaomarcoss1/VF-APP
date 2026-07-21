'use client'

import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Header from '@/components/layout/Header'
import { Alert, Badge, Button, Card, Empty, Field, Input, Skeleton, Textarea } from '@/components/ui'
import { FechamentoService } from '@/services'
import { fmtCurrency } from '@/lib/precificacao'
import type { FechamentoDiario } from '@/types'
import toast from 'react-hot-toast'

const hoje = () => new Date().toISOString().split('T')[0]

export default function FechamentoPage() {
  const qc = useQueryClient()
  const [dataFechamento, setDataFechamento] = useState(hoje())
  const [observacoes, setObservacoes] = useState('')
  const { data, isLoading, error } = useQuery({ queryKey: ['fechamentos'], queryFn: () => FechamentoService.listar(60) })
  const { data: resumo, isLoading: loadingResumo, refetch } = useQuery({ queryKey: ['fechamento-resumo', dataFechamento], queryFn: () => FechamentoService.gerarResumo(dataFechamento) })
  const fechamentos = data ?? []
  const ultimo = useMemo(() => fechamentos[0], [fechamentos])

  const salvar = useMutation({
    mutationFn: () => FechamentoService.salvar({ ...(resumo as any), data_fechamento: dataFechamento, observacoes, status: 'fechado' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['fechamentos'] }); toast.success('Fechamento salvo com sucesso.') },
    onError: (e: Error) => toast.error(e.message),
  })

  return <div className="vf-fadein">
    <Header title="Fechamento diário" />
    <div className="p-4 md:p-6 space-y-5">
      <Alert type="info">Faça a conferência do dia por forma de pagamento, registre observações e mantenha histórico de fechamento para gestão financeira profissional.</Alert>
      <Card className="p-4 grid grid-cols-1 md:grid-cols-[220px_1fr_auto] gap-4 items-end"><Field label="Data do fechamento"><Input type="date" value={dataFechamento} onChange={e => setDataFechamento(e.target.value)} /></Field><Field label="Observações do caixa"><Textarea value={observacoes} onChange={e => setObservacoes(e.target.value)} placeholder="Divergências, sangria, vendas externas, observações do dia..." /></Field><div className="flex gap-2"><Button variant="secondary" onClick={() => refetch()}>Recalcular</Button><Button loading={salvar.isPending} disabled={!resumo} onClick={() => salvar.mutate()}>Fechar dia</Button></div></Card>
      {loadingResumo ? <Skeleton className="h-32" /> : resumo && <div className="grid grid-cols-2 md:grid-cols-5 gap-3"><Card className="p-4"><div className="text-xs text-[var(--vf-text2)] uppercase">Entradas</div><div className="text-xl text-[var(--vf-success)] font-semibold">{fmtCurrency(resumo.total_receitas)}</div></Card><Card className="p-4"><div className="text-xs text-[var(--vf-text2)] uppercase">Saídas</div><div className="text-xl text-[var(--vf-error)] font-semibold">{fmtCurrency(resumo.total_despesas)}</div></Card><Card className="p-4"><div className="text-xs text-[var(--vf-text2)] uppercase">Saldo</div><div className={`text-xl font-semibold ${resumo.saldo_final >= 0 ? 'text-[var(--vf-success)]' : 'text-[var(--vf-error)]'}`}>{fmtCurrency(resumo.saldo_final)}</div></Card><Card className="p-4"><div className="text-xs text-[var(--vf-text2)] uppercase">Pix</div><div className="text-xl text-[var(--vf-primary)] font-semibold">{fmtCurrency(resumo.pix)}</div></Card><Card className="p-4"><div className="text-xs text-[var(--vf-text2)] uppercase">Dinheiro</div><div className="text-xl text-[var(--vf-secondary)] font-semibold">{fmtCurrency(resumo.dinheiro)}</div></Card></div>}
      {ultimo && <Alert type="success">Último fechamento registrado: {new Date(`${ultimo.data_fechamento}T00:00:00`).toLocaleDateString('pt-BR')} com saldo de <b>{fmtCurrency(ultimo.saldo_final)}</b>.</Alert>}
      {error && <Alert type="error">{(error as Error).message}</Alert>}
      {isLoading ? <Skeleton className="h-52" /> : !fechamentos.length ? <Empty icon="🔐" title="Nenhum fechamento salvo" description="Faça seu primeiro fechamento diário para acompanhar caixa e pagamentos." /> : <Card className="overflow-hidden"><div className="hidden md:block overflow-x-auto"><table className="vf-table min-w-[880px]"><thead><tr><th>Data</th><th>Vendas</th><th>Receitas</th><th>Despesas</th><th>Saldo</th><th>Pix</th><th>Cartões</th><th>Status</th></tr></thead><tbody>{fechamentos.map((f: FechamentoDiario) => <tr key={f.id}><td>{new Date(`${f.data_fechamento}T00:00:00`).toLocaleDateString('pt-BR')}</td><td>{fmtCurrency(f.total_vendas)}</td><td className="text-[var(--vf-success)]">{fmtCurrency(f.total_receitas)}</td><td className="text-[var(--vf-error)]">{fmtCurrency(f.total_despesas)}</td><td className={f.saldo_final >= 0 ? 'text-[var(--vf-success)]' : 'text-[var(--vf-error)]'}>{fmtCurrency(f.saldo_final)}</td><td>{fmtCurrency(f.pix)}</td><td>{fmtCurrency(Number(f.cartao_credito || 0) + Number(f.cartao_debito || 0))}</td><td><Badge color={f.status === 'fechado' ? 'green' : 'amber'}>{f.status}</Badge></td></tr>)}</tbody></table></div><div className="md:hidden p-3 space-y-3">{fechamentos.map(f => <Card key={f.id} className="p-3 bg-[var(--vf-surface2)]"><div className="flex justify-between"><div><b className="text-[var(--vf-text)]">{new Date(`${f.data_fechamento}T00:00:00`).toLocaleDateString('pt-BR')}</b><div className="text-xs text-[var(--vf-text2)]">Vendas {fmtCurrency(f.total_vendas)}</div></div><Badge color={f.status === 'fechado' ? 'green' : 'amber'}>{f.status}</Badge></div><div className="grid grid-cols-2 gap-2 mt-3 text-sm"><span>Receitas: <b className="text-[var(--vf-success)]">{fmtCurrency(f.total_receitas)}</b></span><span>Despesas: <b className="text-[var(--vf-error)]">{fmtCurrency(f.total_despesas)}</b></span><span>Pix: <b>{fmtCurrency(f.pix)}</b></span><span>Saldo: <b className={f.saldo_final >= 0 ? 'text-[var(--vf-success)]' : 'text-[var(--vf-error)]'}>{fmtCurrency(f.saldo_final)}</b></span></div></Card>)}</div></Card>}
    </div>
  </div>
}
