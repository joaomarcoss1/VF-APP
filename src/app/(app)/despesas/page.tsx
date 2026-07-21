'use client'

import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Header from '@/components/layout/Header'
import { ConfirmActionButton, Badge, Button, Card, Empty, Field, Input, Modal, Select, Textarea, Skeleton } from '@/components/ui'
import { DespesasService } from '@/services'
import { fmtCurrency } from '@/lib/precificacao'
import type { Despesa, DespesaForm, TipoDespesa } from '@/types'
import toast from 'react-hot-toast'

const EMPTY: DespesaForm = {
  nome: '', tipo: 'fixa', valor: 0, recorrencia: 'mensal', percentual: undefined, ativa: true, observacoes: ''
}
const TIPOS: TipoDespesa[] = ['fixa','variavel','imposto','mao_de_obra','entrega','outro']
const RECORRENCIAS = ['mensal','semanal','diaria','eventual'] as const

export default function DespesasPage() {
  const qc = useQueryClient()
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<Despesa | null>(null)
  const [form, setForm] = useState<DespesaForm>({ ...EMPTY })

  const { data, isLoading, error } = useQuery({ queryKey: ['despesas'], queryFn: DespesasService.listar })

  const salvar = useMutation({
    mutationFn: () => editing ? DespesasService.atualizar(editing.id, form) : DespesasService.criar(form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['despesas'] }); toast.success('Despesa salva!'); setModal(false); setEditing(null) },
    onError: (e: Error) => toast.error(e.message),
  })
  const excluir = useMutation({
    mutationFn: DespesasService.excluir,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['despesas'] }); toast.success('Despesa removida.') },
    onError: (e: Error) => toast.error(e.message),
  })

  const resumo = useMemo(() => {
    const list = data ?? []
    const fator = (rec: string) => rec === 'diaria' ? 30 : rec === 'semanal' ? 4.33 : rec === 'mensal' ? 1 : 1
    const ativas = list.filter(d => d.ativa)
    const total = ativas.reduce((a, d) => a + Number(d.valor ?? 0) * fator(d.recorrencia), 0)
    const fixas = ativas.filter(d => d.tipo === 'fixa').reduce((a, d) => a + Number(d.valor ?? 0) * fator(d.recorrencia), 0)
    return { total, fixas, variaveis: total - fixas, count: ativas.length }
  }, [data])

  const openNew = () => { setEditing(null); setForm({ ...EMPTY }); setModal(true) }
  const openEdit = (d: Despesa) => { setEditing(d); setForm({ nome: d.nome, tipo: d.tipo, valor: Number(d.valor), recorrencia: d.recorrencia, percentual: d.percentual, ativa: d.ativa, observacoes: d.observacoes ?? '' }); setModal(true) }
  const f = (k: keyof DespesaForm) => (e: any) => setForm(p => ({ ...p, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  return (
    <div className="vf-fadein">
      <Header title="Despesas" />
      <div className="p-4 md:p-6 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-semibold text-[var(--vf-text)]">Gastos e despesas editáveis</h1>
            <p className="text-sm text-[var(--vf-text2)] mt-1">Cadastre gastos fixos, impostos, mão de obra, entrega e qualquer outra despesa para usar na análise de preços e relatórios.</p>
          </div>
          <Button onClick={openNew}>＋ Nova despesa</Button>
        </div>

        {error && <Card className="p-4 text-[var(--vf-error)]">{(error as Error).message}</Card>}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card className="p-4"><span className="text-[10px] text-[var(--vf-text3)] uppercase">Mensal estimado</span><div className="text-xl text-[var(--vf-primary)] font-semibold">{fmtCurrency(resumo.total)}</div></Card>
          <Card className="p-4"><span className="text-[10px] text-[var(--vf-text3)] uppercase">Gastos fixos</span><div className="text-xl text-[var(--vf-primary)] font-semibold">{fmtCurrency(resumo.fixas)}</div></Card>
          <Card className="p-4"><span className="text-[10px] text-[var(--vf-text3)] uppercase">Variáveis/outros</span><div className="text-xl text-[var(--vf-info)] font-semibold">{fmtCurrency(resumo.variaveis)}</div></Card>
          <Card className="p-4"><span className="text-[10px] text-[var(--vf-text3)] uppercase">Despesas ativas</span><div className="text-xl text-[var(--vf-success)] font-semibold">{resumo.count}</div></Card>
        </div>

        {isLoading ? <Skeleton className="h-64" /> : !data?.length ? (
          <Empty icon="💸" title="Nenhuma despesa cadastrada" description="Comece incluindo aluguel, energia, mão de obra, impostos, taxas ou qualquer gasto da operação." action={<Button onClick={openNew}>Cadastrar despesa</Button>} />
        ) : (
          <Card className="overflow-x-auto">
            <table className="vf-table">
              <thead><tr><th>Nome</th><th>Tipo</th><th>Valor</th><th>Recorrência</th><th>Status</th><th>Observações</th><th>Ações</th></tr></thead>
              <tbody>
                {data.map(d => <tr key={d.id}>
                  <td className="font-medium text-[var(--vf-text)]">{d.nome}</td>
                  <td><Badge color="gold">{d.tipo}</Badge></td>
                  <td>{fmtCurrency(d.valor)}</td>
                  <td>{d.recorrencia}</td>
                  <td><Badge color={d.ativa ? 'green' : 'gray'}>{d.ativa ? 'Ativa' : 'Inativa'}</Badge></td>
                  <td>{d.observacoes || '—'}</td>
                  <td className="space-x-2"><Button size="sm" variant="ghost" onClick={() => openEdit(d)}>Editar</Button><ConfirmActionButton title="Excluir despesa" description="A despesa será cancelada/removida pelo service com proteção de permissão." confirmLabel="Excluir" onConfirm={() => excluir.mutate(d.id)}>Excluir</ConfirmActionButton></td>
                </tr>)}
              </tbody>
            </table>
          </Card>
        )}
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Editar despesa' : 'Nova despesa'} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Nome" required><Input value={form.nome} onChange={f('nome')} placeholder="Ex: Aluguel, energia, taxa iFood" /></Field>
            <Field label="Tipo"><Select value={form.tipo} onChange={f('tipo')}>{TIPOS.map(t => <option key={t} value={t}>{t}</option>)}</Select></Field>
            <Field label="Valor"><Input type="number" step="0.01" value={form.valor || ''} onChange={e => setForm(p => ({ ...p, valor: Number(e.target.value) }))} /></Field>
            <Field label="Recorrência"><Select value={form.recorrencia} onChange={f('recorrencia')}>{RECORRENCIAS.map(r => <option key={r} value={r}>{r}</option>)}</Select></Field>
            <Field label="Percentual opcional"><Input type="number" step="0.01" value={form.percentual ?? ''} onChange={e => setForm(p => ({ ...p, percentual: e.target.value ? Number(e.target.value) : undefined }))} placeholder="Ex: 6" /></Field>
            <Field label="Status"><label className="flex gap-2 items-center text-sm text-[var(--vf-text2)]"><input type="checkbox" checked={form.ativa} onChange={f('ativa')} /> Ativa</label></Field>
          </div>
          <Field label="Observações"><Textarea value={form.observacoes ?? ''} onChange={f('observacoes')} /></Field>
          <div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setModal(false)}>Cancelar</Button><Button onClick={() => salvar.mutate()} loading={salvar.isPending}>Salvar despesa</Button></div>
        </div>
      </Modal>
    </div>
  )
}
