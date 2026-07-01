'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Header from '@/components/layout/Header'
import { Alert, Badge, Button, Card, Empty, Field, Input, Modal, Select, Skeleton, Textarea } from '@/components/ui'
import { ClientesService, OrdensServicoService } from '@/services'
import { fmtCurrency } from '@/lib/precificacao'
import type { OrdemServico } from '@/types'
import toast from 'react-hot-toast'

const hoje = () => new Date().toISOString().split('T')[0]
const EMPTY = { titulo: '', descricao: '', cliente_id: '', status: 'aberta' as OrdemServico['status'], valor_orcado: 0, valor_final: 0, data_abertura: hoje(), data_previsao: '', observacoes: '' }
const STATUS: OrdemServico['status'][] = ['aberta','orcamento','aprovada','execucao','finalizada','cancelada']

export default function OrdensServicoPage() {
  const qc = useQueryClient()
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ ...EMPTY })
  const ordensQ = useQuery({ queryKey: ['ordens-servico'], queryFn: () => OrdensServicoService.listar() })
  const clientesQ = useQuery({ queryKey: ['os-clientes'], queryFn: () => ClientesService.listar() })
  const criar = useMutation({
    mutationFn: () => OrdensServicoService.criar({ ...form, cliente_id: form.cliente_id || undefined, valor_orcado: Number(form.valor_orcado || 0), valor_final: Number(form.valor_final || 0) }),
    onSuccess: () => { toast.success('Ordem de serviço criada.'); qc.invalidateQueries({ queryKey: ['ordens-servico'] }); setModal(false); setForm({ ...EMPTY }) },
    onError: (e: Error) => toast.error(e.message),
  })
  const mudarStatus = useMutation({ mutationFn: ({ id, status }: { id: string; status: OrdemServico['status'] }) => OrdensServicoService.atualizarStatus(id, status), onSuccess: () => qc.invalidateQueries({ queryKey: ['ordens-servico'] }) })
  const ordens = ordensQ.data ?? []

  return <div className="vf-fadein">
    <Header title="Ordens de serviço" />
    <div className="p-4 md:p-6 space-y-5">
      <Alert type="info">Base profissional para assistência técnica, fotografia, serviços personalizados, orçamentos e execução. Cada OS pode virar venda/recebimento na evolução fiscal/financeira.</Alert>
      <Card className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div><h2 className="text-lg font-semibold text-[var(--vf-text)]">Controle operacional de serviços</h2><p className="text-sm text-[var(--vf-text2)]">Acompanhe abertura, orçamento, aprovação, execução e finalização.</p></div>
        <Button onClick={() => setModal(true)}>＋ Nova OS</Button>
      </Card>
      {ordensQ.isLoading ? <Skeleton className="h-64" /> : ordens.length ? <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
        {ordens.map(os => <Card key={os.id} className="p-4">
          <div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold text-[var(--vf-text)]">{os.titulo}</h3><p className="text-xs text-[var(--vf-text3)]">Aberta em {new Date(os.data_abertura).toLocaleDateString('pt-BR')}</p></div><Badge color={os.status === 'finalizada' ? 'green' : os.status === 'cancelada' ? 'red' : os.status === 'aprovada' ? 'blue' : 'amber'}>{os.status}</Badge></div>
          {os.descricao && <p className="text-sm text-[var(--vf-text2)] mt-3 line-clamp-3">{os.descricao}</p>}
          <div className="grid grid-cols-2 gap-2 mt-4 text-sm"><div className="p-3 rounded-2xl bg-[var(--vf-surface2)]"><div className="text-xs text-[var(--vf-text3)]">Orçado</div><div className="font-semibold text-[var(--vf-primary)]">{fmtCurrency(Number(os.valor_orcado || 0))}</div></div><div className="p-3 rounded-2xl bg-[var(--vf-surface2)]"><div className="text-xs text-[var(--vf-text3)]">Final</div><div className="font-semibold text-[#16A34A]">{fmtCurrency(Number(os.valor_final || 0))}</div></div></div>
          <div className="mt-4"><Select value={os.status} onChange={e => mudarStatus.mutate({ id: os.id, status: e.target.value as OrdemServico['status'] })}>{STATUS.map(s => <option key={s} value={s}>{s}</option>)}</Select></div>
        </Card>)}
      </div> : <Empty icon="🧰" title="Nenhuma ordem de serviço" description="Crie uma OS para acompanhar orçamento, execução e finalização de serviços." action={<Button onClick={() => setModal(true)}>Criar OS</Button>} />}
    </div>

    <Modal open={modal} onClose={() => setModal(false)} title="Nova ordem de serviço" size="lg">
      <div className="space-y-4">
        <Field label="Título" required><Input value={form.titulo} onChange={e => setForm(p => ({ ...p, titulo: e.target.value }))} placeholder="Ex.: Manutenção notebook, ensaio fotográfico, serviço especial..." /></Field>
        <div className="grid md:grid-cols-2 gap-4"><Field label="Cliente"><Select value={form.cliente_id} onChange={e => setForm(p => ({ ...p, cliente_id: e.target.value }))}><option value="">Não vincular</option>{clientesQ.data?.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}</Select></Field><Field label="Status"><Select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value as OrdemServico['status'] }))}>{STATUS.map(s => <option key={s} value={s}>{s}</option>)}</Select></Field></div>
        <Field label="Descrição"><Textarea value={form.descricao} onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))} /></Field>
        <div className="grid md:grid-cols-3 gap-4"><Field label="Valor orçado"><Input type="number" step="0.01" value={form.valor_orcado} onChange={e => setForm(p => ({ ...p, valor_orcado: Number(e.target.value) }))} /></Field><Field label="Valor final"><Input type="number" step="0.01" value={form.valor_final} onChange={e => setForm(p => ({ ...p, valor_final: Number(e.target.value) }))} /></Field><Field label="Previsão"><Input type="date" value={form.data_previsao} onChange={e => setForm(p => ({ ...p, data_previsao: e.target.value }))} /></Field></div>
        <Field label="Observações"><Textarea value={form.observacoes} onChange={e => setForm(p => ({ ...p, observacoes: e.target.value }))} /></Field>
        <div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setModal(false)}>Cancelar</Button><Button loading={criar.isPending} disabled={!form.titulo.trim()} onClick={() => criar.mutate()}>Salvar OS</Button></div>
      </div>
    </Modal>
  </div>
}
