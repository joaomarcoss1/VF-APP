'use client'

import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Header from '@/components/layout/Header'
import { ConfirmActionButton, Alert, Badge, Button, Card, Empty, Field, Input, Modal, Select, Skeleton, Textarea, KpiCard } from '@/components/ui'
import { EventosService, ProdutosService } from '@/services'
import { calcularPrecificacaoEvento, fmtCurrency, fmtPct } from '@/lib/precificacao'
import type { Evento, EventoForm, EventoItem, EventoItemForm, EventoStatus, Produto, TipoEvento } from '@/types'
import toast from 'react-hot-toast'

const TIPOS_EVENTO: Array<{ value: TipoEvento; label: string }> = [
  { value: 'aniversario', label: 'Aniversário' },
  { value: 'casamento', label: 'Casamento' },
  { value: 'corporativo', label: 'Corporativo' },
  { value: 'confraternizacao', label: 'Confraternização' },
  { value: 'buffet', label: 'Buffet' },
  { value: 'delivery', label: 'Delivery/Encomenda' },
  { value: 'outro', label: 'Outro' },
]

const STATUS_EVENTO: Array<{ value: EventoStatus; label: string; color: 'gold' | 'green' | 'red' | 'blue' | 'amber' | 'gray' }> = [
  { value: 'orcamento', label: 'Orçamento', color: 'gold' },
  { value: 'aprovado', label: 'Aprovado', color: 'blue' },
  { value: 'realizado', label: 'Realizado', color: 'green' },
  { value: 'cancelado', label: 'Cancelado', color: 'red' },
]

const EMPTY_FORM: EventoForm = {
  nome: '',
  tipo_evento: 'corporativo',
  data_evento: '',
  pessoas: 50,
  margem_lucro: 200,
  taxa_operacional_percentual: 10,
  custo_operacional_extra: 0,
  desconto: 0,
  observacoes: '',
  status: 'orcamento',
  itens: [],
}

function statusMeta(status: EventoStatus) {
  return STATUS_EVENTO.find(s => s.value === status) ?? STATUS_EVENTO[0]
}

function toNumber(value: string): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function eventoToForm(evento: Evento): EventoForm {
  return {
    nome: evento.nome,
    tipo_evento: evento.tipo_evento,
    data_evento: evento.data_evento ?? '',
    pessoas: Number(evento.pessoas || 1),
    margem_lucro: Number(evento.margem_lucro || 0),
    taxa_operacional_percentual: Number(evento.taxa_operacional_percentual || 0),
    custo_operacional_extra: Number(evento.custo_operacional_extra || 0),
    desconto: Number(evento.desconto || 0),
    observacoes: evento.observacoes ?? '',
    status: evento.status,
    itens: (evento.itens ?? []).map((item: EventoItem) => ({
      produto_id: item.produto_id,
      produto_nome: item.produto_nome,
      categoria: item.categoria,
      rendimento_unitario: Number(item.rendimento_unitario || 1),
      unidade_rendimento: item.unidade_rendimento || 'porções',
      consumo_por_pessoa: Number(item.consumo_por_pessoa || 1),
      quantidade_produtos: Number(item.quantidade_produtos || 0),
      custo_unitario: Number(item.custo_unitario || 0),
      preco_unitario_base: Number(item.preco_unitario_base || 0),
      observacoes: item.observacoes ?? '',
    })),
  }
}

export default function EventosPage() {
  const qc = useQueryClient()
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<Evento | null>(null)
  const [form, setForm] = useState<EventoForm>({ ...EMPTY_FORM })
  const [produtoSelecionado, setProdutoSelecionado] = useState('')

  const { data: eventos, isLoading: loadingEventos, error: eventosError } = useQuery({
    queryKey: ['eventos'],
    queryFn: EventosService.listar,
  })

  const { data: produtos, isLoading: loadingProdutos } = useQuery({
    queryKey: ['produtos-eventos'],
    queryFn: () => ProdutosService.listar(),
  })

  const resultado = useMemo(() => calcularPrecificacaoEvento(form), [form])

  const resumo = useMemo(() => {
    const list = eventos ?? []
    return list.reduce((acc, e) => ({
      eventos: acc.eventos + 1,
      pessoas: acc.pessoas + Number(e.pessoas ?? 0),
      custo: acc.custo + Number(e.custo_total ?? 0),
      receita: acc.receita + Number(e.preco_sugerido ?? 0),
      lucro: acc.lucro + Number(e.lucro_estimado ?? 0),
    }), { eventos: 0, pessoas: 0, custo: 0, receita: 0, lucro: 0 })
  }, [eventos])

  const salvar = useMutation({
    mutationFn: (payload: EventoForm) => editing ? EventosService.atualizar(editing.id, payload) : EventosService.criar(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['eventos'] })
      toast.success(editing ? 'Evento atualizado com sucesso!' : 'Orçamento de evento salvo!')
      closeModal()
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const excluir = useMutation({
    mutationFn: EventosService.excluir,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['eventos'] })
      toast.success('Evento removido.')
    },
    onError: (error: Error) => toast.error(error.message),
  })

  function openNew() {
    setEditing(null)
    setForm({ ...EMPTY_FORM, itens: [] })
    setProdutoSelecionado('')
    setModal(true)
  }

  function openEdit(evento: Evento) {
    setEditing(evento)
    setForm(eventoToForm(evento))
    setProdutoSelecionado('')
    setModal(true)
  }

  function closeModal() {
    setModal(false)
    setEditing(null)
    setProdutoSelecionado('')
  }

  function setField<K extends keyof EventoForm>(key: K, value: EventoForm[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  function atualizarItem(index: number, patch: Partial<EventoItemForm>) {
    setForm(prev => ({
      ...prev,
      itens: prev.itens.map((item, i) => i === index ? { ...item, ...patch } : item),
    }))
  }

  function removerItem(index: number) {
    setForm(prev => ({ ...prev, itens: prev.itens.filter((_, i) => i !== index) }))
  }

  function adicionarProduto() {
    const produto = (produtos ?? []).find(p => p.id === produtoSelecionado)
    if (!produto) return toast.error('Selecione um produto.')
    if (form.itens.some(item => item.produto_id === produto.id)) return toast.error('Este produto já foi adicionado ao evento.')

    const novoItem: EventoItemForm = {
      produto_id: produto.id,
      produto_nome: produto.nome,
      categoria: produto.categoria,
      rendimento_unitario: Number(produto.rendimento || 1),
      unidade_rendimento: produto.unidade_rendimento || 'porções',
      consumo_por_pessoa: 1,
      quantidade_produtos: undefined,
      custo_unitario: Number(produto.custo_total || 0),
      preco_unitario_base: Number(produto.preco_venda || 0),
      observacoes: '',
    }

    setForm(prev => ({ ...prev, itens: [...prev.itens, novoItem] }))
    setProdutoSelecionado('')
  }

  function validarESalvar() {
    if (!form.nome.trim()) return toast.error('Informe o nome do evento.')
    if (Number(form.pessoas) <= 0) return toast.error('Informe a quantidade de pessoas.')
    if (form.itens.length === 0) return toast.error('Adicione pelo menos um produto ao evento.')
    if (resultado.custo_total <= 0) return toast.error('Os produtos selecionados ainda não possuem custo. Confira as fichas técnicas.')
    salvar.mutate(form)
  }

  async function exportarEvento(evento: Evento, tipo: 'pdf' | 'excel') {
    const exports = await import('@/lib/exports')
    if (tipo === 'pdf') await exports.exportarEventoPDF(evento)
    else await exports.exportarEventoExcel(evento)
  }

  const produtosDisponiveis = (produtos ?? []).filter((p: Produto) => p.ativo && p.disponivel)

  return (
    <div className="vf-fadein">
      <Header title="Eventos" />
      <div className="p-4 md:p-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold vf-gold-text">Precificação para Eventos</h1>
            <p className="text-sm text-[var(--vf-text2)] mt-1 max-w-2xl">
              Monte orçamentos profissionais para festas, buffets, drinks, encomendas e eventos corporativos com custo real, rendimento, margem, CMV e valor por pessoa.
            </p>
          </div>
          <Button onClick={openNew}>＋ Novo Evento</Button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <KpiCard label="Eventos salvos" value={resumo.eventos} color="gold" />
          <KpiCard label="Pessoas atendidas" value={resumo.pessoas} color="blue" />
          <KpiCard label="Custo previsto" value={fmtCurrency(resumo.custo)} color="red" />
          <KpiCard label="Receita prevista" value={fmtCurrency(resumo.receita)} color="gold" />
          <KpiCard label="Lucro previsto" value={fmtCurrency(resumo.lucro)} color="green" />
        </div>

        {eventosError && <Alert type="error">Não foi possível carregar os eventos. Verifique se o SQL atualizado foi executado no Supabase.</Alert>}

        {loadingEventos ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-56 rounded-lg" />)}
          </div>
        ) : (eventos?.length ?? 0) === 0 ? (
          <Empty
            icon="🎉"
            title="Nenhum evento cadastrado"
            description="Crie seu primeiro orçamento de evento selecionando produtos do cardápio, número de pessoas e margem desejada."
            action={<Button onClick={openNew}>Criar primeiro evento</Button>}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {eventos!.map(evento => {
              const meta = statusMeta(evento.status)
              return (
                <Card key={evento.id} className="p-4 flex flex-col gap-4 hover:border-[rgba(201,168,76,0.35)] transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-[var(--vf-text)]">{evento.nome}</div>
                      <div className="text-[11px] text-[var(--vf-text3)] mt-1">
                        {evento.pessoas} pessoas · {evento.tipo_evento} {evento.data_evento ? `· ${new Date(`${evento.data_evento}T00:00:00`).toLocaleDateString('pt-BR')}` : ''}
                      </div>
                    </div>
                    <Badge color={meta.color}>{meta.label}</Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg bg-[var(--vf-surface2)] p-3">
                      <div className="text-[10px] text-[var(--vf-text3)] uppercase">Custo total</div>
                      <div className="text-sm font-semibold text-[#D45050] mt-1">{fmtCurrency(evento.custo_total)}</div>
                    </div>
                    <div className="rounded-lg bg-[var(--vf-gold-bg)] p-3">
                      <div className="text-[10px] text-[var(--vf-text3)] uppercase">Valor sugerido</div>
                      <div className="text-sm font-semibold text-[var(--vf-primary)] mt-1">{fmtCurrency(evento.preco_sugerido)}</div>
                    </div>
                    <div className="rounded-lg bg-[rgba(61,170,107,0.06)] p-3">
                      <div className="text-[10px] text-[var(--vf-text3)] uppercase">Lucro estimado</div>
                      <div className="text-sm font-semibold text-[#3DAA6B] mt-1">{fmtCurrency(evento.lucro_estimado)}</div>
                    </div>
                    <div className="rounded-lg bg-[var(--vf-surface2)] p-3">
                      <div className="text-[10px] text-[var(--vf-text3)] uppercase">Por pessoa</div>
                      <div className="text-sm font-semibold text-[var(--vf-primary)] mt-1">{fmtCurrency(evento.preco_por_pessoa)}</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-[var(--vf-text2)]">
                    <span>{evento.itens?.length ?? 0} produto(s)</span>
                    <span>Margem {fmtPct(evento.margem_lucro)} · CMV {fmtPct(evento.cmv_percentual)}</span>
                  </div>

                  <div className="border-t border-[var(--vf-border)] pt-3 flex flex-wrap gap-2">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(evento)}>✏️ Editar</Button>
                    <Button variant="secondary" size="sm" onClick={() => exportarEvento(evento, 'pdf')}>PDF</Button>
                    <Button variant="secondary" size="sm" onClick={() => exportarEvento(evento, 'excel')}>Excel</Button>
                    <ConfirmActionButton title="Remover evento" description={`Confirme a remoção do evento "${evento.nome}". A ação fica protegida por permissão e auditoria do service.`} confirmLabel="Remover" className="ml-auto" onConfirm={() => excluir.mutate(evento.id)}>🗑️</ConfirmActionButton>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      <Modal open={modal} onClose={closeModal} title={editing ? 'Editar orçamento de evento' : 'Novo orçamento de evento'} size="xl">
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Nome do evento" required>
              <Input value={form.nome} onChange={e => setField('nome', e.target.value)} placeholder="Ex: Aniversário 80 pessoas" />
            </Field>
            <Field label="Tipo de evento">
              <Select value={form.tipo_evento} onChange={e => setField('tipo_evento', e.target.value as TipoEvento)}>
                {TIPOS_EVENTO.map(tipo => <option key={tipo.value} value={tipo.value}>{tipo.label}</option>)}
              </Select>
            </Field>
            <Field label="Data do evento">
              <Input type="date" value={form.data_evento ?? ''} onChange={e => setField('data_evento', e.target.value)} />
            </Field>
            <Field label="Status">
              <Select value={form.status} onChange={e => setField('status', e.target.value as EventoStatus)}>
                {STATUS_EVENTO.map(status => <option key={status.value} value={status.value}>{status.label}</option>)}
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Field label="Pessoas" required>
              <Input type="number" min="1" value={form.pessoas || ''} onChange={e => setField('pessoas', Math.max(1, toNumber(e.target.value)))} />
            </Field>
            <Field label="Margem de lucro (%)" hint="200% = custo × 3">
              <Input type="number" min="0" step="10" value={form.margem_lucro || ''} onChange={e => setField('margem_lucro', toNumber(e.target.value))} />
            </Field>
            <Field label="Operacional (%)" hint="Equipe, gás, deslocamento proporcional">
              <Input type="number" min="0" step="1" value={form.taxa_operacional_percentual || ''} onChange={e => setField('taxa_operacional_percentual', toNumber(e.target.value))} />
            </Field>
            <Field label="Custo extra fixo">
              <Input type="number" min="0" step="0.01" value={form.custo_operacional_extra || ''} onChange={e => setField('custo_operacional_extra', toNumber(e.target.value))} />
            </Field>
            <Field label="Desconto">
              <Input type="number" min="0" step="0.01" value={form.desconto || ''} onChange={e => setField('desconto', toNumber(e.target.value))} />
            </Field>
          </div>

          <Card className="p-4">
            <div className="flex flex-col md:flex-row md:items-end gap-3">
              <Field label="Adicionar produto do cardápio" className="flex-1">
                <Select value={produtoSelecionado} onChange={e => setProdutoSelecionado(e.target.value)} disabled={loadingProdutos}>
                  <option value="">Selecione um produto com ficha técnica</option>
                  {produtosDisponiveis.map(produto => (
                    <option key={produto.id} value={produto.id}>
                      {produto.nome} · rende {produto.rendimento} {produto.unidade_rendimento} · custo {fmtCurrency(produto.custo_total)}
                    </option>
                  ))}
                </Select>
              </Field>
              <Button onClick={adicionarProduto} disabled={!produtoSelecionado}>Adicionar</Button>
            </div>
            {produtosDisponiveis.length === 0 && !loadingProdutos && (
              <div className="mt-3">
                <Alert type="warn">Cadastre produtos e monte as fichas técnicas antes de precificar eventos.</Alert>
              </div>
            )}
          </Card>

          {form.itens.length === 0 ? (
            <Empty icon="🍽️" title="Nenhum produto no evento" description="Adicione pratos, drinks, bebidas ou sobremesas para calcular o orçamento." />
          ) : (
            <div className="space-y-3">
              {form.itens.map((item, index) => {
                const calculado = resultado.itens.find(i => i.produto_id === item.produto_id)
                return (
                  <Card key={item.produto_id} className="p-4">
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div>
                        <div className="font-semibold text-[var(--vf-text)]">{item.produto_nome}</div>
                        <div className="text-[11px] text-[var(--vf-text3)] mt-0.5">
                          Rende {item.rendimento_unitario} {item.unidade_rendimento} por unidade · custo unitário {fmtCurrency(item.custo_unitario)}
                        </div>
                      </div>
                      <Button variant="danger" size="sm" onClick={() => removerItem(index)}>Remover</Button>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                      <Field label="Consumo por pessoa">
                        <Input type="number" min="0" step="0.1" value={item.consumo_por_pessoa || ''} onChange={e => atualizarItem(index, { consumo_por_pessoa: toNumber(e.target.value), quantidade_produtos: undefined })} />
                      </Field>
                      <Field label="Rendimento unitário">
                        <Input type="number" min="1" step="0.1" value={item.rendimento_unitario || ''} onChange={e => atualizarItem(index, { rendimento_unitario: Math.max(1, toNumber(e.target.value)), quantidade_produtos: undefined })} />
                      </Field>
                      <Field label="Unid. rendimento">
                        <Input value={item.unidade_rendimento} onChange={e => atualizarItem(index, { unidade_rendimento: e.target.value })} />
                      </Field>
                      <Field label="Qtd. produtos" hint="Vazio = automático">
                        <Input type="number" min="0" step="1" value={item.quantidade_produtos ?? ''} onChange={e => atualizarItem(index, { quantidade_produtos: e.target.value ? toNumber(e.target.value) : undefined })} placeholder={String(calculado?.quantidade_produtos ?? 0)} />
                      </Field>
                      <Field label="Custo unitário">
                        <Input type="number" min="0" step="0.01" value={item.custo_unitario || ''} onChange={e => atualizarItem(index, { custo_unitario: toNumber(e.target.value) })} />
                      </Field>
                      <Field label="Preço base unit.">
                        <Input type="number" min="0" step="0.01" value={item.preco_unitario_base || ''} onChange={e => atualizarItem(index, { preco_unitario_base: toNumber(e.target.value) })} />
                      </Field>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4">
                      <div className="rounded-lg bg-[var(--vf-surface2)] p-3">
                        <div className="text-[10px] text-[var(--vf-text3)] uppercase">Qtd. necessária</div>
                        <div className="text-sm font-semibold text-[var(--vf-primary)] mt-1">{calculado?.quantidade_produtos ?? 0}</div>
                      </div>
                      <div className="rounded-lg bg-[var(--vf-surface2)] p-3">
                        <div className="text-[10px] text-[var(--vf-text3)] uppercase">Rendimento total</div>
                        <div className="text-sm font-semibold text-[var(--vf-text)] mt-1">{calculado?.rendimento_total ?? 0} {item.unidade_rendimento}</div>
                      </div>
                      <div className="rounded-lg bg-[var(--vf-surface2)] p-3">
                        <div className="text-[10px] text-[var(--vf-text3)] uppercase">Sobra estimada</div>
                        <div className="text-sm font-semibold text-[var(--vf-text2)] mt-1">{calculado?.sobra_estimada ?? 0}</div>
                      </div>
                      <div className="rounded-lg bg-[rgba(212,80,80,0.06)] p-3">
                        <div className="text-[10px] text-[var(--vf-text3)] uppercase">Custo do item</div>
                        <div className="text-sm font-semibold text-[#D45050] mt-1">{fmtCurrency(calculado?.custo_total ?? 0)}</div>
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KpiCard label="Custo dos produtos" value={fmtCurrency(resultado.custo_produtos)} color="red" />
            <KpiCard label="Custo total evento" value={fmtCurrency(resultado.custo_total)} color="red" />
            <KpiCard label="Valor sugerido" value={fmtCurrency(resultado.preco_sugerido)} color="gold" />
            <KpiCard label="Preço por pessoa" value={fmtCurrency(resultado.preco_por_pessoa)} color="blue" />
            <KpiCard label="Lucro estimado" value={fmtCurrency(resultado.lucro_estimado)} color="green" />
            <KpiCard label="CMV" value={fmtPct(resultado.cmv_percentual)} color={resultado.cmv_percentual <= 32 ? 'green' : resultado.cmv_percentual <= 38 ? 'blue' : 'red'} />
            <KpiCard label="Markup" value={`${resultado.markup.toLocaleString('pt-BR')}x`} color="gold" />
            <KpiCard label="Produtos necessários" value={resultado.total_produtos} color="blue" />
          </div>

          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-[12px] text-[var(--vf-text2)] uppercase tracking-wide">Simulação de margens</div>
              <Badge color="gray">baseado no custo total</Badge>
            </div>
            <div className="overflow-x-auto">
              <table className="vf-table">
                <thead>
                  <tr>
                    <th>Margem</th>
                    <th>Valor a cobrar</th>
                    <th>Por pessoa</th>
                    <th>Lucro</th>
                    <th>CMV</th>
                  </tr>
                </thead>
                <tbody>
                  {resultado.cenarios.map(cenario => (
                    <tr key={cenario.margem}>
                      <td><Badge color={cenario.margem === form.margem_lucro ? 'gold' : 'gray'}>{fmtPct(cenario.margem)}</Badge></td>
                      <td className="text-[var(--vf-primary)] font-semibold">{fmtCurrency(cenario.preco_sugerido)}</td>
                      <td>{fmtCurrency(cenario.preco_por_pessoa)}</td>
                      <td className="text-[#3DAA6B]">{fmtCurrency(cenario.lucro_estimado)}</td>
                      <td>{fmtPct(cenario.cmv_percentual)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Field label="Observações para o orçamento">
            <Textarea value={form.observacoes ?? ''} onChange={e => setField('observacoes', e.target.value)} placeholder="Inclua observações sobre cardápio, entrega, equipe, itens inclusos, validade da proposta etc." />
          </Field>

          <div className="flex flex-col sm:flex-row sm:justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={closeModal}>Cancelar</Button>
            <Button onClick={validarESalvar} loading={salvar.isPending}>{editing ? 'Salvar alterações' : 'Salvar orçamento'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}