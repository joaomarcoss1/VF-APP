'use client'
import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Download, Palette, Printer, Save, Upload, Zap } from 'lucide-react'
import Header from '@/components/layout/Header'
import { Alert, Badge, Button, Card, Empty, Field, Input, Select, Skeleton } from '@/components/ui'
import { ProdutosService, EtiquetasService, ETIQUETA_FORMATOS, ETIQUETA_MODELOS, type EtiquetaFormato, type EtiquetaLayout, type EtiquetaSelecionada } from '@/services'
import { barcodeDataUrl } from '@/lib/barcode'
import { fmtCurrency } from '@/lib/precificacao'
import toast from 'react-hot-toast'
import type { Produto } from '@/types'

const DEFAULT_CORES = { fundo: '#FFFFFF', texto: '#111827', destaque: '#0A8DFF', borda: '#D7E5F2' }

export default function EtiquetasPage() {
  const qc = useQueryClient()
  const [busca, setBusca] = useState('')
  const [formato, setFormato] = useState<EtiquetaFormato>('a4_3_colunas')
  const [layout, setLayout] = useState<EtiquetaLayout>('simples')
  const [selecionados, setSelecionados] = useState<Record<string, EtiquetaSelecionada>>({})
  const [loteNome, setLoteNome] = useState(`Etiquetas ${new Date().toLocaleDateString('pt-BR')}`)
  const [titulo, setTitulo] = useState('')
  const [subtitulo, setSubtitulo] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [mostrarLogo, setMostrarLogo] = useState(false)
  const [mostrarCodigo, setMostrarCodigo] = useState(true)
  const [mostrarQr, setMostrarQr] = useState(false)
  const [cores, setCores] = useState(DEFAULT_CORES)
  const { data: produtos, isLoading, error } = useQuery({ queryKey: ['etiquetas-produtos', busca], queryFn: () => ProdutosService.listar(busca), retry: false })
  const { data: lotes } = useQuery({ queryKey: ['etiquetas-lotes'], queryFn: EtiquetasService.listarLotes, retry: false })
  const itens = useMemo(() => Object.values(selecionados).filter(i => i.quantidade > 0), [selecionados])
  const total = itens.reduce((acc, item) => acc + item.quantidade, 0)
  const cfg = ETIQUETA_FORMATOS[formato]

  function aplicarModelo(next: EtiquetaLayout) {
    setLayout(next)
    const modelo = ETIQUETA_MODELOS.find(m => m.key === next) || ETIQUETA_MODELOS[0]
    setTitulo(modelo.titulo)
    setCores(modelo.cores)
    setMostrarLogo(modelo.mostrar_logo)
    setMostrarCodigo(modelo.mostrar_codigo)
    setMostrarQr(modelo.mostrar_qr)
  }

  function toggle(produto: Produto) {
    setSelecionados(prev => {
      const next = { ...prev }
      if (next[produto.id]) delete next[produto.id]
      else next[produto.id] = { produto, quantidade: 1, codigo_barras: produto.codigo_barras || (produto as any).codigo_interno || produto.sku || '', preco: produto.preco_venda || 0, preco_original: produto.preco_venda || 0, titulo, subtitulo, data_fim: dataFim, layout, cores, mostrar_logo: mostrarLogo, mostrar_codigo: mostrarCodigo, mostrar_qr: mostrarQr }
      return next
    })
  }

  function atualizarItem(id: string, patch: Partial<EtiquetaSelecionada>) {
    setSelecionados(prev => ({ ...prev, [id]: { ...prev[id], ...patch } }))
  }

  const salvar = useMutation({
    mutationFn: () => EtiquetasService.salvarLote(loteNome, formato, itens.map(i => ({ ...i, titulo, subtitulo, data_fim: dataFim, layout, cores, mostrar_logo: mostrarLogo, mostrar_codigo: mostrarCodigo, mostrar_qr: mostrarQr })), layout, { cores, titulo, subtitulo, dataFim, mostrarLogo, mostrarCodigo, mostrarQr }),
    onSuccess: (lote) => { toast.success('Lote de etiquetas salvo.'); qc.invalidateQueries({ queryKey: ['etiquetas-lotes'] }); window.open(`/etiquetas/imprimir/${lote.id}`, '_blank') },
    onError: (e: Error) => toast.error(e.message),
  })

  function imprimirSemSalvar() {
    sessionStorage.setItem('vf_etiquetas_preview', JSON.stringify({ formato, layout, cores, titulo, subtitulo, dataFim, mostrarLogo, mostrarCodigo, mostrarQr, itens }))
    window.open('/etiquetas/imprimir/preview', '_blank')
  }

  function exportarZpl() {
    const zpl = EtiquetasService.gerarZpl(itens)
    const blob = new Blob([zpl], { type: 'text/plain;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'etiquetas-vf-nexus.zpl'
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return <div className="vf-fadein"><Header title="Etiquetas" />
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4"><div><h1 className="text-xl md:text-2xl font-semibold text-[var(--vf-text)]">Etiquetas profissionais</h1><p className="text-sm text-[var(--vf-text2)] mt-1">Gere etiquetas comuns, promocionais, coloridas, institucionais e compatíveis com scanner.</p></div><div className="flex flex-wrap gap-2"><Link href="/etiquetas/importar" className="inline-flex items-center gap-2 rounded-xl border border-[var(--vf-border)] px-4 py-2 text-sm font-bold text-[var(--vf-primary)]"><Upload size={16}/>Importar arquivo</Link><Button variant="secondary" disabled={!itens.length} onClick={imprimirSemSalvar}><Printer size={16}/>Prévia/Imprimir</Button><Button variant="secondary" disabled={!itens.length} onClick={exportarZpl}><Download size={16}/>ZPL</Button><Button loading={salvar.isPending} disabled={!itens.length} onClick={() => salvar.mutate()}><Save size={16}/>Salvar lote</Button></div></div>
      <Alert type="info">Crie etiquetas de preço, promoção relâmpago, etiquetas somente com logo, QR Code, térmica preto e branco ou modelos coloridos com a paleta da empresa.</Alert>
      {error && <Alert type="error">{(error as Error).message}</Alert>}
      <div className="grid grid-cols-1 2xl:grid-cols-[1.2fr,.8fr] gap-4">
        <div className="space-y-4">
          <Card className="p-4 space-y-4"><div className="grid grid-cols-1 md:grid-cols-3 gap-3"><Field label="Buscar produto"><Input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Nome, SKU ou código" /></Field><Field label="Formato"><Select value={formato} onChange={e => setFormato(e.target.value as EtiquetaFormato)}>{Object.entries(ETIQUETA_FORMATOS).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}</Select></Field><Field label="Nome do lote"><Input value={loteNome} onChange={e => setLoteNome(e.target.value)} /></Field></div></Card>
          <Card className="p-4 space-y-4"><div className="flex items-center gap-2"><Palette size={18} className="text-[var(--vf-primary)]"/><b>Editor visual</b></div><div className="grid grid-cols-1 md:grid-cols-4 gap-3"><Field label="Modelo"><Select value={layout} onChange={e => aplicarModelo(e.target.value as EtiquetaLayout)}>{ETIQUETA_MODELOS.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}</Select></Field><Field label="Título"><Input value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="PROMOÇÃO RELÂMPAGO" /></Field><Field label="Subtítulo"><Input value={subtitulo} onChange={e => setSubtitulo(e.target.value)} placeholder="Até 07/06" /></Field><Field label="Data final"><Input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} /></Field></div><div className="grid grid-cols-2 md:grid-cols-4 gap-3"><Field label="Fundo"><Input type="color" value={cores.fundo} onChange={e => setCores({...cores, fundo: e.target.value})} /></Field><Field label="Texto"><Input type="color" value={cores.texto} onChange={e => setCores({...cores, texto: e.target.value})} /></Field><Field label="Destaque"><Input type="color" value={cores.destaque} onChange={e => setCores({...cores, destaque: e.target.value})} /></Field><Field label="Borda"><Input type="color" value={cores.borda} onChange={e => setCores({...cores, borda: e.target.value})} /></Field></div><div className="flex flex-wrap gap-3 text-xs text-[var(--vf-text2)]"><label><input type="checkbox" checked={mostrarLogo} onChange={e => setMostrarLogo(e.target.checked)} /> Mostrar logo</label><label><input type="checkbox" checked={mostrarCodigo} onChange={e => setMostrarCodigo(e.target.checked)} /> Código de barras</label><label><input type="checkbox" checked={mostrarQr} onChange={e => setMostrarQr(e.target.checked)} /> QR Code</label></div></Card>
          <Card className="p-4 space-y-4">{isLoading ? <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{Array.from({length:8}).map((_,i)=><Skeleton key={i} className="h-32 rounded-2xl" />)}</div> : !produtos?.length ? <Empty icon="" title="Nenhum produto encontrado" description="Cadastre produtos ou ajuste a busca para gerar etiquetas." /> : <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{(produtos || []).slice(0,80).map(produto => { const item = selecionados[produto.id]; return <Card key={produto.id} className={`p-3 ${item ? 'ring-2 ring-[var(--vf-primary)]' : ''}`}><div className="flex items-start gap-3"><input type="checkbox" checked={Boolean(item)} onChange={() => toggle(produto)} className="mt-1"/><div className="min-w-0 flex-1"><b className="text-sm text-[var(--vf-text)] line-clamp-1">{produto.nome}</b><p className="text-xs text-[var(--vf-text3)]">{fmtCurrency(produto.preco_venda || 0)} · {produto.codigo_barras || produto.sku || 'código automático'}</p>{item && <div className="grid grid-cols-2 gap-2 mt-3"><Field label="Qtd."><Input type="number" min={1} value={item.quantidade} onChange={e => atualizarItem(produto.id, { quantidade: Number(e.target.value || 1) })}/></Field><Field label="Código"><Input value={item.codigo_barras || ''} onChange={e => atualizarItem(produto.id, { codigo_barras: e.target.value })} placeholder="Auto" /></Field><Field label="Preço"><Input type="number" value={item.preco ?? produto.preco_venda ?? 0} onChange={e => atualizarItem(produto.id, { preco: Number(e.target.value || 0) })}/></Field><Field label="Promoção"><Input type="number" value={item.preco_promocional ?? ''} onChange={e => atualizarItem(produto.id, { preco_promocional: e.target.value ? Number(e.target.value) : undefined })} placeholder="Opcional" /></Field></div>}</div></div></Card> })}</div>}</Card>
        </div>
        <div className="space-y-4"><Card className="p-4 space-y-3"><div className="flex items-center justify-between"><b>Prévia em tempo real</b><Badge color="blue">{total} etiquetas</Badge></div><div className="text-xs text-[var(--vf-text3)]">{cfg.label} · {cfg.largura_mm}mm x {cfg.altura_mm}mm · {cfg.colunas} coluna(s)</div><div className="rounded-2xl bg-white border border-[var(--vf-border)] p-3 text-black space-y-2">{itens.slice(0,4).map(item => <EtiquetaPreview key={item.produto.id} item={{...item, titulo, subtitulo, data_fim: dataFim, cores, mostrar_codigo: mostrarCodigo, mostrar_logo: mostrarLogo, mostrar_qr: mostrarQr}} />)}{!itens.length && <p className="text-sm text-center text-slate-500 py-10">Selecione produtos para visualizar.</p>}</div></Card><Card className="p-4 space-y-3"><b>Histórico de lotes</b>{(lotes || []).slice(0,6).map((lote:any) => <a key={lote.id} href={`/etiquetas/imprimir/${lote.id}`} target="_blank" className="flex items-center justify-between rounded-2xl border border-[var(--vf-border)] p-3 hover:bg-[var(--vf-surface2)]"><span className="text-sm text-[var(--vf-text)]">{lote.nome}</span><Badge>{lote.total_etiquetas}</Badge></a>)}{!lotes?.length && <p className="text-xs text-[var(--vf-text3)]">Nenhum lote salvo ainda.</p>}</Card></div>
      </div>
    </div>
  </div>
}

function EtiquetaPreview({ item }: { item: EtiquetaSelecionada }) {
  const cores = item.cores || DEFAULT_CORES
  const promo = item.preco_promocional !== undefined && item.preco_promocional !== null && Number(item.preco_promocional) > 0
  const codigo = item.codigo_barras || item.produto.codigo_barras || item.produto.sku || item.produto.id
  return <div className="border rounded-xl p-2 text-center" style={{ background: cores.fundo, color: cores.texto, borderColor: cores.borda }}><div className="text-[10px] font-black tracking-widest uppercase" style={{ color: cores.destaque }}>{item.titulo}{item.data_fim ? ` ATÉ ${new Date(item.data_fim).toLocaleDateString('pt-BR')}` : ''}</div><div className="font-bold text-sm truncate">{item.produto.nome}</div>{promo && <div className="text-[11px] line-through opacity-60">{fmtCurrency(item.preco_original ?? item.preco ?? item.produto.preco_venda ?? 0)}</div>}<div className="text-xl font-black" style={{ color: cores.destaque }}>{fmtCurrency(item.preco_promocional ?? item.preco ?? item.produto.preco_venda ?? 0)}</div>{item.mostrar_codigo !== false && <img src={barcodeDataUrl(codigo, { width: 210, height: 54 })} className="mx-auto" alt="Código de barras"/>}<div className="text-[10px] opacity-70">x {item.quantidade}</div></div>
}
