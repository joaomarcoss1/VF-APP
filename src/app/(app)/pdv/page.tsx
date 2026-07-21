'use client'
import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Header from '@/components/layout/Header'
import { Alert, Card, Empty, Skeleton } from '@/components/ui'
import { MobilePageShell } from '@/components/mobile/V14Mobile'
import { ProdutosService, VendasService, IdentidadeService, CodigoBarrasService, OfflineSyncService, getEmpresaIdObrigatoria } from '@/services'
import type { Produto } from '@/types'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { OfflineDB } from '@/lib/offline-db'
import toast from 'react-hot-toast'
import { PdvCartPanel, PdvFilters, PdvProductGrid, PdvScannerInput, PdvTopStatus, type PdvCartItem } from '@/components/pdv/PdvProfessional'

export default function PdvPage() {
  const qc = useQueryClient()
  const online = useOnlineStatus()
  const [busca, setBusca] = useState('')
  const [codigoRapido, setCodigoRapido] = useState('')
  const [vendasOffline, setVendasOffline] = useState(0)
  const [empresaIdAtual, setEmpresaIdAtual] = useState<string | null>(null)
  const [clienteNome, setClienteNome] = useState('')
  const [clienteWhatsapp, setClienteWhatsapp] = useState('')
  const [forma, setForma] = useState('pix')
  const [canal, setCanal] = useState('local')
  const [observacoes, setObservacoes] = useState('')
  const [cart, setCart] = useState<PdvCartItem[]>([])

  const { data: identidade } = useQuery({ queryKey: ['identidade-global'], queryFn: IdentidadeService.obter, retry: false })
  const { data: produtos, isLoading, error } = useQuery({ queryKey: ['pdv-produtos', busca], queryFn: () => ProdutosService.listar(busca), retry: false })

  useEffect(() => {
    const codigo = new URLSearchParams(window.location.search).get('codigo')
    if (codigo) setCodigoRapido(codigo)
    getEmpresaIdObrigatoria().then(setEmpresaIdAtual).catch(() => setEmpresaIdAtual(null))
  }, [])

  useEffect(() => {
    OfflineSyncService.pendentes().then(rows => setVendasOffline(rows.length)).catch(() => null)
  }, [online])

  useEffect(() => {
    if (produtos?.length) OfflineDB.cacheProdutos(produtos, empresaIdAtual).catch(() => null)
  }, [produtos])

  const produtosVisiveis = useMemo(() => (produtos ?? []).filter(p => p.ativo && p.disponivel && Number(p.preco_venda || 0) > 0).slice(0, 80), [produtos])
  const subtotal = useMemo(() => cart.reduce((acc, item) => acc + (Number(item.produto.preco_venda || 0) * item.quantidade) - item.desconto, 0), [cart])
  const custo = useMemo(() => cart.reduce((acc, item) => acc + Number(item.produto.custo_total || 0) * item.quantidade, 0), [cart])
  const lucro = Math.max(0, subtotal - custo)

  async function adicionarPorCodigo(codigo = codigoRapido) {
    const clean = codigo.trim()
    if (!clean) return toast.error('Informe ou leia um código de barras/SKU.')
    try {
      const produto = online ? await CodigoBarrasService.buscarProdutoPorCodigo(clean) : await OfflineDB.buscarProdutoCache(clean, empresaIdAtual)
      if (!produto) return toast.error('Produto não encontrado para este código.')
      addProduto(produto as Produto)
      setCodigoRapido('')
      toast.success('Produto adicionado ao carrinho.')
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate?.(40)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e))
    }
  }

  function addProduto(produto: Produto) {
    const estoque = Number((produto as any).estoque?.[0]?.quantidade_atual ?? (produto as any).estoque_atual ?? 0)
    if (Number.isFinite(estoque) && estoque <= 0) toast.error('Atenção: produto sem estoque registrado.')
    setCart(prev => {
      const found = prev.find(i => i.produto.id === produto.id)
      if (found) return prev.map(i => i.produto.id === produto.id ? { ...i, quantidade: i.quantidade + 1 } : i)
      return [...prev, { produto, quantidade: 1, desconto: 0 }]
    })
  }

  function updateQty(produtoId: string, quantidade: number) {
    setCart(prev => prev.map(i => i.produto.id === produtoId ? { ...i, quantidade: Math.max(1, quantidade) } : i))
  }

  const finalizar = useMutation<any, Error, void>({
    mutationFn: async () => {
      if (!cart.length) throw new Error('Adicione pelo menos um item à venda.')
      const vendaPayload = {
        produto_nome: cart.length === 1 ? cart[0].produto.nome : `${cart.length} itens vendidos`,
        quantidade: cart.reduce((a, i) => a + i.quantidade, 0),
        preco_unitario: subtotal,
        custo_unitario: custo,
        desconto: cart.reduce((a, i) => a + i.desconto, 0),
        total: subtotal,
        lucro,
        canal: canal as any,
        forma_pagamento: forma as any,
        cliente_nome: clienteNome || undefined,
        cliente_whatsapp: clienteWhatsapp || undefined,
        observacoes,
        data_venda: new Date().toISOString().split('T')[0],
        itens: cart.map(item => ({ produto_id: item.produto.id, produto_nome: item.produto.nome, quantidade: item.quantidade, preco_unitario: Number(item.produto.preco_venda || 0), custo_unitario: Number(item.produto.custo_total || 0), desconto: item.desconto })),
        pagamentos: [{ forma_pagamento: forma, valor: subtotal, valor_recebido: subtotal }],
      } as any
      if (!online) return (await OfflineSyncService.registrarVendaOffline(vendaPayload)) as any
      return (await VendasService.registrar(vendaPayload)) as any
    },
    onSuccess: () => {
      toast.success(online ? 'Venda registrada com sucesso!' : 'Venda salva offline para sincronizar!')
      setCart([])
      setClienteNome('')
      setClienteWhatsapp('')
      setObservacoes('')
      OfflineSyncService.pendentes().then(rows => setVendasOffline(rows.length)).catch(() => null)
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      qc.invalidateQueries({ queryKey: ['ranking'] })
    },
    onError: (e) => toast.error(e.message),
  })

  return <div className="vf-fadein">
    <Header title="PDV rápido" />
    <MobilePageShell title="PDV rápido" subtitle={`Venda profissional · ${identidade?.nome || 'VF Nexus'}`} />
    <div className="p-4 md:p-6 space-y-4 vf-pdv-page">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div><h1 className="hidden md:block text-2xl font-semibold text-[var(--vf-text)]">PDV profissional</h1><p className="text-sm text-[var(--vf-text2)]">Venda por busca, toque, scanner físico ou câmera. Integrado ao estoque e etiquetas.</p></div>
        <PdvTopStatus online={online} pendentes={vendasOffline}/>
      </div>
      {!online && <Alert type="warn">Modo offline ativo. A venda será salva na fila e sincronizada quando a internet voltar.</Alert>}
      <PdvScannerInput value={codigoRapido} onChange={setCodigoRapido} onSubmit={() => adicionarPorCodigo()} />
      {error && <Alert type="error">{(error as Error).message}</Alert>}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr,410px] gap-4 items-start">
        <div className="space-y-4">
          <PdvFilters busca={busca} setBusca={setBusca} canal={canal} setCanal={setCanal} forma={forma} setForma={setForma}/>
          {isLoading ? <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-36 rounded-2xl" />)}</div> : !produtosVisiveis.length ? <Card className="p-6"><Empty icon="" title="Nenhum produto pronto para venda" description="Cadastre produtos ativos, disponíveis, com preço de venda e código/SKU para acelerar o caixa." /></Card> : <PdvProductGrid produtos={produtosVisiveis} onAdd={addProduto}/>} 
        </div>
        <PdvCartPanel cart={cart} onQty={updateQty} onRemove={(id) => setCart(prev => prev.filter(i => i.produto.id !== id))} onClear={() => setCart([])} subtotal={subtotal} custo={custo} lucro={lucro} clienteNome={clienteNome} setClienteNome={setClienteNome} clienteWhatsapp={clienteWhatsapp} setClienteWhatsapp={setClienteWhatsapp} observacoes={observacoes} setObservacoes={setObservacoes} loading={finalizar.isPending} onFinalize={() => finalizar.mutate()}/>
      </div>
    </div>
  </div>
}
