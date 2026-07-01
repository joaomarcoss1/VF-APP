'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Header from '@/components/layout/Header'
import { ConfirmActionButton, Button, Modal, Badge, Field, Input, Select, Card, Empty, Skeleton, Alert } from '@/components/ui'
import { InsumosService, FornecedoresService } from '@/services'
import { fmtCurrency, formatarCustoUnitario } from '@/lib/precificacao'
import type { Insumo, InsumoForm } from '@/types'
import toast from 'react-hot-toast'

const UNIDADES = ['kg','g','litro','ml','unidade','caixa','fardo','duzia']
const EMPTY_FORM: InsumoForm = {
  categoria_id: '', fornecedor_id: '', nome: '', descricao: '',
  unidade_compra: 'kg', quantidade_compra: 0, valor_compra: 0,
  estoque_atual: 0, estoque_minimo: 0, estoque_ideal: 0,
  data_vencimento: '', ativo: true, data_ultima_compra: new Date().toISOString().split('T')[0]
}

export default function InsumosPage() {
  const qc = useQueryClient()
  const [search, setSearch]   = useState('')
  const [modal, setModal]     = useState(false)
  const [editing, setEditing] = useState<Insumo | null>(null)
  const [form, setForm]       = useState<InsumoForm>(EMPTY_FORM)

  const { data: insumos, isLoading } = useQuery({
    queryKey: ['insumos', search],
    queryFn: () => InsumosService.listar(search || undefined),
  })

  const { data: fornecedores } = useQuery({ queryKey: ['fornecedores'], queryFn: FornecedoresService.listar })

  const criar = useMutation({
    mutationFn: InsumosService.criar,
    onSuccess: () => { qc.invalidateQueries({queryKey:['insumos']}); toast.success('Insumo criado!'); closeModal() }
  })
  const atualizar = useMutation({
    mutationFn: ({ id, form }: { id: string; form: Partial<InsumoForm> }) => InsumosService.atualizar(id, form),
    onSuccess: () => { qc.invalidateQueries({queryKey:['insumos']}); toast.success('Insumo atualizado!'); closeModal() }
  })
  const excluir = useMutation({
    mutationFn: InsumosService.excluir,
    onSuccess: () => { qc.invalidateQueries({queryKey:['insumos']}); toast.success('Insumo removido.') }
  })

  const openNew  = () => { setEditing(null); setForm(EMPTY_FORM); setModal(true) }
  const openEdit = (i: Insumo) => { setEditing(i); setForm({ ...i } as any); setModal(true) }
  const closeModal = () => { setModal(false); setEditing(null) }

  const f = (k: keyof InsumoForm) => (e: any) => setForm(p => ({ ...p, [k]: e.target.value }))

  const handleSubmit = () => {
    const data = { ...form,
      quantidade_compra: Number(form.quantidade_compra),
      valor_compra: Number(form.valor_compra),
      estoque_atual: Number(form.estoque_atual),
      estoque_minimo: Number(form.estoque_minimo),
      estoque_ideal: Number(form.estoque_ideal),
    }
    if (!data.nome.trim()) return toast.error('Nome obrigatório')
    if (data.valor_compra <= 0) return toast.error('Informe o valor de compra')
    if (data.quantidade_compra <= 0) return toast.error('Informe a quantidade comprada')
    if (editing) atualizar.mutate({ id: editing.id, form: data })
    else criar.mutate(data as any)
  }

  // Custo unitário preview
  const previewCusto = (() => {
    const q = Number(form.quantidade_compra)
    const v = Number(form.valor_compra)
    if (!q || !v) return null
    const base = v / q
    if (form.unidade_compra === 'kg')    return `R$ ${(base).toFixed(4)}/kg  |  R$ ${(base/1000).toFixed(6)}/g`
    if (form.unidade_compra === 'g')     return `R$ ${(base).toFixed(6)}/g  |  R$ ${(base*1000).toFixed(4)}/kg`
    if (form.unidade_compra === 'litro') return `R$ ${(base).toFixed(4)}/L  |  R$ ${(base/1000).toFixed(6)}/ml`
    if (form.unidade_compra === 'ml')    return `R$ ${(base).toFixed(6)}/ml  |  R$ ${(base*1000).toFixed(4)}/L`
    return `R$ ${(base).toFixed(4)}/unidade`
  })()

  return (
    <div className="vf-fadein">
      <Header title="Insumos" />
      <div className="p-4 md:p-6">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <input className="vf-input flex-1" placeholder="🔍 Buscar insumo..." value={search} onChange={e => setSearch(e.target.value)} />
          <Button onClick={openNew} size="md">＋ Novo Insumo</Button>
          <Button variant="secondary" onClick={async () => {
            const { exportarInsumosExcel } = await import('@/lib/exports')
            exportarInsumosExcel(insumos ?? [])
          }}>↓ Excel</Button>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="space-y-2">{Array.from({length:5}).map((_,i) => <Skeleton key={i} className="h-12 rounded-lg" />)}</div>
        ) : (insumos?.length ?? 0) === 0 ? (
          <Empty icon="🧂" title="Nenhum insumo cadastrado"
            description="Cadastre seus ingredientes, embalagens e materiais para começar a precificar."
            action={<Button onClick={openNew}>Cadastrar primeiro insumo</Button>} />
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <table className="vf-table">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Unidade</th>
                    <th>Qtd Compra</th>
                    <th>Valor Pago</th>
                    <th>Custo Unitário</th>
                    <th>Estoque Atual</th>
                    <th>Status</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {insumos!.map(ins => {
                    const semEstoque = ins.estoque_minimo > 0 && ins.estoque_atual <= ins.estoque_minimo
                    return (
                      <tr key={ins.id}>
                        <td>
                          <div className="font-medium text-[var(--vf-text)]">{ins.nome}</div>
                          {ins.categoria?.nome && <div className="text-[10px] text-[var(--vf-text3)] mt-0.5">{ins.categoria.nome}</div>}
                        </td>
                        <td><Badge color="gray">{ins.unidade_compra}</Badge></td>
                        <td>{ins.quantidade_compra} {ins.unidade_compra}</td>
                        <td>{fmtCurrency(ins.valor_compra)}</td>
                        <td className="text-[var(--vf-primary)] font-medium font-mono text-xs">{formatarCustoUnitario(ins)}</td>
                        <td>
                          <span className={semEstoque ? 'text-[#D45050] font-semibold' : 'text-[var(--vf-text2)]'}>
                            {ins.estoque_atual} {ins.unidade_compra}
                          </span>
                        </td>
                        <td>
                          {semEstoque ? <Badge color="red">Estoque baixo</Badge>
                           : ins.data_vencimento && new Date(ins.data_vencimento) <= new Date(Date.now() + 3*86400000)
                             ? <Badge color="amber">Vencendo</Badge>
                             : <Badge color="green">OK</Badge>}
                        </td>
                        <td>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="sm" onClick={() => openEdit(ins)}>✏️</Button>
                            <ConfirmActionButton title="Remover insumo" description={`Confirme a remoção de "${ins.nome}". Esta ação exige permissão no service/RLS.`} confirmLabel="Remover" onConfirm={() => excluir.mutate(ins.id)}>🗑️</ConfirmActionButton>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>

      {/* Modal */}
      <Modal open={modal} onClose={closeModal} title={editing ? 'Editar Insumo' : 'Novo Insumo'} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Nome do insumo" required>
              <Input value={form.nome} onChange={f('nome')} placeholder="Ex: Carne bovina 80/20" />
            </Field>
            <Field label="Fornecedor">
              <Select value={form.fornecedor_id ?? ''} onChange={f('fornecedor_id')}>
                <option value="">Sem fornecedor</option>
                {fornecedores?.map(forn => <option key={forn.id} value={forn.id}>{forn.nome}</option>)}
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Unidade de compra" required>
              <Select value={form.unidade_compra} onChange={f('unidade_compra')}>
                {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
              </Select>
            </Field>
            <Field label="Quantidade comprada" required>
              <Input type="number" step="0.001" min="0" value={form.quantidade_compra || ''} onChange={f('quantidade_compra')} placeholder="Ex: 5" />
            </Field>
            <Field label="Valor total pago (R$)" required>
              <Input type="number" step="0.01" min="0" value={form.valor_compra || ''} onChange={f('valor_compra')} placeholder="Ex: 79.90" />
            </Field>
          </div>

          {previewCusto && (
            <Alert type="info">
              <strong>Custo calculado:</strong> {previewCusto}
            </Alert>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Estoque atual">
              <Input type="number" step="0.001" min="0" value={form.estoque_atual || ''} onChange={f('estoque_atual')} placeholder="0" />
            </Field>
            <Field label="Estoque mínimo">
              <Input type="number" step="0.001" min="0" value={form.estoque_minimo || ''} onChange={f('estoque_minimo')} placeholder="0" />
            </Field>
            <Field label="Estoque ideal">
              <Input type="number" step="0.001" min="0" value={form.estoque_ideal || ''} onChange={f('estoque_ideal')} placeholder="0" />
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Data de vencimento">
              <Input type="date" value={form.data_vencimento ?? ''} onChange={f('data_vencimento')} />
            </Field>
            <Field label="Data da última compra">
              <Input type="date" value={form.data_ultima_compra} onChange={f('data_ultima_compra')} />
            </Field>
          </div>

          <Field label="Descrição / observações">
            <Input value={form.descricao ?? ''} onChange={f('descricao')} placeholder="Opcional" />
          </Field>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={closeModal}>Cancelar</Button>
            <Button onClick={handleSubmit} loading={criar.isPending || atualizar.isPending}>
              {editing ? 'Salvar alterações' : 'Cadastrar insumo'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
