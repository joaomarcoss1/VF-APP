'use client'
import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Minus, Plus, Printer, Search, Send, StickyNote, Trash2, WalletCards } from 'lucide-react'
import toast from 'react-hot-toast'
import { OperationalShell } from '@/components/restaurante/OperationalShell'
import { StatusBadge } from '@/components/restaurante/StatusBadge'
import { formatCurrency } from '@/lib/restaurante-calculos'
import { RestauranteService, type RestaurantProduct, type RestaurantTab, type RestaurantTabItem } from '@/services/restaurante'

type MobileTab = 'itens' | 'produtos' | 'resumo'

export default function ComandaAtendimentoPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [tab, setTab] = useState<RestaurantTab | null>(null)
  const [products, setProducts] = useState<RestaurantProduct[]>([])
  const [search, setSearch] = useState('')
  const [observacao, setObservacao] = useState('')
  const [loading, setLoading] = useState(true)
  const [busyItem, setBusyItem] = useState<string | null>(null)
  const [mobileTab, setMobileTab] = useState<MobileTab>('itens')

  const id = String(params?.id ?? '')
  async function load() {
    setLoading(true)
    const [loadedTab, loadedProducts] = await Promise.all([RestauranteService.buscarComanda(id), RestauranteService.listarProdutos(search)])
    setTab(loadedTab)
    setProducts(loadedProducts)
    setLoading(false)
  }
  useEffect(() => { if (id) load() }, [id])
  useEffect(() => { const timer = window.setTimeout(() => RestauranteService.listarProdutos(search).then(setProducts).catch(() => null), 250); return () => window.clearTimeout(timer) }, [search])

  const grouped = useMemo(() => products.reduce<Record<string, RestaurantProduct[]>>((acc, product) => {
    const cat = product.categoria || (product.setor_producao === 'bar_drinks' || product.setor_producao === 'bar' ? 'Bebidas' : product.setor_producao === 'cozinha' ? 'Comidas' : 'Outros')
    acc[cat] = [...(acc[cat] ?? []), product]
    return acc
  }, {}), [products])

  async function add(product: RestaurantProduct) {
    try {
      await RestauranteService.adicionarItem(id, product, 1, observacao)
      setObservacao('')
      setMobileTab('itens')
      toast.success(`${product.nome} adicionado.`)
      await load()
    } catch (error: any) { toast.error(error.message ?? 'Erro ao adicionar item.') }
  }

  async function changeQuantity(item: RestaurantTabItem, delta: number) {
    try {
      setBusyItem(item.id)
      const next = Number(item.quantidade) + delta
      if (next <= 0 && !window.confirm('Remover este item da comanda?')) return
      await RestauranteService.atualizarQuantidadeItem(item.id, next)
      await load()
    } catch (error: any) { toast.error(error.message ?? 'Erro ao alterar quantidade.') } finally { setBusyItem(null) }
  }

  async function removeItem(item: RestaurantTabItem) {
    try {
      if (!window.confirm(`Remover ${item.nome_produto}?`)) return
      setBusyItem(item.id)
      await RestauranteService.removerItem(item.id, 'Removido no atendimento')
      toast.success('Item removido.')
      await load()
    } catch (error: any) { toast.error(error.message ?? 'Erro ao remover item.') } finally { setBusyItem(null) }
  }

  async function editNote(item: RestaurantTabItem) {
    const note = window.prompt('Observação do item:', item.observacao ?? '')
    if (note == null) return
    try { setBusyItem(item.id); await RestauranteService.atualizarObservacaoItem(item.id, note); await load() } catch (error: any) { toast.error(error.message ?? 'Erro ao salvar observação.') } finally { setBusyItem(null) }
  }

  async function enviar() {
    try { await RestauranteService.enviarParaCozinha(id); toast.success('Pedido enviado para produção.'); await load() } catch (error: any) { toast.error(error.message ?? 'Erro ao enviar pedido.') }
  }
  async function fechar() {
    try { await RestauranteService.solicitarFechamento(id); toast.success('Fechamento solicitado ao caixa.'); router.push('/atendimento') } catch (error: any) { toast.error(error.message ?? 'Erro ao solicitar fechamento.') }
  }

  if (loading) return <OperationalShell sector="atendimento" title="Carregando comanda"><div className="grid gap-4 lg:grid-cols-[1fr,360px]"><div className="h-[520px] vf-skeleton" /><div className="h-[520px] vf-skeleton" /></div></OperationalShell>
  if (!tab) return <OperationalShell sector="atendimento" title="Comanda não encontrada"><div className="vf-empty">Comanda não localizada.</div></OperationalShell>

  const itemCount = tab.itens?.reduce((sum, item) => sum + Number(item.quantidade || 0), 0) ?? 0
  const mesaLabel = tab.tipo === 'mesa' ? tab.mesa?.nome ?? `Mesa ${tab.mesa?.numero ?? ''}` : 'Venda balcão'

  const itemsPanel = (
    <div className="rounded-[30px] border border-[var(--vf-border)] bg-[var(--vf-card)] p-4 shadow-sm md:p-5">
      <div className="flex items-center justify-between"><h2 className="text-lg font-black text-[var(--vf-text)]">Itens da comanda</h2><span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">{itemCount} un.</span></div>
      <div className="mt-4 space-y-3">
        {(tab.itens ?? []).map((item) => <div key={item.id} className="rounded-2xl border border-[var(--vf-border)] bg-[var(--vf-surface2)] p-3">
          <div className="flex items-start justify-between gap-3"><div><strong className="text-sm text-[var(--vf-text)]">{item.nome_produto}</strong>{item.observacao && <p className="text-xs font-semibold text-[var(--vf-text3)]">Obs: {item.observacao}</p>}</div><strong className="text-sm text-[var(--vf-text)]">{formatCurrency(item.total)}</strong></div>
          <div className="mt-3 flex items-center justify-between gap-2"><StatusBadge status={item.status} /><div className="flex items-center gap-1 rounded-2xl bg-[var(--vf-card)] p-1 ring-1 ring-slate-200"><button disabled={busyItem === item.id} onClick={() => changeQuantity(item, -1)} className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--vf-surface2)] text-[var(--vf-text2)]"><Minus size={14} /></button><span className="min-w-10 text-center text-sm font-black">{item.quantidade}</span><button disabled={busyItem === item.id} onClick={() => changeQuantity(item, 1)} className="grid h-9 w-9 place-items-center rounded-xl bg-blue-600 text-white"><Plus size={14} /></button><button disabled={busyItem === item.id} onClick={() => editNote(item)} className="grid h-9 w-9 place-items-center rounded-xl bg-amber-50 text-amber-700"><StickyNote size={14} /></button><button disabled={busyItem === item.id} onClick={() => removeItem(item)} className="grid h-9 w-9 place-items-center rounded-xl bg-red-50 text-red-600"><Trash2 size={14} /></button></div></div>
        </div>)}
        {(tab.itens?.length ?? 0) === 0 && <div className="vf-empty text-sm font-semibold text-[var(--vf-text3)]">Nenhum item lançado. Abra a aba Produtos e toque no item para adicionar.</div>}
      </div>
    </div>
  )

  const productsPanel = (
    <div className="rounded-[30px] border border-[var(--vf-border)] bg-[var(--vf-card)] p-4 shadow-sm md:p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between"><div><h2 className="text-xl font-black text-[var(--vf-text)]">Adicionar produtos</h2><p className="text-sm font-semibold text-[var(--vf-text3)]">Busca rápida por comidas, bebidas e porções.</p></div><div className="grid gap-2 md:grid-cols-[260px,220px]"><label className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--vf-text3)]" size={16} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar produto" className="vf-input pl-10" /></label><input value={observacao} onChange={(e) => setObservacao(e.target.value)} placeholder="Observação do próximo item" className="vf-input" /></div></div>
      <div className="mt-5 space-y-5">{Object.entries(grouped).map(([category, items]) => <div key={category}><h3 className="mb-3 text-sm font-black uppercase tracking-wide text-[var(--vf-text3)]">{category}</h3><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{items.map((product) => <button key={product.id} onClick={() => add(product)} className="rounded-[22px] border border-[var(--vf-border)] bg-[var(--vf-surface2)] p-4 text-left transition hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50 active:scale-[.985]"><strong className="line-clamp-2 block min-h-[40px] text-sm font-black text-[var(--vf-text)]">{product.nome}</strong><div className="mt-3 flex items-center justify-between"><span className="rounded-full bg-[var(--vf-card)] px-2 py-1 text-[11px] font-black uppercase text-[var(--vf-text3)]">{product.setor_producao ?? 'balcão'}</span><span className="text-lg font-black text-blue-600">{formatCurrency(product.preco_venda ?? 0)}</span></div></button>)}</div></div>)}</div>
    </div>
  )

  const summaryPanel = (
    <div className="rounded-[30px] border border-[var(--vf-border)] bg-[var(--vf-card)] p-4 shadow-sm md:p-5">
      <div className="space-y-2 text-sm"><div className="flex justify-between"><span>Subtotal</span><strong>{formatCurrency(tab.subtotal)}</strong></div><div className="flex justify-between"><span>Taxa de serviço</span><strong>{formatCurrency(tab.taxa_servico)}</strong></div><div className="flex justify-between"><span>Desconto</span><strong>{formatCurrency(tab.desconto)}</strong></div><div className="border-t border-[var(--vf-border)] pt-3 text-lg"><div className="flex justify-between"><span className="font-black">Total</span><strong className="text-blue-600">{formatCurrency(tab.total)}</strong></div></div></div>
      <div className="mt-5 grid gap-2"><button onClick={enviar} className="vf-btn vf-btn-primary w-full"><Send size={16} /> Enviar para produção</button><a href={`/atendimento/imprimir/comanda/${tab.id}`} className="vf-btn vf-btn-ghost w-full"><Printer size={16} /> Imprimir comanda</a><button onClick={fechar} className="vf-btn vf-btn-secondary w-full"><WalletCards size={16} /> Solicitar fechamento</button></div>
    </div>
  )

  return (
    <OperationalShell sector="atendimento" title={`Comanda #${tab.codigo}`} subtitle={`${mesaLabel} · ${tab.cliente_nome ?? 'Cliente não informado'}`} actions={<StatusBadge status={tab.status} />}>
      <div className="mb-4 grid gap-3 md:grid-cols-4"><div className="vf-card p-4"><span className="text-xs font-black uppercase text-[var(--vf-text3)]">Cliente</span><strong className="mt-1 block text-[var(--vf-text)]">{tab.cliente_nome ?? 'Não informado'}</strong></div><div className="vf-card p-4"><span className="text-xs font-black uppercase text-[var(--vf-text3)]">Pessoas</span><strong className="mt-1 block text-[var(--vf-text)]">{tab.pessoas ?? '-'}</strong></div><div className="vf-card p-4"><span className="text-xs font-black uppercase text-[var(--vf-text3)]">Mesa</span><strong className="mt-1 block text-[var(--vf-text)]">{mesaLabel}</strong></div><div className="vf-card p-4"><span className="text-xs font-black uppercase text-[var(--vf-text3)]">Total</span><strong className="mt-1 block text-blue-600">{formatCurrency(tab.total)}</strong></div></div>
      <div className="vf-operational-mobile-tabs mb-4 md:hidden">{(['itens', 'produtos', 'resumo'] as MobileTab[]).map((item) => <button key={item} onClick={() => setMobileTab(item)} className={`rounded-2xl px-3 py-3 text-xs font-black capitalize ${mobileTab === item ? 'bg-blue-600 text-white' : 'bg-[var(--vf-surface2)] text-[var(--vf-text2)]'}`}>{item}</button>)}</div>
      <div className="hidden gap-5 xl:grid xl:grid-cols-[340px,1fr,360px]"><section>{productsPanel}</section><section>{itemsPanel}</section><aside>{summaryPanel}</aside></div>
      <div className="xl:hidden"><div className={mobileTab === 'itens' ? 'block' : 'hidden md:block'}>{itemsPanel}</div><div className={mobileTab === 'produtos' ? 'mt-4 block' : 'mt-4 hidden md:block'}>{productsPanel}</div><div className={mobileTab === 'resumo' ? 'mt-4 block' : 'mt-4 hidden md:block'}>{summaryPanel}</div></div>
      <div className="vf-restaurant-totalbar bg-slate-950 p-4 text-white md:hidden"><div className="flex items-center justify-between"><span className="text-sm font-bold text-[var(--vf-text3)]">Total</span><strong className="text-xl font-black">{formatCurrency(tab.total)}</strong></div></div>
    </OperationalShell>
  )
}
