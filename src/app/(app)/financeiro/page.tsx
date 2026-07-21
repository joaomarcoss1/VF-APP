'use client'

import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Header from '@/components/layout/Header'
import { ConfirmActionButton, Alert, Badge, Button, Card, Empty, Field, Input, Modal, Select, Skeleton, Textarea } from '@/components/ui'
import { ContasPagarService, ContasReceberService, DespesasService, FinanceiroService, VendasService } from '@/services'
import { fmtCurrency } from '@/lib/precificacao'
import { calcularResumoFinanceiro } from '@/lib/commercial-engine'
import type { FormaPagamento, LancamentoFinanceiro, LancamentoFinanceiroForm } from '@/types'
import toast from 'react-hot-toast'

const hoje = () => new Date().toISOString().split('T')[0]
const inicioMes = () => new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
const EMPTY: LancamentoFinanceiroForm = { tipo: 'receita', descricao: '', categoria: '', valor: 0, data_vencimento: hoje(), data_pagamento: '', forma_pagamento: 'pix', status: 'pendente', recorrente: false, observacoes: '' }

export default function FinanceiroPage() {
  const qc = useQueryClient()
  const [inicio, setInicio] = useState(inicioMes())
  const [fim, setFim] = useState(hoje())
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<LancamentoFinanceiro | null>(null)
  const [form, setForm] = useState<LancamentoFinanceiroForm>({ ...EMPTY })
  const vendasQ = useQuery({ queryKey: ['financeiro-vendas', inicio, fim], queryFn: () => VendasService.listarPorPeriodo(inicio, fim) })
  const despesasQ = useQuery({ queryKey: ['financeiro-despesas'], queryFn: DespesasService.listar })
  const lancQ = useQuery({ queryKey: ['lancamentos-financeiros', inicio, fim], queryFn: () => FinanceiroService.listar(inicio, fim) })
  const pagarQ = useQuery({ queryKey: ['contas-pagar', inicio, fim], queryFn: () => ContasPagarService.listar(inicio, fim) })
  const receberQ = useQuery({ queryKey: ['contas-receber', inicio, fim], queryFn: () => ContasReceberService.listar(inicio, fim) })
  const vendas = vendasQ.data ?? []
  const despesas = despesasQ.data ?? []
  const lancamentos = lancQ.data ?? []
  const contasPagar = pagarQ.data ?? []
  const contasReceber = receberQ.data ?? []
  const resumo = useMemo(() => calcularResumoFinanceiro({ vendas, despesas, lancamentos, contasPagar, contasReceber }), [vendas, despesas, lancamentos, contasPagar, contasReceber])
  const salvar = useMutation({
    mutationFn: () => editing ? FinanceiroService.atualizar(editing.id, form) : FinanceiroService.criar(form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['lancamentos-financeiros'] }); toast.success('Lançamento salvo.'); close() },
    onError: (e: Error) => toast.error(e.message),
  })
  const pagar = useMutation({ mutationFn: (id: string) => FinanceiroService.marcarPago(id), onSuccess: () => { qc.invalidateQueries({ queryKey: ['lancamentos-financeiros'] }); toast.success('Marcado como pago.') } })
  const pagarConta = useMutation({ mutationFn: (id: string) => ContasPagarService.marcarPago(id), onSuccess: () => { qc.invalidateQueries({ queryKey: ['contas-pagar'] }); toast.success('Conta a pagar quitada.') } })
  const receberConta = useMutation({ mutationFn: (id: string) => ContasReceberService.marcarRecebido(id), onSuccess: () => { qc.invalidateQueries({ queryKey: ['contas-receber'] }); toast.success('Conta recebida.') } })
  const excluir = useMutation({ mutationFn: (id: string) => FinanceiroService.excluir(id), onSuccess: () => { qc.invalidateQueries({ queryKey: ['lancamentos-financeiros'] }); toast.success('Removido.') } })
  const openNew = (tipo: 'receita' | 'despesa' = 'receita') => { setEditing(null); setForm({ ...EMPTY, tipo }); setModal(true) }
  const openEdit = (l: LancamentoFinanceiro) => { setEditing(l); setForm({ ...EMPTY, ...l }); setModal(true) }
  const close = () => { setModal(false); setEditing(null); setForm({ ...EMPTY }) }
  const set = (k: keyof LancamentoFinanceiroForm) => (e: any) => setForm(p => ({ ...p, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))
  const loading = vendasQ.isLoading || despesasQ.isLoading || lancQ.isLoading || pagarQ.isLoading || receberQ.isLoading

  return <div className="vf-fadein">
    <Header title="Financeiro" />
    <div className="p-4 md:p-6 space-y-5">
      <Alert type="info">Acompanhe entradas, saídas, contas pendentes, despesas fixas e saldo estimado do negócio.</Alert>
      <Card className="p-4"><div className="flex flex-wrap items-end gap-4"><Field label="Início"><Input type="date" value={inicio} onChange={e => setInicio(e.target.value)} /></Field><Field label="Fim"><Input type="date" value={fim} onChange={e => setFim(e.target.value)} /></Field><Button variant="secondary" onClick={() => { setInicio(inicioMes()); setFim(hoje()) }}>Este mês</Button><Button onClick={() => openNew('receita')}>＋ Receita</Button><Button variant="secondary" onClick={() => openNew('despesa')}>＋ Despesa</Button></div></Card>
      {loading ? <Skeleton className="h-36" /> : <><div className="grid grid-cols-2 md:grid-cols-4 gap-3"><Card className="p-4"><div className="text-xs text-[var(--vf-text2)] uppercase">Entradas</div><div className="text-2xl text-[var(--vf-success)] font-semibold">{fmtCurrency(resumo.entradas)}</div></Card><Card className="p-4"><div className="text-xs text-[var(--vf-text2)] uppercase">Saídas</div><div className="text-2xl text-[var(--vf-error)] font-semibold">{fmtCurrency(resumo.saidas)}</div></Card><Card className="p-4"><div className="text-xs text-[var(--vf-text2)] uppercase">A receber</div><div className="text-2xl text-[var(--vf-primary)] font-semibold">{fmtCurrency(resumo.contasReceberPendentes)}</div><div className="text-xs text-[var(--vf-text3)]">{resumo.vencidasReceber} vencida(s)</div></Card><Card className="p-4"><div className="text-xs text-[var(--vf-text2)] uppercase">A pagar</div><div className="text-2xl text-[var(--vf-error)] font-semibold">{fmtCurrency(resumo.contasPagarPendentes)}</div><div className="text-xs text-[var(--vf-text3)]">{resumo.vencidasPagar} vencida(s)</div></Card></div><div className="grid grid-cols-1 xl:grid-cols-[1fr_.9fr] gap-4"><Card className="p-4"><div className="flex items-center justify-between mb-3"><div><h2 className="font-semibold text-[var(--vf-text)]">DRE simplificada</h2><p className="text-xs text-[var(--vf-text2)]">Receita, custos, despesas, contas e lucro operacional do período.</p></div><Badge color={resumo.lucroLiquido >= 0 ? 'green' : 'red'}>{resumo.lucroLiquido >= 0 ? 'positivo' : 'negativo'}</Badge></div><div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm"><Mini label="Receita líquida" value={resumo.dre.receitaLiquida} /><Mini label="Custos" value={-Math.abs(resumo.dre.custoProdutosServicos)} /><Mini label="Despesas" value={-Math.abs(resumo.dre.despesasOperacionais)} /><Mini label="Lucro operacional" value={resumo.dre.lucroOperacional} strong /></div></Card><Card className="p-4"><h2 className="font-semibold text-[var(--vf-text)] mb-3">Fluxo de caixa</h2><div className="grid grid-cols-2 gap-3"><Mini label="Saldo realizado" value={resumo.saldo} strong /><MiniPct label="Margem líquida" value={resumo.margemLiquidaPct} /></div></Card></div></>}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card className="overflow-hidden">
          <div className="p-4 border-b border-[var(--vf-border)]"><h2 className="font-semibold text-[var(--vf-text)]">Contas a receber</h2><p className="text-xs text-[var(--vf-text2)]">Recebimentos gerados por vendas, agendamentos e lançamentos manuais.</p></div>
          {contasReceber.length ? <div className="p-3 space-y-2 max-h-[360px] overflow-y-auto">{contasReceber.map(c => <div key={c.id} className="p-3 rounded-2xl bg-[var(--vf-surface2)] flex items-center justify-between gap-3"><div><div className="font-medium text-[var(--vf-text)]">{c.descricao}</div><div className="text-xs text-[var(--vf-text3)]">Venc.: {new Date(c.data_vencimento).toLocaleDateString('pt-BR')}</div></div><div className="text-right"><div className="font-semibold text-[var(--vf-success)]">{fmtCurrency(c.valor)}</div><div className="flex justify-end gap-2 mt-1"><Badge color={c.status === 'recebido' ? 'green' : c.status === 'vencido' ? 'red' : 'amber'}>{c.status}</Badge>{c.status === 'pendente' && <Button size="sm" variant="secondary" onClick={() => receberConta.mutate(c.id)}>Receber</Button>}</div></div></div>)}</div> : <Empty icon="📥" title="Nada a receber" description="Vendas pagas e pendentes aparecerão aqui automaticamente." />}
        </Card>
        <Card className="overflow-hidden">
          <div className="p-4 border-b border-[var(--vf-border)]"><h2 className="font-semibold text-[var(--vf-text)]">Contas a pagar</h2><p className="text-xs text-[var(--vf-text2)]">Compras, fornecedores, despesas futuras e compromissos financeiros.</p></div>
          {contasPagar.length ? <div className="p-3 space-y-2 max-h-[360px] overflow-y-auto">{contasPagar.map(c => <div key={c.id} className="p-3 rounded-2xl bg-[var(--vf-surface2)] flex items-center justify-between gap-3"><div><div className="font-medium text-[var(--vf-text)]">{c.descricao}</div><div className="text-xs text-[var(--vf-text3)]">Venc.: {new Date(c.data_vencimento).toLocaleDateString('pt-BR')}</div></div><div className="text-right"><div className="font-semibold text-[var(--vf-error)]">{fmtCurrency(c.valor)}</div><div className="flex justify-end gap-2 mt-1"><Badge color={c.status === 'pago' ? 'green' : c.status === 'vencido' ? 'red' : 'amber'}>{c.status}</Badge>{c.status === 'pendente' && <Button size="sm" variant="secondary" onClick={() => pagarConta.mutate(c.id)}>Pagar</Button>}</div></div></div>)}</div> : <Empty icon="📤" title="Nada a pagar" description="Compras e notas com pagamento futuro aparecerão aqui." />}
        </Card>
      </div>

      <Card className="overflow-hidden">
        {lancamentos.length ? <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 p-3">{lancamentos.map(l => <Card key={l.id} className="p-4 bg-[var(--vf-surface2)]"><div className="flex justify-between gap-2"><div><div className="font-semibold text-[var(--vf-text)]">{l.descricao}</div><div className="text-xs text-[var(--vf-text2)]">Venc.: {new Date(l.data_vencimento).toLocaleDateString('pt-BR')}</div></div><Badge color={l.tipo === 'receita' ? 'green' : 'red'}>{l.tipo}</Badge></div><div className={`text-xl font-semibold mt-3 ${l.tipo === 'receita' ? 'text-[var(--vf-success)]' : 'text-[var(--vf-error)]'}`}>{fmtCurrency(l.valor)}</div><div className="mt-3 flex gap-2 justify-end"><Badge color={l.status === 'pago' ? 'green' : l.status === 'cancelado' ? 'red' : 'amber'}>{l.status}</Badge><Button size="sm" variant="ghost" onClick={() => openEdit(l)}>Editar</Button>{l.status === 'pendente' && <Button size="sm" variant="secondary" onClick={() => pagar.mutate(l.id)}>Pagar</Button>}<ConfirmActionButton title="Excluir lançamento" description="O lançamento será cancelado pelo service financeiro, preservando rastreabilidade." confirmLabel="Excluir" onConfirm={() => excluir.mutate(l.id)}>Excluir</ConfirmActionButton></div></Card>)}</div> : <Empty icon="💰" title="Nenhum lançamento financeiro" description="Adicione contas a pagar/receber para acompanhar o fluxo de caixa." action={<Button onClick={() => openNew('receita')}>Novo lançamento</Button>} />}
      </Card>
    </div>
    <Modal open={modal} onClose={close} title={editing ? 'Editar lançamento' : 'Novo lançamento'} size="lg"><div className="space-y-4"><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><Field label="Tipo"><Select value={form.tipo} onChange={set('tipo')}><option value="receita">Receita/entrada</option><option value="despesa">Despesa/saída</option></Select></Field><Field label="Status"><Select value={form.status} onChange={set('status')}><option value="pendente">Pendente</option><option value="pago">Pago</option><option value="cancelado">Cancelado</option></Select></Field></div><Field label="Descrição" required><Input value={form.descricao} onChange={set('descricao')} /></Field><div className="grid grid-cols-1 md:grid-cols-3 gap-4"><Field label="Valor"><Input type="number" step="0.01" value={form.valor} onChange={set('valor')} /></Field><Field label="Vencimento"><Input type="date" value={form.data_vencimento} onChange={set('data_vencimento')} /></Field><Field label="Pagamento"><Input type="date" value={form.data_pagamento ?? ''} onChange={set('data_pagamento')} /></Field></div><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><Field label="Categoria"><Input value={form.categoria ?? ''} onChange={set('categoria')} placeholder="Aluguel, fornecedor, comissão..." /></Field><Field label="Forma de pagamento"><Select value={form.forma_pagamento ?? 'pix'} onChange={set('forma_pagamento')}><option value="pix">Pix</option><option value="dinheiro">Dinheiro</option><option value="cartao_credito">Cartão crédito</option><option value="cartao_debito">Cartão débito</option><option value="boleto">Boleto</option><option value="outro">Outro</option></Select></Field></div><Field label="Observações"><Textarea value={form.observacoes ?? ''} onChange={set('observacoes')} /></Field><label className="flex items-center gap-2 text-sm text-[var(--vf-text2)]"><input type="checkbox" checked={Boolean(form.recorrente)} onChange={set('recorrente')} /> Lançamento recorrente</label><div className="flex justify-end gap-2"><Button variant="secondary" onClick={close}>Cancelar</Button><Button loading={salvar.isPending} disabled={!form.descricao.trim()} onClick={() => salvar.mutate()}>Salvar</Button></div></div></Modal>
  </div>
}


function Mini({ label, value, strong }: { label: string; value: number; strong?: boolean }) {
  return <div className="p-3 rounded-2xl bg-[var(--vf-surface2)]"><div className="text-xs text-[var(--vf-text3)] uppercase">{label}</div><div className={`text-base ${strong ? 'font-bold' : 'font-semibold'} ${value >= 0 ? 'text-[var(--vf-success)]' : 'text-[var(--vf-error)]'}`}>{fmtCurrency(value)}</div></div>
}

function MiniPct({ label, value }: { label: string; value: number }) {
  return <div className="p-3 rounded-2xl bg-[var(--vf-surface2)]"><div className="text-xs text-[var(--vf-text3)] uppercase">{label}</div><div className={`text-base font-bold ${value >= 0 ? 'text-[var(--vf-success)]' : 'text-[var(--vf-error)]'}`}>{Number(value || 0).toFixed(1)}%</div></div>
}
