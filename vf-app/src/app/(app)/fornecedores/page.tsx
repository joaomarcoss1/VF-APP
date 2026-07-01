'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Header from '@/components/layout/Header'
import { ConfirmActionButton, Button, Modal, Badge, Field, Input, Card, Empty } from '@/components/ui'
import { FornecedoresService } from '@/services'
import type { Fornecedor, FornecedorForm } from '@/types'
import toast from 'react-hot-toast'

const EMPTY: FornecedorForm = { nome:'', telefone:'', whatsapp:'', email:'', cnpj:'', endereco:'', observacoes:'', ativo:true }

export default function FornecedoresPage() {
  const qc = useQueryClient()
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<Fornecedor | null>(null)
  const [form, setForm] = useState<FornecedorForm>({ ...EMPTY })

  const { data: fornecedores, isLoading } = useQuery({ queryKey:['fornecedores'], queryFn: FornecedoresService.listar })
  const criar = useMutation({ mutationFn: FornecedoresService.criar, onSuccess: () => { qc.invalidateQueries({queryKey:['fornecedores']}); toast.success('Fornecedor criado!'); close() } })
  const atualizar = useMutation({ mutationFn: ({id,form}:any) => FornecedoresService.atualizar(id, form), onSuccess: () => { qc.invalidateQueries({queryKey:['fornecedores']}); toast.success('Atualizado!'); close() } })
  const excluir = useMutation({ mutationFn: FornecedoresService.excluir, onSuccess: () => { qc.invalidateQueries({queryKey:['fornecedores']}); toast.success('Removido.') } })

  const close = () => { setModal(false); setEditing(null); setForm({ ...EMPTY }) }
  const openNew  = () => { setEditing(null); setForm({ ...EMPTY }); setModal(true) }
  const openEdit = (f: Fornecedor) => { setEditing(f); setForm({ ...EMPTY, ...f }); setModal(true) }
  const f = (k: keyof FornecedorForm) => (e: any) => setForm(p => ({ ...p, [k]: e.target.value }))

  const handleSubmit = () => {
    if (!form.nome.trim()) return toast.error('Nome obrigatório')
    if (editing) atualizar.mutate({ id: editing.id, form })
    else criar.mutate(form as any)
  }

  return (
    <div className="vf-fadein">
      <Header title="Fornecedores" />
      <div className="p-4 md:p-6 space-y-5">
        <div className="flex justify-end">
          <Button onClick={openNew}>＋ Novo Fornecedor</Button>
        </div>

        {isLoading ? <div className="vf-skeleton h-40 rounded-lg" /> :
         (fornecedores?.length ?? 0) === 0 ? (
          <Empty icon="🚚" title="Nenhum fornecedor" description="Cadastre seus fornecedores para comparar preços."
            action={<Button onClick={openNew}>Cadastrar fornecedor</Button>} />
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {fornecedores!.map(forn => (
              <Card key={forn.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-semibold text-[var(--vf-text)]">{forn.nome}</div>
                    {forn.cnpj && <div className="text-[11px] text-[var(--vf-text3)]">CNPJ: {forn.cnpj}</div>}
                  </div>
                  <Badge color={forn.ativo ? 'green' : 'gray'}>{forn.ativo ? 'Ativo' : 'Inativo'}</Badge>
                </div>
                <div className="space-y-1 text-[12px] text-[var(--vf-text2)]">
                  {forn.telefone  && <div>📞 {forn.telefone}</div>}
                  {forn.whatsapp  && <div>💬 {forn.whatsapp}</div>}
                  {forn.email     && <div>✉️ {forn.email}</div>}
                  {forn.endereco  && <div>📍 {forn.endereco}</div>}
                  {forn.observacoes && <div className="text-[var(--vf-text3)] italic">&ldquo;{forn.observacoes}&rdquo;</div>}
                </div>
                <div className="flex items-center gap-2 pt-1 border-t border-[var(--vf-border)]">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(forn)}>✏️ Editar</Button>
                  <ConfirmActionButton title="Remover fornecedor" description="Confirme a remoção/inativação deste fornecedor." confirmLabel="Remover" onConfirm={() => excluir.mutate(forn.id)}>🗑️</ConfirmActionButton>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Modal open={modal} onClose={close} title={editing ? 'Editar Fornecedor' : 'Novo Fornecedor'} size="md">
        <div className="space-y-4">
          <Field label="Nome" required><Input value={form.nome} onChange={f('nome')} placeholder="Nome da empresa" /></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Telefone"><Input value={form.telefone??''} onChange={f('telefone')} placeholder="(11) 9xxxx-xxxx" /></Field>
            <Field label="WhatsApp"><Input value={form.whatsapp??''} onChange={f('whatsapp')} placeholder="(11) 9xxxx-xxxx" /></Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="E-mail"><Input type="email" value={form.email??''} onChange={f('email')} placeholder="contato@fornecedor.com" /></Field>
            <Field label="CNPJ"><Input value={form.cnpj??''} onChange={f('cnpj')} placeholder="00.000.000/0000-00" /></Field>
          </div>
          <Field label="Endereço"><Input value={form.endereco??''} onChange={f('endereco')} placeholder="Rua, número, cidade" /></Field>
          <Field label="Observações"><Input value={form.observacoes??''} onChange={f('observacoes')} placeholder="Condições de pagamento, prazo de entrega..." /></Field>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={close}>Cancelar</Button>
            <Button onClick={handleSubmit} loading={criar.isPending || atualizar.isPending}>{editing ? 'Salvar' : 'Cadastrar'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
