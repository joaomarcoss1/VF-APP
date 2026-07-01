'use client'
import { Suspense, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'next/navigation'
import Header from '@/components/layout/Header'
import { Button, Modal, Badge, Field, Input, Select, Card, Empty, Alert } from '@/components/ui'
import { ProdutosService, FichaService, InsumosService, ConfigService } from '@/services'
import { fmtCurrency, fmtPct, calcularPrecificacao, avaliarCMV, getCustoUnitario } from '@/lib/precificacao'
import type { Insumo } from '@/types'
import toast from 'react-hot-toast'

const UNIDADES_FICHA = ['kg','g','litro','ml','unidade']

function FichasContent() {
  const qc = useQueryClient()
  const sp = useSearchParams()
  const produtoParam = sp.get('produto')

  const [selectedProdutoId, setSelectedProdutoId] = useState(produtoParam ?? '')
  const [addModal, setAddModal] = useState(false)
  const [ingSearch, setIngSearch] = useState('')
  const [selectedIng, setSelectedIng] = useState<Insumo | null>(null)
  const [quantidade, setQuantidade] = useState('')
  const [unidade, setUnidade] = useState('g')

  const { data: produtos } = useQuery({ queryKey: ['produtos'], queryFn: () => ProdutosService.listar() })
  const { data: config } = useQuery({ queryKey: ['configuracoes'], queryFn: ConfigService.obter })
  const produto = produtos?.find(p => p.id === selectedProdutoId) ?? null

  const { data: ficha, isLoading } = useQuery({
    queryKey: ['ficha', selectedProdutoId],
    queryFn: () => FichaService.listar(selectedProdutoId),
    enabled: !!selectedProdutoId,
  })

  const { data: insumos } = useQuery({
    queryKey: ['insumos', ingSearch],
    queryFn: () => InsumosService.listar(ingSearch || undefined),
    enabled: addModal,
  })

  const adicionar = useMutation({
    mutationFn: FichaService.adicionar,
    onSuccess: () => { qc.invalidateQueries({queryKey:['ficha']}); qc.invalidateQueries({queryKey:['produtos']}); toast.success('Ingrediente adicionado!'); setAddModal(false); setSelectedIng(null); setQuantidade('') }
  })
  const remover = useMutation({
    mutationFn: FichaService.remover,
    onSuccess: () => { qc.invalidateQueries({queryKey:['ficha']}); qc.invalidateQueries({queryKey:['produtos']}); toast.success('Ingrediente removido.') }
  })

  const handleAddIngrediente = () => {
    if (!selectedIng) return toast.error('Selecione um ingrediente')
    if (!quantidade || Number(quantidade) <= 0) return toast.error('Informe a quantidade')
    if (!selectedProdutoId) return toast.error('Selecione um produto')
    adicionar.mutate({ produto_id: selectedProdutoId, insumo_id: selectedIng.id, quantidade: Number(quantidade), unidade: unidade as any })
  }

  // Preview do custo do ingrediente selecionado
  const custoPreview = selectedIng && quantidade
    ? getCustoUnitario(selectedIng, unidade as any) * Number(quantidade)
    : null

  const precif = produto && produto.custo_total > 0
    ? calcularPrecificacao(produto.custo_total, produto.margem_aplicada, config?.margem_minima ?? 200, config?.margem_premium ?? 400, 0, config?.margem_ideal ?? 300)
    : null

  return (
    <div className="vf-fadein">
      <Header title="Fichas Técnicas" />
      <div className="p-4 md:p-6 space-y-5">

        {/* Produto selector */}
        <Card className="p-4">
          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <Field label="Selecionar produto" className="flex-1">
              <Select value={selectedProdutoId} onChange={e => setSelectedProdutoId(e.target.value)}>
                <option value="">— Escolha um produto —</option>
                {produtos?.map(p => <option key={p.id} value={p.id}>{p.nome} ({p.categoria})</option>)}
              </Select>
            </Field>
            {selectedProdutoId && (
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={async () => {
                  if (!produto) return
                  const { exportarFichaTecnicaPDF } = await import('@/lib/exports')
                  exportarFichaTecnicaPDF(produto)
                }}>↓ PDF</Button>
                <Button size="sm" onClick={() => setAddModal(true)}>＋ Ingrediente</Button>
              </div>
            )}
          </div>
        </Card>

        {!selectedProdutoId && (
          <Empty icon="📋" title="Selecione um produto acima" description="Escolha um produto para visualizar ou editar sua ficha técnica." />
        )}

        {selectedProdutoId && (
          <div className="grid lg:grid-cols-3 gap-5">
            {/* Ingredientes */}
            <div className="lg:col-span-2">
              <Card>
                <div className="flex items-center justify-between p-4 border-b border-[var(--vf-border)]">
                  <div>
                    <div className="font-semibold text-[var(--vf-text)]">{produto?.nome ?? '—'}</div>
                    <div className="text-[11px] text-[var(--vf-text3)] mt-0.5">{produto?.categoria} · {produto?.tempo_preparo_min}min · {produto?.rendimento} {produto?.unidade_rendimento}</div>
                  </div>
                  <Badge color="gold">{ficha?.length ?? 0} ingredientes</Badge>
                </div>

                {isLoading ? (
                  <div className="p-4 space-y-2">
                    {Array.from({length:3}).map((_,i) => <div key={i} className="vf-skeleton h-12 rounded" />)}
                  </div>
                ) : (ficha?.length ?? 0) === 0 ? (
                  <Empty icon="🥬" title="Ficha vazia" description="Adicione ingredientes para calcular o custo real."
                    action={<Button onClick={() => setAddModal(true)}>Adicionar ingrediente</Button>} />
                ) : (
                  <div>
                    {ficha!.map(item => (
                      <div key={item.id} className="flex items-center gap-3 px-4 py-3 border-b border-[rgba(255,255,255,0.04)] last:border-0 hover:bg-[var(--vf-surface2)] transition-colors">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#C9A84C] flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-[var(--vf-text)] text-[13px]">{item.insumo?.nome ?? '—'}</div>
                          <div className="text-[11px] text-[var(--vf-text3)]">{item.insumo?.categoria?.nome}</div>
                        </div>
                        <div className="text-[13px] text-[var(--vf-text2)] flex-shrink-0">{item.quantidade} {item.unidade}</div>
                        <div className="text-[13px] font-semibold text-[var(--vf-primary)] flex-shrink-0 min-w-[70px] text-right">
                          {fmtCurrency(item.custo_calculado ?? 0)}
                        </div>
                        <Button variant="danger" size="sm" onClick={() => remover.mutate(item.id)}>✕</Button>
                      </div>
                    ))}

                    {/* Total */}
                    <div className="flex items-center justify-between px-4 py-3 bg-[rgba(201,168,76,0.05)] border-t border-[rgba(201,168,76,0.2)]">
                      <span className="font-semibold text-[var(--vf-text)] text-[13px]">CUSTO TOTAL</span>
                      <span className="font-bold text-[var(--vf-primary)] text-[16px]">{fmtCurrency(produto?.custo_total ?? 0)}</span>
                    </div>
                  </div>
                )}
              </Card>

              {produto?.modo_preparo && (
                <Card className="mt-4 p-4">
                  <div className="text-[11px] text-[var(--vf-text3)] uppercase tracking-wide mb-2">Modo de Preparo</div>
                  <p className="text-[13px] text-[var(--vf-text2)] leading-relaxed whitespace-pre-line">{produto.modo_preparo}</p>
                </Card>
              )}
            </div>

            {/* Painel de precificação */}
            <div className="space-y-4">
              <Card className="p-4">
                <div className="text-[11px] text-[var(--vf-text3)] uppercase tracking-wide mb-4">Precificação</div>
                {!precif ? (
                  <div className="text-[13px] text-[var(--vf-text3)]">Adicione ingredientes para calcular o preço.</div>
                ) : (
                  <div className="space-y-3">
                    <div className="bg-[var(--vf-surface2)] rounded-lg p-3">
                      <div className="text-[10px] text-[var(--vf-text3)] uppercase mb-1">Custo total</div>
                      <div className="text-xl font-bold text-[var(--vf-text2)]">{fmtCurrency(precif.custo_total)}</div>
                    </div>
                    <div className="bg-[rgba(201,168,76,0.08)] border border-[rgba(201,168,76,0.2)] rounded-lg p-3">
                      <div className="text-[10px] text-[var(--vf-text3)] uppercase mb-1">Preço de venda ({produto?.margem_aplicada ?? 0}%)</div>
                      <div className="text-2xl font-bold text-[var(--vf-primary)]">{fmtCurrency(precif.preco_customizado)}</div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-[var(--vf-surface2)] rounded-lg p-2.5 text-center">
                        <div className="text-[9px] text-[var(--vf-text3)] uppercase">Margem</div>
                        <div className="text-[14px] font-semibold text-[#3DAA6B]">{fmtPct(precif.margem_bruta)}</div>
                      </div>
                      <div className="bg-[var(--vf-surface2)] rounded-lg p-2.5 text-center">
                        <div className="text-[9px] text-[var(--vf-text3)] uppercase">CMV</div>
                        <div className="text-[14px] font-semibold" style={{ color: avaliarCMV(precif.cmv_percentual).cor }}>
                          {fmtPct(precif.cmv_percentual)}
                        </div>
                      </div>
                      <div className="bg-[var(--vf-surface2)] rounded-lg p-2.5 text-center">
                        <div className="text-[9px] text-[var(--vf-text3)] uppercase">Lucro bruto</div>
                        <div className="text-[13px] font-semibold text-[#3DAA6B]">{fmtCurrency(precif.lucro_bruto)}</div>
                      </div>
                      <div className="bg-[var(--vf-surface2)] rounded-lg p-2.5 text-center">
                        <div className="text-[9px] text-[var(--vf-text3)] uppercase">Preço mín.</div>
                        <div className="text-[13px] font-semibold text-[var(--vf-text2)]">{fmtCurrency(precif.preco_minimo)}</div>
                      </div>
                    </div>

                    {/* CMV indicator */}
                    <div className={`p-2.5 rounded-lg text-[12px] ${
                      avaliarCMV(precif.cmv_percentual).status === 'critico' ? 'bg-[rgba(212,80,80,0.08)] border border-[rgba(212,80,80,0.2)]' :
                      avaliarCMV(precif.cmv_percentual).status === 'atencao' ? 'bg-[rgba(232,184,75,0.08)] border border-[rgba(232,184,75,0.2)]' :
                      'bg-[rgba(61,170,107,0.08)] border border-[rgba(61,170,107,0.2)]'
                    }`}>
                      CMV está <strong>{avaliarCMV(precif.cmv_percentual).label}</strong>. Meta: ≤ 32%
                    </div>
                  </div>
                )}
              </Card>
            </div>
          </div>
        )}
      </div>

      {/* Add ingredient modal */}
      <Modal open={addModal} onClose={() => setAddModal(false)} title="Adicionar Ingrediente" size="md">
        <div className="space-y-4">
          <Field label="Buscar ingrediente">
            <Input value={ingSearch} onChange={e => setIngSearch(e.target.value)} placeholder="Digite o nome..." autoFocus />
          </Field>

          {/* Ingredientes list */}
          <div className="max-h-48 overflow-y-auto space-y-1 border border-[var(--vf-border)] rounded-lg">
            {(insumos ?? []).map(ins => (
              <div key={ins.id} onClick={() => { setSelectedIng(ins); setUnidade(ins.unidade_compra === 'litro' || ins.unidade_compra === 'ml' ? 'ml' : ins.unidade_compra === 'unidade' ? 'unidade' : 'g') }}
                className={`flex items-center justify-between px-3 py-2.5 cursor-pointer text-[13px] transition-colors ${
                  selectedIng?.id === ins.id ? 'bg-[rgba(201,168,76,0.1)] text-[var(--vf-primary)]' : 'hover:bg-[var(--vf-surface2)] text-[var(--vf-text2)]'
                }`}>
                <span>{ins.nome}</span>
                <span className="text-[11px] text-[var(--vf-text3)]">{ins.custo_por_kg ? `R$ ${ins.custo_por_kg.toFixed(2)}/kg` : ins.custo_por_litro ? `R$ ${ins.custo_por_litro.toFixed(2)}/L` : `R$ ${ins.custo_por_unidade?.toFixed(2) ?? 0}/un`}</span>
              </div>
            ))}
            {(insumos?.length ?? 0) === 0 && <div className="text-center py-4 text-[var(--vf-text3)] text-sm">Nenhum insumo encontrado</div>}
          </div>

          {selectedIng && (
            <div className="grid grid-cols-2 gap-4">
              <Field label="Quantidade" required>
                <Input type="number" step="0.001" min="0.001" value={quantidade} onChange={e => setQuantidade(e.target.value)} placeholder="Ex: 150" autoFocus />
              </Field>
              <Field label="Unidade">
                <Select value={unidade} onChange={e => setUnidade(e.target.value)}>
                  {UNIDADES_FICHA.map(u => <option key={u} value={u}>{u}</option>)}
                </Select>
              </Field>
            </div>
          )}

          {custoPreview !== null && (
            <Alert type="success">Custo deste ingrediente: <strong>{fmtCurrency(custoPreview)}</strong></Alert>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setAddModal(false)}>Cancelar</Button>
            <Button onClick={handleAddIngrediente} loading={adicionar.isPending} disabled={!selectedIng}>
              Adicionar à ficha
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}


export default function FichasPage() {
  return (
    <Suspense fallback={<div className="p-6 text-[var(--vf-text2)]">Carregando fichas técnicas...</div>}>
      <FichasContent />
    </Suspense>
  )
}
