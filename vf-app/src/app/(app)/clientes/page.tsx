'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Header from '@/components/layout/Header'
import { ConfirmActionButton, Alert, Badge, Button, Card, Empty, Field, Input, Modal, Select, Skeleton, Textarea } from '@/components/ui'
import { ClientesService } from '@/services'
import type { Cliente, ClienteForm, TipoCliente } from '@/types'
import toast from 'react-hot-toast'

const EMPTY: ClienteForm = { nome: '', telefone: '', whatsapp: '', email: '', endereco: '', documento: '', tipo: 'cliente', origem: 'manual', observacoes: '', ativo: true }

export default function ClientesPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<Cliente | null>(null)
  const [form, setForm] = useState<ClienteForm>({ ...EMPTY })
  const { data, isLoading, error } = useQuery({ queryKey: ['clientes', search], queryFn: () => ClientesService.listar(search) })
  const clientes = data ?? []
  const stats = {
    total: clientes.length,
    whatsapp: clientes.filter(c => c.whatsapp).length,
    leads: clientes.filter(c => c.tipo === 'lead').length,
  }
  const salvar = useMutation({
    mutationFn: () => editing ? ClientesService.atualizar(editing.id, form) : ClientesService.criar(form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['clientes'] }); toast.success(editing ? 'Cliente atualizado.' : 'Cliente cadastrado.'); close() },
    onError: (e: Error) => toast.error(e.message),
  })
  const excluir = useMutation({
    mutationFn: (id: string) => ClientesService.excluir(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['clientes'] }); toast.success('Cliente removido.') },
    onError: (e: Error) => toast.error(e.message),
  })
  const openNew = () => { setEditing(null); setForm({ ...EMPTY }); setModal(true) }
  const openEdit = (c: Cliente) => { setEditing(c); setForm({ ...EMPTY, ...c }); setModal(true) }
  const close = () => { setModal(false); setEditing(null); setForm({ ...EMPTY }) }
  const set = (k: keyof ClienteForm) => (e: any) => setForm(p => ({ ...p, [k]: e.target.value }))

  return <div className="vf-fadein">
    <Header title="Clientes" />
    <div className="p-4 md:p-6 space-y-5">
      <Alert type="info">Centralize clientes, WhatsApp, histórico comercial e observações. Vendas e agendamentos também alimentam essa base automaticamente.</Alert>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="p-4"><div className="text-xs text-[var(--vf-text2)] uppercase">Clientes ativos</div><div className="text-2xl text-[var(--vf-secondary)] font-semibold">{stats.total}</div></Card>
        <Card className="p-4"><div className="text-xs text-[var(--vf-text2)] uppercase">Com WhatsApp</div><div className="text-2xl text-[#0A8DFF] font-semibold">{stats.whatsapp}</div></Card>
        <Card className="p-4"><div className="text-xs text-[var(--vf-text2)] uppercase">Leads</div><div className="text-2xl text-[#3DAA6B] font-semibold">{stats.leads}</div></Card>
      </div>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div><h2 className="text-lg font-semibold">Base de clientes</h2><p className="text-sm text-[var(--vf-text2)]">Use essa lista para vendas, agenda, cobrança e relacionamento.</p></div>
        <div className="flex gap-2"><Input placeholder="Buscar cliente..." value={search} onChange={e => setSearch(e.target.value)} /><Button onClick={openNew}>＋ Novo cliente</Button></div>
      </div>
      {error && <Alert type="error">{(error as Error).message}</Alert>}
      {isLoading ? <Skeleton className="h-52" /> : !clientes.length ? <Empty icon="👥" title="Nenhum cliente cadastrado" description="Cadastre clientes manualmente ou registre vendas/agendamentos." action={<Button onClick={openNew}>Cadastrar cliente</Button>} /> : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {clientes.map(c => <Card key={c.id} className="p-4 space-y-3 vf-motion">
            <div className="flex items-start justify-between gap-3"><div><div className="font-semibold text-[var(--vf-text)]">{c.nome}</div><div className="text-xs text-[var(--vf-text2)]">{c.whatsapp || c.telefone || c.email || 'Sem contato'}</div></div><Badge color={c.tipo === 'lead' ? 'blue' : 'gold'}>{c.tipo || 'cliente'}</Badge></div>
            <div className="text-xs text-[var(--vf-text2)] min-h-[32px]">{c.observacoes || c.endereco || 'Sem observações.'}</div>
            <div className="flex gap-2 justify-end"><Button size="sm" variant="ghost" onClick={() => openEdit(c)}>Editar</Button><ConfirmActionButton title="Remover cliente" description="Esta ação desativa/remove o registro conforme regra do service e registra a tentativa de ação crítica." confirmLabel="Remover" onConfirm={() => excluir.mutate(c.id)}>Remover</ConfirmActionButton></div>
          </Card>)}
        </div>
      )}
    </div>
    <Modal open={modal} onClose={close} title={editing ? 'Editar cliente' : 'Novo cliente'} size="lg">
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><Field label="Nome" required><Input value={form.nome} onChange={set('nome')} /></Field><Field label="Tipo"><Select value={form.tipo} onChange={set('tipo')}><option value="cliente">Cliente</option><option value="lead">Lead</option><option value="fornecedor">Fornecedor</option></Select></Field></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4"><Field label="WhatsApp"><Input value={form.whatsapp ?? ''} onChange={set('whatsapp')} /></Field><Field label="Telefone"><Input value={form.telefone ?? ''} onChange={set('telefone')} /></Field><Field label="E-mail"><Input value={form.email ?? ''} onChange={set('email')} /></Field></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><Field label="CPF/CNPJ"><Input value={form.documento ?? ''} onChange={set('documento')} /></Field><Field label="Origem"><Input value={form.origem ?? ''} onChange={set('origem')} placeholder="Instagram, indicação, balcão..." /></Field></div>
        <Field label="Endereço"><Input value={form.endereco ?? ''} onChange={set('endereco')} /></Field>
        <Field label="Observações"><Textarea value={form.observacoes ?? ''} onChange={set('observacoes')} /></Field>
        <div className="flex justify-end gap-2"><Button variant="secondary" onClick={close}>Cancelar</Button><Button loading={salvar.isPending} onClick={() => salvar.mutate()} disabled={!form.nome.trim()}>Salvar</Button></div>
      </div>
    </Modal>
  </div>
}
