'use client'
import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Header from '@/components/layout/Header'
import { ConfirmActionButton, Alert, Badge, Button, Card, Empty, Field, Input, Modal, Select, Skeleton, Textarea } from '@/components/ui'
import { ProdutosService, PromocoesService } from '@/services'
import { fmtCurrency, fmtPct } from '@/lib/precificacao'
import type { Promocao, PromocaoForm, StatusPromocao } from '@/types'
import toast from 'react-hot-toast'

const EMPTY_FORM: PromocaoForm = {
  produto_id: '',
  nome: '',
  descricao: '',
  preco_promocional: 0,
  desconto_percentual: 0,
  data_inicio: '',
  data_fim: '',
  status: 'ativa',
  exibir_cardapio: true,
  destaque: false,
}

const statusColor: Record<StatusPromocao, 'green' | 'blue' | 'red' | 'gray'> = {
  ativa: 'green',
  agendada: 'blue',
  expirada: 'red',
  pausada: 'gray',
}

export default function PromocoesPage() {
  const qc = useQueryClient()
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<Promocao | null>(null)
  const [form, setForm] = useState<PromocaoForm>(EMPTY_FORM)

  const { data: produtos, isLoading: loadingProdutos } = useQuery({ queryKey: ['produtos'], queryFn: () => ProdutosService.listar() })
  const { data: promocoes, isLoading, error } = useQuery({ queryKey: ['promocoes'], queryFn: () => PromocoesService.listar() })

  const produtoSelecionado = useMemo(() => produtos?.find(p => p.id === form.produto_id), [produtos, form.produto_id])
  const precoNormal = Number(produtoSelecionado?.preco_venda ?? 0)
  const economia = Math.max(0, precoNormal - Number(form.preco_promocional || 0))
  const desconto = precoNormal > 0 ? (economia / precoNormal) * 100 : 0

  const resumo = useMemo(() => {
    const lista = promocoes ?? []
    return {
      total: lista.length,
      ativas: lista.filter(p => PromocoesService.statusCalculado(p) === 'ativa').length,
      cardapio: lista.filter(p => p.exibir_cardapio).length,
      destaque: lista.filter(p => p.destaque).length,
    }
  }, [promocoes])

  const criar = useMutation({
    mutationFn: PromocoesService.criar,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['promocoes'] }); qc.invalidateQueries({ queryKey: ['cardapio-produtos'] }); toast.success('Promoção criada!'); closeModal() },
    onError: (e: Error) => toast.error(e.message),
  })
  const atualizar = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<PromocaoForm> }) => PromocoesService.atualizar(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['promocoes'] }); qc.invalidateQueries({ queryKey: ['cardapio-produtos'] }); toast.success('Promoção atualizada!'); closeModal() },
    onError: (e: Error) => toast.error(e.message),
  })
  const excluir = useMutation({
    mutationFn: PromocoesService.excluir,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['promocoes'] }); qc.invalidateQueries({ queryKey: ['cardapio-produtos'] }); toast.success('Promoção removida.') },
    onError: (e: Error) => toast.error(e.message),
  })
  const mudarStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'ativa' | 'pausada' }) => status === 'ativa' ? PromocoesService.ativar(id) : PromocoesService.pausar(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['promocoes'] }); qc.invalidateQueries({ queryKey: ['cardapio-produtos'] }) },
    onError: (e: Error) => toast.error(e.message),
  })

  const openNew = () => { setEditing(null); setForm(EMPTY_FORM); setModal(true) }
  const openEdit = (p: Promocao) => {
    setEditing(p)
    setForm({
      produto_id: p.produto_id,
      nome: p.nome,
      descricao: p.descricao ?? '',
      preco_promocional: Number(p.preco_promocional ?? 0),
      desconto_percentual: Number(p.desconto_percentual ?? 0),
      data_inicio: p.data_inicio ?? '',
      data_fim: p.data_fim ?? '',
      status: p.status,
      exibir_cardapio: p.exibir_cardapio,
      destaque: p.destaque,
    })
    setModal(true)
  }
  const closeModal = () => { setModal(false); setEditing(null); setForm(EMPTY_FORM) }
  const f = (k: keyof PromocaoForm) => (e: any) => setForm(prev => ({ ...prev, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  const handleSubmit = () => {
    if (!form.produto_id) return toast.error('Selecione um produto.')
    if (!form.nome.trim()) return toast.error('Informe o nome da promoção.')
    if (Number(form.preco_promocional) <= 0) return toast.error('Informe um preço promocional válido.')
    if (precoNormal > 0 && Number(form.preco_promocional) > precoNormal) return toast.error('O preço promocional não pode ser maior que o preço normal.')
    const payload = { ...form, preco_promocional: Number(form.preco_promocional), desconto_percentual: Math.round(desconto * 100) / 100 }
    if (editing) atualizar.mutate({ id: editing.id, data: payload })
    else criar.mutate(payload)
  }

  return (
    <div className="vf-fadein">
      <Header title="Promoções" />
      <div className="p-4 md:p-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-semibold text-[var(--vf-text)]">Promoções inteligentes</h1>
            <p className="text-sm text-[var(--vf-text2)] mt-1">Cadastre ofertas que aparecem automaticamente no cardápio dentro do período ativo.</p>
          </div>
          <Button onClick={openNew}>＋ Nova promoção</Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="p-4"><div className="text-[10px] uppercase text-[var(--vf-text3)] tracking-wide">Total</div><div className="text-2xl text-[var(--vf-primary)] font-semibold">{resumo.total}</div></Card>
          <Card className="p-4"><div className="text-[10px] uppercase text-[var(--vf-text3)] tracking-wide">Ativas</div><div className="text-2xl text-[#3DAA6B] font-semibold">{resumo.ativas}</div></Card>
          <Card className="p-4"><div className="text-[10px] uppercase text-[var(--vf-text3)] tracking-wide">No cardápio</div><div className="text-2xl text-[#4A8FD4] font-semibold">{resumo.cardapio}</div></Card>
          <Card className="p-4"><div className="text-[10px] uppercase text-[var(--vf-text3)] tracking-wide">Destaques</div><div className="text-2xl text-[var(--vf-primary)] font-semibold">{resumo.destaque}</div></Card>
        </div>

        {error && <Alert type="error">{(error as Error).message}</Alert>}

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-44" />)}</div>
        ) : (promocoes?.length ?? 0) === 0 ? (
          <Empty icon="🏷️" title="Nenhuma promoção cadastrada" description="Crie promoções para destacar produtos e atualizar o cardápio automaticamente." action={<Button onClick={openNew}>Criar primeira promoção</Button>} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {promocoes!.map(p => {
              const status = PromocoesService.statusCalculado(p)
              const preco = Number(p.produto?.preco_venda ?? 0)
              const eco = Math.max(0, preco - Number(p.preco_promocional ?? 0))
              const pct = preco > 0 ? (eco / preco) * 100 : Number(p.desconto_percentual ?? 0)
              return (
                <Card key={p.id} className="p-4 hover:border-[rgba(201,168,76,0.35)] transition-colors">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <div className="text-[var(--vf-text)] font-semibold text-[15px]">{p.nome}</div>
                      <div className="text-[12px] text-[var(--vf-text2)] mt-1">{p.produto?.nome ?? 'Produto não localizado'}</div>
                    </div>
                    <Badge color={statusColor[status]}>{status}</Badge>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="bg-[var(--vf-surface2)] rounded-lg p-2"><div className="text-[9px] text-[var(--vf-text3)] uppercase">Normal</div><div className="text-[12px] text-[var(--vf-text2)] line-through">{fmtCurrency(preco)}</div></div>
                    <div className="bg-[rgba(61,170,107,0.08)] rounded-lg p-2"><div className="text-[9px] text-[var(--vf-text3)] uppercase">Promo</div><div className="text-[12px] text-[#3DAA6B] font-semibold">{fmtCurrency(p.preco_promocional)}</div></div>
                    <div className="bg-[rgba(201,168,76,0.08)] rounded-lg p-2"><div className="text-[9px] text-[var(--vf-text3)] uppercase">Economia</div><div className="text-[12px] text-[var(--vf-primary)] font-semibold">{fmtPct(pct)}</div></div>
                  </div>

                  <p className="text-[12px] text-[var(--vf-text2)] min-h-[34px]">{p.descricao || 'Sem descrição promocional.'}</p>
                  <div className="flex gap-2 flex-wrap mt-4">
                    {p.exibir_cardapio && <Badge color="blue">Cardápio</Badge>}
                    {p.destaque && <Badge color="gold">Destaque</Badge>}
                    {p.data_inicio && <Badge color="gray">Início {new Date(`${p.data_inicio}T00:00:00`).toLocaleDateString('pt-BR')}</Badge>}
                    {p.data_fim && <Badge color="gray">Fim {new Date(`${p.data_fim}T00:00:00`).toLocaleDateString('pt-BR')}</Badge>}
                  </div>

                  <div className="flex gap-2 mt-4 pt-3 border-t border-[var(--vf-border)]">
                    <Button size="sm" variant="ghost" onClick={() => openEdit(p)}>✏️ Editar</Button>
                    <Button size="sm" variant="secondary" onClick={() => mudarStatus.mutate({ id: p.id, status: p.status === 'pausada' ? 'ativa' : 'pausada' })}>{p.status === 'pausada' ? 'Ativar' : 'Pausar'}</Button>
                    <ConfirmActionButton title="Excluir promoção" description="Confirme apenas se esta promoção não deve mais aparecer no fluxo comercial." confirmLabel="Excluir" className="ml-auto" onConfirm={() => excluir.mutate(p.id)}>🗑️</ConfirmActionButton>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      <Modal open={modal} onClose={closeModal} title={editing ? 'Editar promoção' : 'Nova promoção'} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Produto" required>
              <Select value={form.produto_id} onChange={f('produto_id')} disabled={loadingProdutos}>
                <option value="">Selecione...</option>
                {(produtos ?? []).map(p => <option key={p.id} value={p.id}>{p.nome} — {fmtCurrency(p.preco_venda ?? 0)}</option>)}
              </Select>
            </Field>
            <Field label="Nome da promoção" required>
              <Input value={form.nome} onChange={f('nome')} placeholder="Ex: Combo de lançamento" />
            </Field>
          </div>

          {produtoSelecionado && (
            <Alert type={Number(form.preco_promocional) > precoNormal ? 'warn' : 'info'}>
              Preço normal: <strong>{fmtCurrency(precoNormal)}</strong>. Economia estimada: <strong>{fmtCurrency(economia)}</strong> ({fmtPct(desconto)}).
            </Alert>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="Preço promocional" required>
              <Input type="number" min="0" step="0.01" value={form.preco_promocional || ''} onChange={f('preco_promocional')} placeholder="29.90" />
            </Field>
            <Field label="Início">
              <Input type="date" value={form.data_inicio ?? ''} onChange={f('data_inicio')} />
            </Field>
            <Field label="Fim">
              <Input type="date" value={form.data_fim ?? ''} onChange={f('data_fim')} />
            </Field>
          </div>

          <Field label="Descrição curta">
            <Textarea value={form.descricao ?? ''} onChange={f('descricao')} placeholder="Texto que pode aparecer no cardápio." />
          </Field>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="Status">
              <Select value={form.status} onChange={f('status')}>
                <option value="ativa">Ativa</option>
                <option value="agendada">Agendada</option>
                <option value="pausada">Pausada</option>
                <option value="expirada">Expirada</option>
              </Select>
            </Field>
            <label className="flex items-center gap-2 text-[13px] text-[var(--vf-text2)] mt-6 cursor-pointer"><input type="checkbox" checked={form.exibir_cardapio} onChange={f('exibir_cardapio')} /> Exibir no cardápio</label>
            <label className="flex items-center gap-2 text-[13px] text-[var(--vf-text2)] mt-6 cursor-pointer"><input type="checkbox" checked={form.destaque} onChange={f('destaque')} /> Destacar no cardápio</label>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={closeModal}>Cancelar</Button>
            <Button onClick={handleSubmit} loading={criar.isPending || atualizar.isPending}>{editing ? 'Salvar promoção' : 'Criar promoção'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
