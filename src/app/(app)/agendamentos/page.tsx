'use client'

import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Header from '@/components/layout/Header'
import { ConfirmActionButton, Alert, Badge, Button, Card, Empty, Field, Input, Modal, Select, Skeleton } from '@/components/ui'
import { AgendamentosService, IdentidadeService, ProdutosService } from '@/services'
import { compartilharComprovanteWhatsappPDF } from '@/lib/exports'
import { fmtCurrency } from '@/lib/precificacao'
import type { Agendamento, FormaPagamento, StatusAgendamento, ComprovantePayload } from '@/types'
import toast from 'react-hot-toast'

const hoje = () => new Date().toISOString().split('T')[0]
const STATUS: Array<{ value: StatusAgendamento; label: string }> = [
  { value: 'agendado', label: 'Agendado' }, { value: 'confirmado', label: 'Confirmado' }, { value: 'realizado', label: 'Realizado' }, { value: 'remarcado', label: 'Remarcado' }, { value: 'cancelado', label: 'Cancelado' },
]
const PAGAMENTOS: Array<{ value: FormaPagamento; label: string }> = [
  { value: 'pix', label: 'Pix' }, { value: 'dinheiro', label: 'Dinheiro' }, { value: 'cartao_credito', label: 'Cartão crédito' }, { value: 'cartao_debito', label: 'Cartão débito' }, { value: 'outro', label: 'Outro' },
]
const EMPTY = { produto_id: '', cliente_nome: '', cliente_whatsapp: '', cliente_email: '', servico_nome: '', descricao: '', data_agendamento: hoje(), hora_inicio: '09:00', hora_fim: '', valor: 0, desconto: 0, taxa_servico: 0, forma_pagamento: 'pix' as FormaPagamento, status: 'agendado' as StatusAgendamento, observacoes: '' }

export default function AgendamentosPage() {
  const qc = useQueryClient()
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<Agendamento | null>(null)
  const [form, setForm] = useState({ ...EMPTY })
  const { data: identidade } = useQuery({ queryKey: ['identidade-agenda'], queryFn: IdentidadeService.obter })
  const { data: produtos } = useQuery({ queryKey: ['produtos-agenda'], queryFn: () => ProdutosService.listar() })
  const { data: agendamentos, isLoading } = useQuery({ queryKey: ['agendamentos'], queryFn: () => AgendamentosService.listar() })
  const total = Math.max(0, Number(form.valor || 0) + Number(form.taxa_servico || 0) - Number(form.desconto || 0))
  const proximos = useMemo(() => (agendamentos ?? []).filter(a => a.status !== 'cancelado' && a.status !== 'realizado').slice(0, 5), [agendamentos])

  const criar = useMutation({ mutationFn: () => AgendamentosService.criar({ ...form, produto_id: form.produto_id || undefined } as any), onSuccess: () => { qc.invalidateQueries({ queryKey: ['agendamentos'] }); toast.success('Agendamento salvo!'); closeModal() }, onError: (e: Error) => toast.error(e.message) })
  const atualizar = useMutation({ mutationFn: () => AgendamentosService.atualizar(editing!.id, { ...form, produto_id: form.produto_id || undefined } as any), onSuccess: () => { qc.invalidateQueries({ queryKey: ['agendamentos'] }); toast.success('Agendamento atualizado!'); closeModal() }, onError: (e: Error) => toast.error(e.message) })
  const excluir = useMutation({ mutationFn: (id: string) => AgendamentosService.excluir(id), onSuccess: () => { qc.invalidateQueries({ queryKey: ['agendamentos'] }); toast.success('Agendamento removido.') } })

  const openNew = () => { setEditing(null); setForm({ ...EMPTY }); setModal(true) }
  const openEdit = (a: Agendamento) => { setEditing(a); setForm({ ...EMPTY, ...a, produto_id: a.produto_id || '' } as any); setModal(true) }
  const closeModal = () => { setModal(false); setEditing(null) }
  const selecionarProduto = (id: string) => {
    const p = (produtos ?? []).find(x => x.id === id)
    setForm(prev => ({ ...prev, produto_id: id, servico_nome: p?.nome || prev.servico_nome, valor: Number(p?.preco_venda ?? prev.valor) }))
  }
  const comprovante = (a?: Agendamento | null): ComprovantePayload => ({
    empresa_nome: identidade?.nome || 'Minha Empresa', cliente_nome: a?.cliente_nome || form.cliente_nome, cliente_whatsapp: a?.cliente_whatsapp || form.cliente_whatsapp,
    itens: [{ nome: a?.servico_nome || form.servico_nome || 'Serviço agendado', quantidade: 1, valor_unitario: Number(a?.valor ?? form.valor), total: Number(a?.valor ?? form.valor) }],
    subtotal: Number(a?.valor ?? form.valor), desconto: Number(a?.desconto ?? form.desconto), taxa_servico: Number(a?.taxa_servico ?? form.taxa_servico), total: Number(a?.total ?? total), forma_pagamento: a?.forma_pagamento || form.forma_pagamento,
    data_hora: `${a?.data_agendamento || form.data_agendamento} às ${a?.hora_inicio || form.hora_inicio}`, observacoes: a?.observacoes || form.observacoes, tipo: 'agendamento',
  })
  const enviarWhatsapp = async (a?: Agendamento | null) => {
    try {
      await compartilharComprovanteWhatsappPDF(comprovante(a), a?.cliente_whatsapp || form.cliente_whatsapp, identidade || undefined)
      toast.success('Comprovante em PDF preparado para o WhatsApp.')
    } catch (e: any) {
      toast.error(e.message || 'Erro ao gerar comprovante em PDF.')
    }
  }

  return (
    <div className="vf-fadein">
      <Header title="Agendamentos" />
      <div className="p-4 md:p-6 space-y-5">
        <Alert type="info">Agenda profissional para barbearias, fotógrafos, prestadores de serviço, confeitarias e empresas que trabalham com horário marcado.</Alert>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"><div><h2 className="text-lg font-semibold">Agenda e serviços</h2><p className="text-sm text-[var(--vf-text2)]">Organize clientes, horários, pagamentos e comprovantes.</p></div><Button onClick={openNew}>＋ Novo agendamento</Button></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Card className="p-4"><div className="text-xs text-[var(--vf-text2)] uppercase">Próximos</div><div className="text-2xl text-[var(--vf-primary)] font-semibold">{proximos.length}</div></Card>
          <Card className="p-4"><div className="text-xs text-[var(--vf-text2)] uppercase">Receita prevista</div><div className="text-2xl text-[var(--vf-success)] font-semibold">{fmtCurrency(proximos.reduce((a,b)=>a+Number(b.total||0),0))}</div></Card>
          <Card className="p-4"><div className="text-xs text-[var(--vf-text2)] uppercase">Total na agenda</div><div className="text-2xl text-[var(--vf-text)] font-semibold">{agendamentos?.length ?? 0}</div></Card>
        </div>
        <Card className="overflow-hidden">
          {isLoading ? <div className="p-4"><Skeleton className="h-40" /></div> : (agendamentos?.length ?? 0) === 0 ? <Empty icon="📅" title="Nenhum agendamento" description="Crie o primeiro compromisso da agenda." action={<Button onClick={openNew}>Criar agendamento</Button>} /> : (
            <>
              <div className="md:hidden p-3 space-y-3">
                {agendamentos!.map(a => (
                  <Card key={a.id} className="p-3 bg-[var(--vf-surface2)]">
                    <div className="flex items-start justify-between gap-2"><div><div className="font-semibold text-[var(--vf-text)]">{a.servico_nome}</div><div className="text-xs text-[var(--vf-text2)]">{a.cliente_nome} · {a.data_agendamento} às {a.hora_inicio}</div></div><Badge color={a.status === 'cancelado' ? 'red' : a.status === 'realizado' ? 'green' : 'gold'}>{a.status}</Badge></div>
                    <div className="grid grid-cols-2 gap-2 mt-3"><div><span className="text-[var(--vf-text3)] block text-xs">Total</span><b className="text-[var(--vf-secondary)]">{fmtCurrency(a.total)}</b></div><div><span className="text-[var(--vf-text3)] block text-xs">Contato</span><b className="text-[var(--vf-text2)] text-xs">{a.cliente_whatsapp || '—'}</b></div></div>
                    <div className="flex justify-end gap-2 mt-3"><Button size="sm" variant="ghost" onClick={() => openEdit(a)}>Editar</Button><Button size="sm" variant="secondary" onClick={() => enviarWhatsapp(a)}>PDF/WhatsApp</Button></div>
                  </Card>
                ))}
              </div>
              <div className="hidden md:block overflow-x-auto"><table className="vf-table min-w-[860px]"><thead><tr><th>Data</th><th>Cliente</th><th>Serviço</th><th>Horário</th><th>Status</th><th>Total</th><th>Ações</th></tr></thead><tbody>{agendamentos!.map(a => <tr key={a.id}><td>{a.data_agendamento}</td><td>{a.cliente_nome}<br/><span className="text-[11px] text-[var(--vf-text3)]">{a.cliente_whatsapp || ''}</span></td><td>{a.servico_nome}</td><td>{a.hora_inicio}{a.hora_fim ? ` - ${a.hora_fim}` : ''}</td><td><Badge color={a.status === 'cancelado' ? 'red' : a.status === 'realizado' ? 'green' : 'gold'}>{a.status}</Badge></td><td className="text-[var(--vf-primary)]">{fmtCurrency(a.total)}</td><td className="space-x-2"><Button size="sm" variant="ghost" onClick={() => openEdit(a)}>Editar</Button><Button size="sm" variant="ghost" onClick={() => enviarWhatsapp(a)}>PDF/WhatsApp</Button><ConfirmActionButton title="Remover agendamento" description="Confirme a remoção/cancelamento deste agendamento." confirmLabel="Excluir" onConfirm={() => excluir.mutate(a.id)}>Excluir</ConfirmActionButton></td></tr>)}</tbody></table></div>
            </>
          )}
        </Card>
      </div>
      <Modal open={modal} onClose={closeModal} title={editing ? 'Editar agendamento' : 'Novo agendamento'} size="xl">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><Field label="Cliente" required><Input value={form.cliente_nome} onChange={e => setForm(p=>({...p, cliente_nome:e.target.value}))} /></Field><Field label="WhatsApp"><Input value={form.cliente_whatsapp} onChange={e => setForm(p=>({...p, cliente_whatsapp:e.target.value}))} /></Field><Field label="Email"><Input value={form.cliente_email} onChange={e => setForm(p=>({...p, cliente_email:e.target.value}))} /></Field><Field label="Produto/serviço cadastrado"><Select value={form.produto_id} onChange={e => selecionarProduto(e.target.value)}><option value="">Avulso</option>{(produtos ?? []).map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}</Select></Field></div>
          <Field label="Serviço/Trabalho" required><Input value={form.servico_nome} onChange={e => setForm(p=>({...p, servico_nome:e.target.value}))} placeholder="Ex: Corte + barba, ensaio externo, diária de consultoria, bolo de aniversário" /></Field>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4"><Field label="Data"><Input type="date" value={form.data_agendamento} onChange={e => setForm(p=>({...p, data_agendamento:e.target.value}))} /></Field><Field label="Início"><Input type="time" value={form.hora_inicio} onChange={e => setForm(p=>({...p, hora_inicio:e.target.value}))} /></Field><Field label="Fim"><Input type="time" value={form.hora_fim} onChange={e => setForm(p=>({...p, hora_fim:e.target.value}))} /></Field><Field label="Status"><Select value={form.status} onChange={e => setForm(p=>({...p, status:e.target.value as StatusAgendamento}))}>{STATUS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}</Select></Field></div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4"><Field label="Valor"><Input type="number" step="0.01" value={form.valor} onChange={e => setForm(p=>({...p, valor:Number(e.target.value)}))} /></Field><Field label="Desconto"><Input type="number" step="0.01" value={form.desconto} onChange={e => setForm(p=>({...p, desconto:Number(e.target.value)}))} /></Field><Field label="Taxa de serviço"><Input type="number" step="0.01" value={form.taxa_servico} onChange={e => setForm(p=>({...p, taxa_servico:Number(e.target.value)}))} /></Field><Field label="Pagamento"><Select value={form.forma_pagamento} onChange={e => setForm(p=>({...p, forma_pagamento:e.target.value as FormaPagamento}))}>{PAGAMENTOS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}</Select></Field></div>
          <Field label="Observações"><Input value={form.observacoes} onChange={e => setForm(p=>({...p, observacoes:e.target.value}))} /></Field>
          <Card className="p-4 bg-[var(--vf-surface2)]"><span className="text-xs text-[var(--vf-text2)]">Total do agendamento</span><div className="text-2xl text-[var(--vf-primary)] font-semibold">{fmtCurrency(total)}</div></Card>
          <div className="flex flex-col sm:flex-row justify-end gap-2"><Button variant="ghost" onClick={closeModal}>Cancelar</Button><Button variant="secondary" onClick={() => enviarWhatsapp(null)}>Prévia PDF/WhatsApp</Button><Button loading={criar.isPending || atualizar.isPending} onClick={() => editing ? atualizar.mutate() : criar.mutate()}>{editing ? 'Salvar alterações' : 'Salvar agendamento'}</Button></div>
        </div>
      </Modal>
    </div>
  )
}
