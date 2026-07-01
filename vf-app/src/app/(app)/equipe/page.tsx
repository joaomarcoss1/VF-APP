'use client'

import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Header from '@/components/layout/Header'
import { ConfirmActionButton, Alert, Badge, Button, Card, Empty, Field, Input, Modal, Select, Skeleton, Textarea } from '@/components/ui'
import { EquipeService } from '@/services'
import type { CargoEquipe, EquipeUsuario, EquipeUsuarioForm, StatusEquipe } from '@/types'
import toast from 'react-hot-toast'

const PERMISSOES = [
  { key: 'vendas', label: 'Vendas' },
  { key: 'agenda', label: 'Agenda' },
  { key: 'produtos', label: 'Produtos/Serviços' },
  { key: 'clientes', label: 'Clientes' },
  { key: 'financeiro', label: 'Financeiro' },
  { key: 'relatorios', label: 'Relatórios' },
  { key: 'estoque', label: 'Estoque' },
]

const CARGOS: Array<{ value: CargoEquipe; label: string }> = [
  { value: 'dono', label: 'Dono/Sócio' },
  { value: 'gerente', label: 'Gerente' },
  { value: 'atendente', label: 'Atendente' },
  { value: 'vendedor', label: 'Vendedor' },
  { value: 'financeiro', label: 'Financeiro' },
  { value: 'operacional', label: 'Operacional' },
  { value: 'outro', label: 'Outro' },
]

const EMPTY: EquipeUsuarioForm = { nome: '', email: '', telefone: '', cargo: 'atendente', permissoes: ['vendas','agenda','clientes'], status: 'ativo', observacoes: '' }

export default function EquipePage() {
  const qc = useQueryClient()
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<EquipeUsuario | null>(null)
  const [form, setForm] = useState<EquipeUsuarioForm>({ ...EMPTY })
  const { data, isLoading, error } = useQuery({ queryKey: ['equipe'], queryFn: EquipeService.listar })
  const equipe = data ?? []
  const resumo = useMemo(() => ({
    total: equipe.length,
    ativos: equipe.filter(e => e.status === 'ativo').length,
    gestores: equipe.filter(e => ['dono','gerente','financeiro'].includes(e.cargo)).length,
  }), [equipe])

  const salvar = useMutation({
    mutationFn: () => editing ? EquipeService.atualizar(editing.id, form) : EquipeService.criar(form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['equipe'] }); toast.success('Equipe atualizada.'); close() },
    onError: (e: Error) => toast.error(e.message),
  })
  const excluir = useMutation({
    mutationFn: (id: string) => EquipeService.excluir(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['equipe'] }); toast.success('Membro desativado.') },
    onError: (e: Error) => toast.error(e.message),
  })

  const openNew = () => { setEditing(null); setForm({ ...EMPTY }); setModal(true) }
  const openEdit = (m: EquipeUsuario) => { setEditing(m); setForm({ nome: m.nome, email: m.email ?? '', telefone: m.telefone ?? '', cargo: m.cargo, permissoes: m.permissoes ?? [], status: m.status, observacoes: m.observacoes ?? '' }); setModal(true) }
  const close = () => { setModal(false); setEditing(null); setForm({ ...EMPTY }) }
  const togglePerm = (perm: string) => setForm(p => ({ ...p, permissoes: p.permissoes.includes(perm) ? p.permissoes.filter(x => x !== perm) : [...p.permissoes, perm] }))

  return <div className="vf-fadein">
    <Header title="Equipe e permissões" />
    <div className="p-4 md:p-6 space-y-5">
      <Alert type="info">Controle colaboradores, cargos e permissões operacionais. Esta área prepara o VF Nexus para empresas com equipe, atendimento, vendedores, financeiro e gestão separada.</Alert>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="p-4"><div className="text-xs text-[var(--vf-text2)] uppercase">Equipe cadastrada</div><div className="text-2xl text-[var(--vf-secondary)] font-semibold">{resumo.total}</div></Card>
        <Card className="p-4"><div className="text-xs text-[var(--vf-text2)] uppercase">Ativos</div><div className="text-2xl text-[#3DAA6B] font-semibold">{resumo.ativos}</div></Card>
        <Card className="p-4"><div className="text-xs text-[var(--vf-text2)] uppercase">Gestão/Financeiro</div><div className="text-2xl text-[#0A8DFF] font-semibold">{resumo.gestores}</div></Card>
      </div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"><div><h2 className="text-lg font-semibold">Membros da empresa</h2><p className="text-sm text-[var(--vf-text2)]">Use permissões para organizar quem atua em vendas, agenda, clientes, estoque ou financeiro.</p></div><Button onClick={openNew}>＋ Novo membro</Button></div>
      {error && <Alert type="error">{(error as Error).message}</Alert>}
      {isLoading ? <Skeleton className="h-48" /> : !equipe.length ? <Empty icon="👤" title="Nenhum membro cadastrado" description="Cadastre sua equipe para começar a organizar acessos e responsabilidades." action={<Button onClick={openNew}>Cadastrar membro</Button>} /> : <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {equipe.map(m => <Card key={m.id} className="p-4 space-y-3 vf-motion">
          <div className="flex items-start justify-between gap-3"><div><div className="font-semibold text-[var(--vf-text)]">{m.nome}</div><div className="text-xs text-[var(--vf-text2)]">{m.email || m.telefone || 'Sem contato'}</div></div><Badge color={m.status === 'ativo' ? 'green' : m.status === 'convidado' ? 'blue' : 'gray'}>{m.status}</Badge></div>
          <div className="flex flex-wrap gap-1"><Badge color="gold">{CARGOS.find(c => c.value === m.cargo)?.label ?? m.cargo}</Badge>{(m.permissoes ?? []).slice(0, 4).map(p => <Badge key={p} color="gray">{p}</Badge>)}</div>
          <p className="text-xs text-[var(--vf-text2)] min-h-[28px]">{m.observacoes || 'Sem observações.'}</p>
          <div className="flex justify-end gap-2"><Button size="sm" variant="ghost" onClick={() => openEdit(m)}>Editar</Button><ConfirmActionButton title="Desativar membro" description="O usuário será inativado e a ação ficará vinculada ao fluxo de equipe." confirmLabel="Desativar" onConfirm={() => excluir.mutate(m.id)}>Desativar</ConfirmActionButton></div>
        </Card>)}
      </div>}
    </div>
    <Modal open={modal} onClose={close} title={editing ? 'Editar membro' : 'Novo membro'} size="lg">
      <div className="space-y-4">
        <Field label="Nome" required><Input value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))} /></Field>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><Field label="Email"><Input value={form.email ?? ''} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} /></Field><Field label="Telefone/WhatsApp"><Input value={form.telefone ?? ''} onChange={e => setForm(p => ({ ...p, telefone: e.target.value }))} /></Field></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><Field label="Cargo"><Select value={form.cargo} onChange={e => setForm(p => ({ ...p, cargo: e.target.value as CargoEquipe }))}>{CARGOS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}</Select></Field><Field label="Status"><Select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value as StatusEquipe }))}><option value="ativo">Ativo</option><option value="convidado">Convidado</option><option value="inativo">Inativo</option></Select></Field></div>
        <Field label="Permissões"><div className="grid grid-cols-2 sm:grid-cols-3 gap-2">{PERMISSOES.map(p => <button type="button" key={p.key} onClick={() => togglePerm(p.key)} className={`rounded-xl border px-3 py-2 text-xs text-left ${form.permissoes.includes(p.key) ? 'bg-[rgba(10,141,255,.12)] border-[rgba(10,141,255,.34)] text-[var(--vf-secondary)]' : 'border-[rgba(148,163,184,.18)] text-[var(--vf-text2)]'}`}>{p.label}</button>)}</div></Field>
        <Field label="Observações"><Textarea value={form.observacoes ?? ''} onChange={e => setForm(p => ({ ...p, observacoes: e.target.value }))} /></Field>
        <div className="flex justify-end gap-2"><Button variant="secondary" onClick={close}>Cancelar</Button><Button loading={salvar.isPending} disabled={!form.nome.trim()} onClick={() => salvar.mutate()}>Salvar</Button></div>
      </div>
    </Modal>
  </div>
}
