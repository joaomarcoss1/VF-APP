'use client'
import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Header from '@/components/layout/Header'
import { Alert, Badge, Button, Card, Empty, Field, Input, Modal, Skeleton, Textarea } from '@/components/ui'
import { CardapioService, ConfigService, IdentidadeService, CatalogoPublicoService } from '@/services'
import { fmtCurrency, fmtPct } from '@/lib/precificacao'
import { buildPublicCatalogUrl, buildQrImageUrl, buildWhatsappUrl, catalogWhatsappText } from '@/lib/commercial-v14'
import type { CardapioItemForm, CardapioProdutoView } from '@/types'
import toast from 'react-hot-toast'

export default function CardapioPage() {
  const qc = useQueryClient()
  const [editItem, setEditItem] = useState<CardapioProdutoView | null>(null)
  const [itemForm, setItemForm] = useState<Partial<CardapioItemForm>>({})

  const { data: empresa } = useQuery({ queryKey: ['empresa'], queryFn: () => ConfigService.empresa() })
  const { data: identidade } = useQuery({ queryKey: ['identidade'], queryFn: IdentidadeService.obter })
  const { data: cardapio, isLoading: loadingCardapio, error: cardapioError } = useQuery({ queryKey: ['cardapio-padrao'], queryFn: () => CardapioService.obterOuCriarPadrao() })
  const { data: produtos, isLoading, error } = useQuery({
    queryKey: ['cardapio-produtos', cardapio?.id],
    queryFn: () => CardapioService.montarProdutos(cardapio?.id),
    enabled: Boolean(cardapio?.id),
  })

  const { data: catalogoPublico } = useQuery({
    queryKey: ['catalogo-publico', cardapio?.id],
    queryFn: () => CatalogoPublicoService.obterAtual(cardapio?.id),
    enabled: Boolean(cardapio?.id),
  })

  const salvarCardapio = useMutation({
    mutationFn: (form: { nome?: string; descricao?: string }) => CardapioService.atualizar(cardapio!.id, form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['cardapio-padrao'] }); toast.success('Cardápio atualizado!') },
    onError: (e: Error) => toast.error(e.message),
  })

  const publicarCatalogo = useMutation({
    mutationFn: () => CatalogoPublicoService.publicar(cardapio!, { whatsapp: identidade?.telefone, titulo: cardapio?.nome, descricao: cardapio?.descricao }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['catalogo-publico'] }); toast.success('Catálogo público publicado!') },
    onError: (e: Error) => toast.error(e.message),
  })

  const salvarItem = useMutation({
    mutationFn: CardapioService.salvarItem,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['cardapio-produtos'] }); toast.success('Item atualizado!'); setEditItem(null) },
    onError: (e: Error) => toast.error(e.message),
  })

  const removerItem = useMutation({
    mutationFn: CardapioService.removerItem,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['cardapio-produtos'] }); toast.success('Produto removido do cardápio.') },
    onError: (e: Error) => toast.error(e.message),
  })

  const resumo = useMemo(() => {
    const lista = produtos ?? []
    const selecionados = lista.filter(p => p.exibir)
    return {
      total: lista.length,
      selecionados: selecionados.length,
      promocoes: selecionados.filter(p => p.promocao_ativa).length,
      ticket: selecionados.length ? selecionados.reduce((a, p) => a + Number(p.preco_exibido ?? 0), 0) / selecionados.length : 0,
    }
  }, [produtos])

  const porCategoria = useMemo(() => {
    const map = new Map<string, CardapioProdutoView[]>()
    for (const p of produtos ?? []) {
      const cat = String(p.categoria || 'outro')
      map.set(cat, [...(map.get(cat) ?? []), p])
    }
    return Array.from(map.entries())
  }, [produtos])

  const produtosPreview = useMemo(() => (produtos ?? []).filter(p => p.exibir).slice(0, 4), [produtos])

  const openEdit = (item: CardapioProdutoView) => {
    setEditItem(item)
    setItemForm({
      cardapio_id: cardapio!.id,
      produto_id: item.produto.id,
      categoria: item.categoria,
      descricao_cardapio: item.descricao_cardapio,
      ordem: item.item?.ordem ?? 0,
      exibir: item.exibir,
      destaque: item.destaque,
    })
  }

  const quickToggle = (item: CardapioProdutoView, exibir: boolean) => {
    if (!cardapio) return
    if (!exibir && item.item?.id) return removerItem.mutate(item.item.id)
    salvarItem.mutate({
      cardapio_id: cardapio.id,
      produto_id: item.produto.id,
      categoria: item.categoria,
      descricao_cardapio: item.descricao_cardapio || item.produto.descricao || '',
      ordem: item.item?.ordem ?? 0,
      exibir,
      destaque: item.destaque,
    })
  }

  const exportarPDF = async () => {
    if (!cardapio || !produtos?.some(p => p.exibir)) return toast.error('Selecione ao menos um produto para o cardápio.')
    const { exportarCardapioPDF } = await import('@/lib/exports')
    await exportarCardapioPDF({ ...cardapio, public_url: catalogoPublico?.slug ? buildPublicCatalogUrl(catalogoPublico.slug) : undefined } as any, produtos, identidade?.nome ?? empresa?.nome ?? 'VF Nexus', identidade ?? undefined)
    toast.success('Cardápio em PDF gerado!')
  }

  const erro = error || cardapioError

  return (
    <div className="vf-fadein">
      <Header title="Cardápio" />
      <div className="p-4 md:p-6 space-y-5">
        <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-semibold text-[var(--vf-text)]">Cardápio premium em PDF</h1>
            <p className="text-sm text-[var(--vf-text2)] mt-1">Selecione produtos, ajuste descrições comerciais e gere um cardápio com promoções ativas automaticamente.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => qc.invalidateQueries({ queryKey: ['cardapio-produtos'] })}>Atualizar</Button>
            <Button variant="secondary" loading={publicarCatalogo.isPending} onClick={() => publicarCatalogo.mutate()}>Publicar link</Button>
            <Button onClick={exportarPDF}>↓ Gerar PDF</Button>
          </div>
        </div>

        {erro && <Alert type="error">{(erro as Error).message}</Alert>}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card className="p-4"><div className="text-[10px] uppercase text-[var(--vf-text3)] tracking-wide">Produtos</div><div className="text-2xl text-[var(--vf-primary)] font-semibold">{resumo.total}</div></Card>
          <Card className="p-4"><div className="text-[10px] uppercase text-[var(--vf-text3)] tracking-wide">No cardápio</div><div className="text-2xl text-[var(--vf-success)] font-semibold">{resumo.selecionados}</div></Card>
          <Card className="p-4"><div className="text-[10px] uppercase text-[var(--vf-text3)] tracking-wide">Promoções</div><div className="text-2xl text-[var(--vf-info)] font-semibold">{resumo.promocoes}</div></Card>
          <Card className="p-4"><div className="text-[10px] uppercase text-[var(--vf-text3)] tracking-wide">Preço médio</div><div className="text-xl text-[var(--vf-primary)] font-semibold">{fmtCurrency(resumo.ticket)}</div></Card>
        </div>

        {catalogoPublico?.slug && (
          <Card className="p-4 grid grid-cols-1 md:grid-cols-[1fr,170px] gap-4 items-center">
            <div>
              <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--vf-text3)]">Catálogo público</div>
              <h2 className="text-lg font-semibold text-[var(--vf-text)] mt-1">Link e QR Code prontos para divulgar</h2>
              <p className="text-xs text-[var(--vf-text2)] mt-1 break-all">{buildPublicCatalogUrl(catalogoPublico.slug)}</p>
              <div className="flex flex-wrap gap-2 mt-3">
                <Button size="sm" variant="secondary" onClick={() => navigator.clipboard?.writeText(buildPublicCatalogUrl(catalogoPublico.slug)).then(() => toast.success('Link copiado!'))}>Copiar link</Button>
                <a className="inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all select-none vf-motion px-3 py-1.5 text-xs bg-[linear-gradient(135deg,var(--vf-primary),var(--vf-secondary))] text-white" href={buildWhatsappUrl({ telefone: identidade?.telefone, texto: catalogWhatsappText(identidade?.nome || empresa?.nome || 'VF Nexus', buildPublicCatalogUrl(catalogoPublico.slug)) })} target="_blank">WhatsApp</a>
              </div>
            </div>
            <div className="rounded-3xl border border-[var(--vf-border)] bg-white p-3 justify-self-center"><img src={buildQrImageUrl(buildPublicCatalogUrl(catalogoPublico.slug), 180)} alt="QR Code do catálogo" className="w-36 h-36 object-contain" /></div>
          </Card>
        )}

        <Card className="p-0 overflow-hidden vf-catalog-preview">
          <div className="p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[linear-gradient(135deg,color-mix(in_srgb,var(--vf-primary)_12%,transparent),color-mix(in_srgb,var(--vf-secondary)_10%,transparent))]">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-14 h-14 rounded-3xl bg-[var(--vf-surface)] border border-[var(--vf-border)] flex items-center justify-center overflow-hidden">📖</div>
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--vf-text3)]">Prévia comercial</div>
                <h2 className="text-lg font-semibold text-[var(--vf-text)] truncate">{cardapio?.nome || 'Catálogo / Cardápio'}</h2>
                <p className="text-xs text-[var(--vf-text2)]">O PDF agora usa a logo e a paleta escolhidas nas configurações, sem fundo preto fixo.</p>
              </div>
            </div>
            <Badge color="blue">visual pronto para cliente</Badge>
          </div>
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            {produtosPreview.length ? produtosPreview.map(item => (
              <div key={item.produto.id} className="rounded-2xl border border-[var(--vf-border)] bg-[var(--vf-surface)] p-3 flex items-start justify-between gap-3">
                <div className="min-w-0"><div className="font-semibold text-sm text-[var(--vf-text)] truncate">{item.produto.nome}</div><div className="text-[11px] text-[var(--vf-text3)] line-clamp-2 mt-1">{item.descricao_cardapio || item.produto.descricao || 'Descrição comercial do produto.'}</div></div>
                <div className="text-sm font-bold text-[var(--vf-primary)] whitespace-nowrap">{fmtCurrency(item.preco_exibido)}</div>
              </div>
            )) : <div className="md:col-span-2 text-sm text-[var(--vf-text3)]">Selecione produtos para visualizar uma prévia do catálogo.</div>}
          </div>
        </Card>

        <Card className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-[1fr,2fr,auto] gap-3 items-end">
            <Field label="Nome do cardápio">
              <Input defaultValue={cardapio?.nome ?? 'Cardápio principal'} onBlur={e => cardapio && salvarCardapio.mutate({ nome: e.target.value })} />
            </Field>
            <Field label="Descrição">
              <Input defaultValue={cardapio?.descricao ?? ''} onBlur={e => cardapio && salvarCardapio.mutate({ descricao: e.target.value })} placeholder="Ex: Cardápio oficial da casa" />
            </Field>
            <Button variant="secondary" loading={salvarCardapio.isPending}>Auto salvar</Button>
          </div>
        </Card>

        {(isLoading || loadingCardapio) ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-32" />)}</div>
        ) : !produtos?.length ? (
          <Empty icon="📖" title="Nenhum produto disponível" description="Cadastre produtos com preço de venda para montar o cardápio." />
        ) : (
          <div className="space-y-6">
            {porCategoria.map(([categoria, lista]) => (
              <section key={categoria} className="space-y-3">
                <div className="flex items-center gap-3"><div className="h-px flex-1 bg-[color-mix(in_srgb,var(--vf-secondary)_14%,transparent)]" /><Badge color="gold">{categoria}</Badge><div className="h-px flex-1 bg-[color-mix(in_srgb,var(--vf-secondary)_14%,transparent)]" /></div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {lista.map(item => (
                    <Card key={item.produto.id} className={`p-4 ${item.exibir ? 'border-[color-mix(in_srgb,var(--vf-secondary)_38%,transparent)]' : ''}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap"><h3 className="font-semibold text-[var(--vf-text)]">{item.produto.nome}</h3>{item.promocao_ativa && <Badge color="green">PROMOÇÃO</Badge>}{item.destaque && <Badge color="gold">Destaque</Badge>}</div>
                          <p className="text-[12px] text-[var(--vf-text2)] mt-1 line-clamp-2">{item.descricao_cardapio || 'Sem descrição comercial.'}</p>
                        </div>
                        <label className="flex items-center gap-2 text-[12px] text-[var(--vf-text2)] cursor-pointer"><input type="checkbox" checked={item.exibir} onChange={e => quickToggle(item, e.target.checked)} /> Exibir</label>
                      </div>

                      <div className="grid grid-cols-3 gap-2 mt-4">
                        <div className="bg-[var(--vf-surface2)] rounded-lg p-2"><div className="text-[9px] text-[var(--vf-text3)] uppercase">Custo</div><div className="text-[12px] text-[var(--vf-text2)]">{fmtCurrency(item.produto.custo_total)}</div></div>
                        <div className="bg-[color-mix(in_srgb,var(--vf-secondary)_10%,transparent)] rounded-lg p-2"><div className="text-[9px] text-[var(--vf-text3)] uppercase">Preço</div><div className="text-[12px] text-[var(--vf-primary)] font-semibold">{fmtCurrency(item.preco_exibido)}</div></div>
                        <div className="bg-[color-mix(in_srgb,var(--vf-success)_8%,transparent)] rounded-lg p-2"><div className="text-[9px] text-[var(--vf-text3)] uppercase">Economia</div><div className="text-[12px] text-[var(--vf-success)] font-semibold">{item.promocao_ativa ? fmtPct(item.economia_percentual) : '—'}</div></div>
                      </div>

                      {Number(item.preco_original) <= 0 && <div className="mt-3"><Alert type="warn">Produto sem preço definido. Ajuste a ficha técnica antes de publicar no cardápio.</Alert></div>}

                      <div className="flex justify-between items-center mt-4 pt-3 border-t border-[var(--vf-border)]">
                        <Button size="sm" variant="ghost" onClick={() => openEdit(item)}>✏️ Editar descrição</Button>
                        {item.promocao_ativa && <span className="text-[11px] text-[var(--vf-success)]">De {fmtCurrency(item.preco_original)} por {fmtCurrency(item.preco_exibido)}</span>}
                      </div>
                    </Card>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

      <Modal open={Boolean(editItem)} onClose={() => setEditItem(null)} title="Editar item do cardápio" size="lg">
        {editItem && (
          <div className="space-y-4">
            <Alert type="info">Personalize a descrição comercial sem alterar a ficha técnica do produto.</Alert>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Produto"><Input value={editItem.produto.nome} disabled /></Field>
              <Field label="Categoria no cardápio"><Input value={itemForm.categoria ?? ''} onChange={e => setItemForm(p => ({ ...p, categoria: e.target.value }))} /></Field>
            </div>
            <Field label="Descrição para o cardápio"><Textarea value={itemForm.descricao_cardapio ?? ''} onChange={e => setItemForm(p => ({ ...p, descricao_cardapio: e.target.value }))} /></Field>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field label="Ordem"><Input type="number" value={itemForm.ordem ?? 0} onChange={e => setItemForm(p => ({ ...p, ordem: Number(e.target.value) }))} /></Field>
              <label className="flex items-center gap-2 text-[13px] text-[var(--vf-text2)] mt-6 cursor-pointer"><input type="checkbox" checked={Boolean(itemForm.exibir)} onChange={e => setItemForm(p => ({ ...p, exibir: e.target.checked }))} /> Exibir</label>
              <label className="flex items-center gap-2 text-[13px] text-[var(--vf-text2)] mt-6 cursor-pointer"><input type="checkbox" checked={Boolean(itemForm.destaque)} onChange={e => setItemForm(p => ({ ...p, destaque: e.target.checked }))} /> Destaque</label>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setEditItem(null)}>Cancelar</Button>
              <Button onClick={() => cardapio && editItem && salvarItem.mutate({
                cardapio_id: cardapio.id,
                produto_id: editItem.produto.id,
                categoria: itemForm.categoria || editItem.categoria,
                descricao_cardapio: itemForm.descricao_cardapio || '',
                ordem: Number(itemForm.ordem ?? 0),
                exibir: Boolean(itemForm.exibir),
                destaque: Boolean(itemForm.destaque),
              })} loading={salvarItem.isPending}>Salvar item</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
