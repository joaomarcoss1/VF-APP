'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import Header from '@/components/layout/Header'
import { ConfirmActionButton, Button, Modal, Badge, Field, Input, Select, Card, Empty, Skeleton, SearchInput, Pagination } from '@/components/ui'
import { FeatureConfigService, IdentidadeService, ProdutosService } from '@/services'
import { fmtCurrency, fmtPct, avaliarCMV } from '@/lib/precificacao'
import { getSectorProfile, isFeatureEnabled } from '@/lib/modules'
import type { Produto } from '@/types'
import toast from 'react-hot-toast'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useTenant } from '@/hooks/useTenant'

const CATEGORIAS_POR_RAMO: Record<string, Array<{ value: string; label: string }>> = {
  alimenticio: [
    { value: 'prato', label: 'Prato' }, { value: 'drink', label: 'Drink' }, { value: 'lanche', label: 'Lanche' },
    { value: 'sobremesa', label: 'Sobremesa' }, { value: 'bebida', label: 'Bebida' }, { value: 'entrada', label: 'Entrada' }, { value: 'outro', label: 'Outro' },
  ],
  restaurante: [{ value: 'prato', label: 'Prato' }, { value: 'bebida', label: 'Bebida' }, { value: 'sobremesa', label: 'Sobremesa' }, { value: 'outro', label: 'Outro' }],
  bar: [{ value: 'drink', label: 'Drink' }, { value: 'bebida', label: 'Bebida' }, { value: 'lanche', label: 'Petisco/Lanche' }, { value: 'outro', label: 'Outro' }],
  confeitaria: [{ value: 'bolo', label: 'Bolo' }, { value: 'doce', label: 'Doce' }, { value: 'sobremesa', label: 'Sobremesa' }, { value: 'produto', label: 'Produto' }, { value: 'outro', label: 'Outro' }],
  roupas: [{ value: 'roupa', label: 'Roupa' }, { value: 'calcado', label: 'Calçado' }, { value: 'acessorio', label: 'Acessório' }, { value: 'variado', label: 'Variado' }],
  eletronicos: [{ value: 'eletronico', label: 'Eletrônico' }, { value: 'acessorio', label: 'Acessório' }, { value: 'servico', label: 'Serviço' }, { value: 'variado', label: 'Variado' }],
  loja_variedades: [{ value: 'produto', label: 'Produto' }, { value: 'acessorio', label: 'Acessório' }, { value: 'variado', label: 'Variado' }, { value: 'outro', label: 'Outro' }],
  prestador_servico: [{ value: 'servico', label: 'Serviço' }, { value: 'produto', label: 'Produto' }, { value: 'outro', label: 'Outro' }],
  barbearia: [{ value: 'corte', label: 'Corte' }, { value: 'barba', label: 'Barba' }, { value: 'servico', label: 'Serviço' }, { value: 'produto', label: 'Produto' }],
  fotografia: [{ value: 'pacote_foto', label: 'Pacote fotográfico' }, { value: 'servico', label: 'Serviço' }, { value: 'produto', label: 'Produto' }],
  outro: [{ value: 'produto', label: 'Produto' }, { value: 'servico', label: 'Serviço' }, { value: 'variado', label: 'Variado' }, { value: 'outro', label: 'Outro' }],
}
const getCategorias = (tipo?: string) => CATEGORIAS_POR_RAMO[tipo || ''] || CATEGORIAS_POR_RAMO.outro
const EMPTY_FORM = {
  nome: '', descricao: '', categoria: 'produto' as any, foto_url: '', sku: '', codigo_barras: '', marca: '', modelo: '', tamanho: '', cor: '', duracao_min: 0, tipo_cadastro: 'produto',
  tempo_preparo_min: 0, rendimento: 1, unidade_rendimento: 'unidade',
  modo_preparo: '', custo_base: 0, custo_frete: 0, custo_taxas: 0, custo_embalagem: 0, custo_operacional: 0, custo_outros: 0, custo_total: 0, margem_aplicada: 100, preco_venda: 0, preco_manual: true, ativo: true, destaque: false, disponivel: true, setor_producao: 'balcao', aparece_no_atendimento: true, ordem_atendimento: 0,
}

export default function ProdutosPage() {
  const qc = useQueryClient()
  const router = useRouter()
  const tenant = useTenant()
  const { data: identidade } = useQuery({ queryKey: ['identidade-produtos'], queryFn: IdentidadeService.obter })
  const { data: moduleConfig } = useQuery({ queryKey: ['setor-modulos'], queryFn: FeatureConfigService.listar, retry: false, staleTime: 60_000 })
  const perfilSetor = getSectorProfile(identidade?.tipo)
  const categorias = perfilSetor.categories
  const labels = perfilSetor.productLabels
  const modoProduto = perfilSetor.productMode
  const fichaHabilitada = isFeatureEnabled(identidade?.tipo, 'fichas', moduleConfig)
  const usarFichaTecnica = fichaHabilitada && ['alimentacao', 'hibrido'].includes(modoProduto)
  const [catFilter, setCatFilter] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 20
  const debouncedSearch = useDebouncedValue(search, 350)
  const [modal, setModal]         = useState(false)
  const [editing, setEditing]     = useState<Produto | null>(null)
  const [form, setForm]           = useState({ ...EMPTY_FORM })

  const { data: historicoPreco } = useQuery({
    queryKey: ['historico-precos', editing?.id],
    queryFn: () => editing?.id ? ProdutosService.historicoPrecos(editing.id) : Promise.resolve([]),
    enabled: !!editing?.id && modal,
  })

  const { data: produtosPage, isLoading } = useQuery({
    queryKey: ['produtos-v9-4', tenant.operationalKey, page, pageSize, debouncedSearch, catFilter],
    queryFn: () => ProdutosService.listarPaginado({ page, pageSize, search: debouncedSearch, category: catFilter || undefined }),
    placeholderData: (previous) => previous,
  })
  const produtos = (produtosPage?.data ?? []) as Produto[]
  const totalProdutos = produtosPage?.total ?? 0

  const criar = useMutation({
    mutationFn: ProdutosService.criar,
    onSuccess: (p) => { qc.invalidateQueries({queryKey:['produtos-v9-4']}); toast.success(`${labels.singular} criado!`); closeModal(); if (usarFichaTecnica) router.push(`/fichas?produto=${p.id}`) },
    onError: (err: any) => toast.error(err?.message ?? 'Não foi possível criar o produto.')
  })
  const atualizar = useMutation({
    mutationFn: ({ id, form }: any) => ProdutosService.atualizar(id, form),
    onSuccess: () => { qc.invalidateQueries({queryKey:['produtos-v9-4']}); toast.success('Produto atualizado!'); closeModal() },
    onError: (err: any) => toast.error(err?.message ?? 'Não foi possível salvar o produto editado.')
  })
  const excluir = useMutation({
    mutationFn: ProdutosService.excluir,
    onSuccess: () => { qc.invalidateQueries({queryKey:['produtos-v9-4']}); toast.success('Produto removido.') },
    onError: (err: any) => toast.error(err?.message ?? 'Não foi possível remover o produto.')
  })

  const openNew  = () => { setEditing(null); setForm({ ...EMPTY_FORM }); setModal(true) }
  const openEdit = (p: Produto) => { setEditing(p); setForm({ ...EMPTY_FORM, ...p } as any); setModal(true) }
  const closeModal = () => { setModal(false); setEditing(null) }
  const f = (k: string) => (e: any) => setForm(p => {
    const next = { ...p, [k]: e.target.value } as any
    const costKeys = ['custo_base','custo_frete','custo_taxas','custo_embalagem','custo_operacional','custo_outros']
    if (costKeys.includes(k)) {
      next.custo_total = costKeys.reduce((sum, key) => sum + Number(next[key] || 0), 0)
    }
    return next
  })

  const handleSubmit = () => {
    const custoDetalhado = ['custo_base','custo_frete','custo_taxas','custo_embalagem','custo_operacional','custo_outros'].reduce((sum, key) => sum + Number((form as any)[key] || 0), 0)
    const data = { ...form, tempo_preparo_min: Number(form.tempo_preparo_min || 0), rendimento: Number(form.rendimento || 1), custo_total: Number(custoDetalhado || (form as any).custo_total || 0), margem_aplicada: Number(form.margem_aplicada || 0), preco_venda: Number(form.preco_venda || 0), preco_manual: Boolean(form.preco_manual), sku: (form as any).sku || null, codigo_barras: (form as any).codigo_barras || null, marca: (form as any).marca || null, modelo: (form as any).modelo || null, tamanho: (form as any).tamanho || null, cor: (form as any).cor || null, duracao_min: Number((form as any).duracao_min || form.tempo_preparo_min || 0), tipo_cadastro: modoProduto, custo_base: Number((form as any).custo_base || 0), custo_frete: Number((form as any).custo_frete || 0), custo_taxas: Number((form as any).custo_taxas || 0), custo_embalagem: Number((form as any).custo_embalagem || 0), custo_operacional: Number((form as any).custo_operacional || 0), custo_outros: Number((form as any).custo_outros || 0), setor_producao: (form as any).setor_producao || 'balcao', aparece_no_atendimento: Boolean((form as any).aparece_no_atendimento ?? true), ordem_atendimento: Number((form as any).ordem_atendimento || 0) }
    if (!data.nome.trim()) return toast.error('Nome obrigatório')
    if (editing) atualizar.mutate({ id: editing.id, form: data })
    else criar.mutate(data as any)
  }

  const categoriasVisiveis = categorias

  return (
    <div className="vf-fadein">
      <Header title={labels.plural} />
      <div className="p-4 md:p-6 space-y-5">

        {/* Filter bar */}
        <div className="flex flex-wrap gap-2 items-center justify-between">
          <div className="flex flex-wrap gap-2">
            <Button variant={catFilter==='' ? 'primary' : 'ghost'} size="sm" onClick={() => { setCatFilter(''); setPage(1) }}>Todos</Button>
            {categoriasVisiveis.map((category) => (
              <Button key={category.value} variant={catFilter===category.value ? 'secondary' : 'ghost'} size="sm" onClick={() => { setCatFilter(category.value); setPage(1) }}>
                {category.label}
              </Button>
            ))}
          </div>
          <div className="flex flex-1 min-w-[260px] justify-end gap-2">
            <SearchInput className="max-w-sm flex-1" value={search} onChange={(value) => { setSearch(value); setPage(1) }} placeholder={`Buscar ${labels.plural.toLowerCase()}...`} />
            <Button variant="secondary" size="sm" onClick={async () => {
              const { exportarProdutosExcel } = await import('@/lib/exports')
              const exportItems = await ProdutosService.listar(debouncedSearch || undefined)
              exportarProdutosExcel(exportItems)
            }}>↓ Excel</Button>
            <Button onClick={openNew} size="sm">＋ {labels.newButton}</Button>
          </div>
        </div>

        {/* Cards grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({length:6}).map((_,i) => <Skeleton key={i} className="h-48 rounded-lg" />)}
          </div>
        ) : (produtos?.length ?? 0) === 0 ? (
          <Empty icon="🍽️" title={labels.emptyTitle}
            description={labels.emptyDescription}
            action={<Button onClick={openNew}>Criar primeiro cadastro</Button>} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {produtos!.map(p => {
              const cmv = avaliarCMV(p.cmv_percentual ?? 0)
              return (
                <Card key={p.id} className="flex flex-col overflow-hidden hover:border-[color-mix(in_srgb,var(--vf-secondary)_42%,transparent)] transition-colors">
                  <div className="p-4 flex-1">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div>
                        <div className="font-semibold text-[var(--vf-text)] text-[14px]">{p.nome}</div>
                        <div className="text-[11px] text-[var(--vf-text3)] mt-0.5">{modoProduto === 'varejo' ? `${p.rendimento} ${p.unidade_rendimento}` : `${p.tempo_preparo_min}min · ${p.rendimento} ${p.unidade_rendimento}`}</div>
                      </div>
                      <div className="flex gap-1 flex-wrap justify-end">
                        <Badge color="gray">{p.categoria}</Badge>
                        {p.destaque && <Badge color="gold">★</Badge>}
                        {p.preco_manual && <Badge color="blue">Manual</Badge>}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 mb-3">
                      <div className="bg-[var(--vf-surface2)] rounded-lg p-2.5 text-center">
                        <div className="text-[9px] text-[var(--vf-text3)] uppercase tracking-wide">Custo</div>
                        <div className="text-[12px] font-semibold text-[var(--vf-text2)] mt-0.5">{fmtCurrency(p.custo_total)}</div>
                      </div>
                      <div className="bg-[var(--vf-gold-bg)] rounded-lg p-2.5 text-center">
                        <div className="text-[9px] text-[var(--vf-text3)] uppercase tracking-wide">Venda</div>
                        <div className="text-[12px] font-semibold text-[var(--vf-primary)] mt-0.5">{fmtCurrency(p.preco_venda ?? 0)}</div>
                      </div>
                      <div className="bg-[color-mix(in_srgb,var(--vf-success)_6%,transparent)] rounded-lg p-2.5 text-center">
                        <div className="text-[9px] text-[var(--vf-text3)] uppercase tracking-wide">Margem</div>
                        <div className="text-[12px] font-semibold text-[var(--vf-success)] mt-0.5">{fmtPct(p.margem_bruta ?? 0)}</div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-[var(--vf-text3)]">CMV: <span style={{ color: cmv.cor }}>{fmtPct(p.cmv_percentual ?? 0)}</span></span>
                      <span className="text-[var(--vf-text3)]">Lucro: <span className="text-[var(--vf-success)]">{fmtCurrency(p.lucro_bruto ?? 0)}</span></span>
                    </div>
                  </div>

                  <div className="border-t border-[var(--vf-border)] px-4 py-2.5 flex items-center gap-2">
                    {usarFichaTecnica && <Button variant="ghost" size="sm" onClick={() => router.push(`/fichas?produto=${p.id}`)}>📋 Ficha</Button>}
                    <Button variant="ghost" size="sm" onClick={() => openEdit(p)}>✏️ Editar</Button>
                    <ConfirmActionButton title="Remover produto" description={`Confirme a remoção de "${p.nome}". Esta ação é validada pelo service e pelo RLS.`} confirmLabel="Remover" className="ml-auto" onConfirm={() => excluir.mutate(p.id)}>🗑️</ConfirmActionButton>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
        <Pagination page={page} pageSize={pageSize} total={totalProdutos} onChange={setPage} />
      </div>

      {/* Modal Produto */}
      <Modal open={modal} onClose={closeModal} title={editing ? `Editar ${labels.singular}` : labels.newButton} size="xl">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label={labels.name} required>
              <Input value={form.nome} onChange={f('nome')} placeholder={modoProduto === 'servico' ? 'Ex: Corte de cabelo, Ensaio externo, Pintura residencial' : modoProduto === 'varejo' ? 'Ex: Camisa premium, Fone bluetooth' : 'Ex: Smash Burger Duplo'} />
            </Field>
            <Field label={labels.category} required>
              <Select value={form.categoria} onChange={f('categoria')}>
                {categorias.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </Select>
            </Field>
          </div>

          {modoProduto === 'varejo' && (
            <Card className="p-4 bg-[color-mix(in_srgb,var(--vf-surface)_82%,transparent)] space-y-3">
              <div className="text-[12px] text-[var(--vf-text3)] uppercase tracking-wide font-semibold">Dados de varejo</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <Field label="SKU / código interno"><Input value={(form as any).sku || ''} onChange={f('sku')} placeholder="SKU-001" /></Field>
                <Field label="Código de barras"><Input value={(form as any).codigo_barras || ''} onChange={f('codigo_barras')} placeholder="EAN/GTIN" /></Field>
                <Field label="Marca"><Input value={(form as any).marca || ''} onChange={f('marca')} placeholder="Marca" /></Field>
                <Field label="Modelo"><Input value={(form as any).modelo || ''} onChange={f('modelo')} placeholder="Modelo/referência" /></Field>
                <Field label="Tamanho"><Input value={(form as any).tamanho || ''} onChange={f('tamanho')} placeholder="P, M, G, 42..." /></Field>
                <Field label="Cor"><Input value={(form as any).cor || ''} onChange={f('cor')} placeholder="Azul, preto..." /></Field>
              </div>
            </Card>
          )}



          <Card className="p-4 bg-[color-mix(in_srgb,var(--vf-primary)_5%,transparent)] space-y-3">
            <div className="text-[12px] text-[var(--vf-text3)] uppercase tracking-wide font-semibold">VF Nexus Atendimento</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Field label="Setor de produção">
                <Select value={(form as any).setor_producao || 'balcao'} onChange={f('setor_producao')}>
                  <option value="cozinha">Cozinha</option>
                  <option value="bar">Bar</option>
                  <option value="balcao">Balcão</option>
                  <option value="nenhum">Não enviar para produção</option>
                </Select>
              </Field>
              <Field label="Ordem no atendimento">
                <Input type="number" min="0" value={(form as any).ordem_atendimento || ''} onChange={f('ordem_atendimento')} placeholder="0" />
              </Field>
              <Field label="Visibilidade">
                <label className="flex min-h-[42px] items-center gap-2 rounded-xl border border-[var(--vf-border)] px-3 text-[13px] text-[var(--vf-text2)]">
                  <input type="checkbox" checked={Boolean((form as any).aparece_no_atendimento ?? true)} onChange={e => setForm(p => ({ ...p, aparece_no_atendimento: e.target.checked } as any))} />
                  Aparece no VF Nexus Atendimento
                </label>
              </Field>
            </div>
          </Card>

          {modoProduto === 'servico' && (
            <Card className="p-4 bg-[color-mix(in_srgb,var(--vf-surface)_82%,transparent)] space-y-3">
              <div className="text-[12px] text-[var(--vf-text3)] uppercase tracking-wide font-semibold">Dados do serviço</div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Field label="Duração média" hint="Usado em agenda e organização de horários."><Input type="number" min="0" value={(form as any).duracao_min || form.tempo_preparo_min || ''} onChange={f('duracao_min')} placeholder="30" /></Field>
                <Field label="Unidade de cobrança"><Input value={form.unidade_rendimento} onChange={f('unidade_rendimento')} placeholder="serviço, pacote, hora" /></Field>
                <Field label="Custo estimado"><Input type="number" min="0" step="0.01" value={(form as any).custo_base || ''} onChange={f('custo_base')} placeholder="0,00" /></Field>
              </div>
            </Card>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label={labels.time}>
              <Input type="number" min="0" value={form.tempo_preparo_min || ''} onChange={f('tempo_preparo_min')} placeholder="15" />
            </Field>
            <Field label={modoProduto === 'servico' ? 'Quantidade/base de cobrança' : 'Rendimento'}>
              <Input type="number" step="0.5" min="1" value={form.rendimento || ''} onChange={f('rendimento')} placeholder="1" />
            </Field>
            <Field label={labels.unit}>
              <Input value={form.unidade_rendimento} onChange={f('unidade_rendimento')} placeholder="porção" />
            </Field>
          </div>

          <Card className="p-4 bg-[color-mix(in_srgb,var(--vf-surface)_82%,transparent)] space-y-3">
            <div>
              <div className="text-[12px] text-[var(--vf-text3)] uppercase tracking-wide font-semibold">Composição completa do custo</div>
              <p className="text-[12px] text-[var(--vf-text3)] mt-1">Inclua compra, frete, taxas, embalagem e custos operacionais. O custo total é recalculado automaticamente.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
              {[
                ['custo_base','Custo base/compra'], ['custo_frete','Frete'], ['custo_taxas','Taxas'], ['custo_embalagem','Embalagem'], ['custo_operacional','Operacional'], ['custo_outros','Outros']
              ].map(([key,label]) => (
                <Field key={key} label={label}>
                  <Input type="number" step="0.01" min="0" value={(form as any)[key] || ''} onChange={f(key)} placeholder="0,00" />
                </Field>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field label="Custo total" hint={usarFichaTecnica && ((editing as any)?.ficha_tecnica?.length ?? 0) > 0 ? 'Calculado automaticamente pela ficha técnica. Edite os ingredientes em /fichas para alterar o custo.' : 'Soma dos custos acima. Pode ser preenchido diretamente quando não houver detalhamento.'}>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={(form as any).custo_total || ''}
                  onChange={f('custo_total')}
                  placeholder="Ex: 20.00"
                  readOnly={usarFichaTecnica && ((editing as any)?.ficha_tecnica?.length ?? 0) > 0}
                  className={usarFichaTecnica && ((editing as any)?.ficha_tecnica?.length ?? 0) > 0 ? 'opacity-70 cursor-not-allowed' : ''}
                />
              </Field>
              <Field label="Margem aplicada (%)" hint="Usada quando o preço não for manual. 300% = custo × 4.">
                <div className="space-y-2">
                  <Input type="number" min="50" max="2000" step="10" value={form.margem_aplicada || ''} onChange={f('margem_aplicada')} />
                  <div className="flex gap-2 flex-wrap">
                    {[100,200,300,400,500].map(m => (
                      <Button key={m} variant={Number(form.margem_aplicada)===m ? 'secondary' : 'ghost'} size="sm"
                        onClick={() => setForm(p => ({ ...p, margem_aplicada: m }))}>{m}%</Button>
                    ))}
                  </div>
                </div>
              </Field>
              <Field label={labels.price} hint="Marque preço manual para manter esse valor quando custos ou fichas mudarem.">
                <div className="space-y-2">
                  <Input type="number" step="0.01" min="0" value={form.preco_venda || ''} onChange={f('preco_venda')} placeholder="Ex: 39.90" />
                  <label className="flex items-center gap-2 text-[12px] text-[var(--vf-text3)]"><input type="checkbox" checked={Boolean(form.preco_manual)} onChange={e => setForm(p => ({ ...p, preco_manual: e.target.checked }))} /> Manter preço manual</label>
                </div>
              </Field>
            </div>
          </Card>

          <Field label={labels.description}>
            <Input value={form.descricao ?? ''} onChange={f('descricao')} placeholder={modoProduto === 'servico' ? 'Descreva o serviço, escopo ou pacote' : 'Descrição para catálogo, cardápio ou relatório'} />
          </Field>

          <Field label={labels.notes}>
            <textarea className="vf-input min-h-[80px] resize-y" value={form.modo_preparo ?? ''} onChange={f('modo_preparo')} placeholder={modoProduto === 'alimentacao' ? 'Passo a passo do preparo...' : 'Observações, detalhes, condições, garantia ou escopo...'} />
          </Field>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-[13px] text-[var(--vf-text2)] cursor-pointer">
              <input type="checkbox" checked={form.destaque} onChange={e => setForm(p => ({...p, destaque: e.target.checked}))} />
              Produto em destaque ★
            </label>
            <label className="flex items-center gap-2 text-[13px] text-[var(--vf-text2)] cursor-pointer">
              <input type="checkbox" checked={form.disponivel} onChange={e => setForm(p => ({...p, disponivel: e.target.checked}))} />
              Disponível para venda
            </label>
          </div>

          {editing && (historicoPreco?.length ?? 0) > 0 && (
            <Card className="p-3 bg-[var(--vf-surface)]">
              <div className="text-[11px] text-[var(--vf-text3)] uppercase tracking-wide mb-2">Histórico recente de preço</div>
              <div className="space-y-2 max-h-36 overflow-y-auto">
                {historicoPreco!.slice(0, 6).map(h => (
                  <div key={h.id} className="flex items-center justify-between gap-2 text-[12px] border-b border-[color-mix(in_srgb,var(--vf-border)_35%,transparent)] pb-2 last:border-0">
                    <span className="text-[var(--vf-text2)]">{new Date(h.alterado_em).toLocaleString('pt-BR')}</span>
                    <span className="text-[var(--vf-primary)]">{fmtCurrency(Number(h.preco_anterior ?? 0))} → {fmtCurrency(Number(h.preco_novo ?? 0))}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={closeModal}>Cancelar</Button>
            <Button onClick={handleSubmit} loading={criar.isPending || atualizar.isPending}>
              {editing ? 'Salvar alterações' : usarFichaTecnica ? 'Criar e montar ficha técnica →' : 'Criar cadastro'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
