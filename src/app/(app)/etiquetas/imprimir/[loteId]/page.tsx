'use client'
import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui'
import { EtiquetasService, ETIQUETA_FORMATOS, type EtiquetaFormato } from '@/services'
import { barcodeDataUrl } from '@/lib/barcode'
import { fmtCurrency } from '@/lib/precificacao'

type Item = { produto?: any; nome_produto?: string; preco?: number; preco_original?: number | null; preco_promocional?: number | null; codigo_barras?: string; quantidade: number; titulo?: string | null; subtitulo?: string | null; data_fim?: string | null; cores?: any; mostrar_logo?: boolean; mostrar_codigo?: boolean; mostrar_qr?: boolean }

export default function ImprimirEtiquetasPage() {
  const params = useParams<{ loteId: string }>()
  const [lote, setLote] = useState<any | null>(null)
  const [erro, setErro] = useState('')
  const [formato, setFormato] = useState<EtiquetaFormato>('a4_3_colunas')
  useEffect(() => {
    const id = params.loteId
    if (id === 'preview') {
      const raw = sessionStorage.getItem('vf_etiquetas_preview')
      if (raw) {
        const data = JSON.parse(raw)
        setFormato(data.formato || 'a4_3_colunas')
        setLote({ nome: 'Prévia de etiquetas', formato_papel: data.formato || 'a4_3_colunas', configuracao: data, itens: data.itens.map((i:any) => ({ nome_produto: i.produto.nome, preco: i.preco ?? i.produto.preco_venda, preco_original: i.preco_original ?? i.produto.preco_venda, preco_promocional: i.preco_promocional, codigo_barras: i.codigo_barras || i.produto.codigo_barras || i.produto.sku || i.produto.id, quantidade: i.quantidade, titulo: data.titulo || i.titulo, subtitulo: data.subtitulo || i.subtitulo, data_fim: data.dataFim || i.data_fim, cores: data.cores || i.cores, mostrar_logo: data.mostrarLogo ?? i.mostrar_logo, mostrar_codigo: data.mostrarCodigo ?? i.mostrar_codigo, mostrar_qr: data.mostrarQr ?? i.mostrar_qr })) })
      }
      return
    }
    EtiquetasService.carregarLote(id).then((data) => { setLote(data); setFormato(data?.formato_papel || 'a4_3_colunas') }).catch(e => setErro(e.message))
  }, [params.loteId])
  const cfg = ETIQUETA_FORMATOS[formato] || ETIQUETA_FORMATOS.a4_3_colunas
  const etiquetas = useMemo(() => {
    const out: Item[] = []
    for (const item of lote?.itens || []) for (let i=0;i<Number(item.quantidade || 1);i++) out.push(item)
    return out
  }, [lote])
  return <main className="min-h-dvh bg-slate-100 text-slate-950">
    <style>{`@page{size:A4;margin:8mm}@media print{.no-print{display:none!important}body{background:#fff!important}.sheet{box-shadow:none!important;margin:0!important;padding:0!important}.label{break-inside:avoid;page-break-inside:avoid}}.sheet{width:210mm;min-height:297mm;margin:16px auto;background:white;padding:10mm;box-shadow:0 20px 60px rgba(0,0,0,.12)}.labels{display:grid;grid-template-columns:repeat(${cfg.colunas},1fr);gap:3mm}.label{height:${cfg.altura_mm}mm;border:1px dashed #cbd5e1;border-radius:3mm;padding:2.4mm;text-align:center;overflow:hidden;display:flex;flex-direction:column;justify-content:center}.label-name{font-size:11px;font-weight:800;line-height:1.1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.label-title{font-size:8px;font-weight:900;letter-spacing:.08em;text-transform:uppercase}.label-price{font-size:20px;font-weight:900;margin:.5mm 0}.label-old{font-size:8px;text-decoration:line-through;opacity:.62}.label-code{font-size:7px;font-family:monospace}`}</style>
    <div className="no-print sticky top-0 z-10 bg-white border-b p-3 flex justify-between items-center"><div><b>Impressão de etiquetas</b><p className="text-xs text-slate-500">{lote?.nome || 'Carregando'} · {etiquetas.length} etiquetas</p></div><div className="flex gap-2"><Button variant="secondary" onClick={() => history.back()}>Voltar</Button><Button onClick={() => window.print()}>Imprimir</Button></div></div>
    {erro && <div className="p-6 text-red-700">{erro}</div>}
    <section className="sheet"><div className="labels">{etiquetas.map((item, index) => <Etiqueta key={index} item={item} />)}</div></section>
  </main>
}

function Etiqueta({ item }: { item: Item }) {
  const cores = item.cores || { fundo: '#ffffff', texto: '#111827', destaque: '#0A8DFF', borda: '#cbd5e1' }
  const promo = item.preco_promocional !== undefined && item.preco_promocional !== null && Number(item.preco_promocional) > 0
  const title = item.titulo ? `${item.titulo}${item.data_fim ? ` ATÉ ${new Date(item.data_fim).toLocaleDateString('pt-BR')}` : ''}` : ''
  return <div className="label" style={{ background: cores.fundo, color: cores.texto, borderColor: cores.borda }}><div className="label-title" style={{ color: cores.destaque }}>{title}</div><div className="label-name">{item.nome_produto || item.produto?.nome}</div>{promo && <div className="label-old">{fmtCurrency(item.preco_original || item.preco || 0)}</div>}<div className="label-price" style={{ color: cores.destaque }}>{fmtCurrency(item.preco_promocional || item.preco || 0)}</div>{item.mostrar_codigo !== false && <><img src={barcodeDataUrl(item.codigo_barras || 'VF-NEXUS', { width: 230, height: 50 })} alt="Código de barras" style={{maxWidth:'100%',height:'14mm',objectFit:'contain',margin:'0 auto'}} /><div className="label-code">{item.codigo_barras}</div></>}</div>
}
