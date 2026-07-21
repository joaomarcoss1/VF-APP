'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Barcode, Camera, CameraOff, ClipboardEdit, PackageSearch, ScanLine, ShoppingCart, Tag } from 'lucide-react'
import Header from '@/components/layout/Header'
import { Alert, Badge, Button, Card, Field, Input } from '@/components/ui'
import { CodigoBarrasService } from '@/services'
import { fmtCurrency } from '@/lib/precificacao'
import type { Produto } from '@/types'
import toast from 'react-hot-toast'

type ProdutoScan = Produto & { estoque?: any[]; movimentacoes?: any[] }

export default function ScannerPage() {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const readingRef = useRef(false)
  const [codigo, setCodigo] = useState('')
  const [produto, setProduto] = useState<ProdutoScan | null>(null)
  const [history, setHistory] = useState<string[]>([])
  const [cameraOn, setCameraOn] = useState(false)
  const [erroCamera, setErroCamera] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [supportsDetector, setSupportsDetector] = useState(true)

  useEffect(() => { setSupportsDetector(typeof window !== 'undefined' && 'BarcodeDetector' in window); return () => pararCamera() }, [])

  async function buscar(value = codigo) {
    const clean = value.trim()
    if (!clean) return toast.error('Informe um código para buscar.')
    setLoading(true)
    try {
      const result = await CodigoBarrasService.buscarProdutoPorCodigo(clean)
      setHistory(prev => [clean, ...prev.filter(x => x !== clean)].slice(0, 6))
      if (!result) {
        setProduto(null)
        toast.error('Produto não encontrado. Você pode cadastrar ou vincular este código.')
        return
      }
      setProduto(result as ProdutoScan)
      setCodigo(clean)
      toast.success('Produto encontrado.')
      navigator.vibrate?.(50)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error))
    } finally {
      setLoading(false)
    }
  }

  async function iniciarCamera() {
    setErroCamera(null)
    if (!navigator.mediaDevices?.getUserMedia) {
      setErroCamera('Este navegador não liberou acesso à câmera. Use HTTPS ou digite o código manualmente.')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false })
      streamRef.current = stream
      if (videoRef.current) videoRef.current.srcObject = stream
      setCameraOn(true)
      loopLeitura()
    } catch (error) {
      setErroCamera(error instanceof Error ? error.message : 'Não foi possível abrir a câmera.')
    }
  }

  function pararCamera() {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    setCameraOn(false)
  }

  async function loopLeitura() {
    const Detector = (window as any).BarcodeDetector
    if (!Detector) return
    const detector = new Detector({ formats: ['ean_13','ean_8','upc_a','upc_e','code_128','qr_code'] })
    const tick = async () => {
      if (!streamRef.current || !videoRef.current) return
      try {
        const codes = await detector.detect(videoRef.current)
        const raw = codes?.[0]?.rawValue
        if (raw && !readingRef.current) {
          readingRef.current = true
          await buscar(String(raw))
          setTimeout(() => { readingRef.current = false }, 1300)
        }
      } catch {}
      requestAnimationFrame(tick)
    }
    tick()
  }

  const estoque = Number(produto?.estoque?.[0]?.quantidade_atual ?? 0)
  const minimo = Number((produto as any)?.estoque_minimo ?? produto?.estoque?.[0]?.estoque_minimo ?? 0)
  const margem = produto?.preco_venda ? (((Number(produto.preco_venda) - Number(produto.custo_total || 0)) / Number(produto.preco_venda)) * 100) : 0

  return <div className="vf-fadein"><Header title="Scanner" />
    <div className="p-4 md:p-6 space-y-4 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3"><div><h1 className="text-2xl font-semibold text-[var(--vf-text)] flex items-center gap-2"><ScanLine size={24}/>Leitor de código de barras</h1><p className="text-sm text-[var(--vf-text2)]">Leia pela câmera, scanner físico ou digite o código para abrir estoque, PDV e etiquetas.</p></div><div className="flex gap-2"><Button variant={cameraOn ? 'danger' : 'secondary'} onClick={cameraOn ? pararCamera : iniciarCamera}>{cameraOn ? <span className="inline-flex items-center gap-2"><CameraOff size={16}/>Desligar câmera</span> : <span className="inline-flex items-center gap-2"><Camera size={16}/>Abrir câmera</span>}</Button></div></div>
      {erroCamera && <Alert type="warn">{erroCamera}</Alert>}
      {!supportsDetector && <Alert type="info">Seu navegador não possui BarcodeDetector nativo. Use scanner físico ou digitação manual. Em produção, é possível adicionar biblioteca ZXing/html5-qrcode como fallback.</Alert>}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr,420px] gap-4 items-start">
        <div className="space-y-4">
          <Card className="p-4 space-y-3"><Field label="Código manual / scanner físico"><div className="relative"><Barcode className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--vf-text3)]" size={18}/><Input autoFocus value={codigo} onChange={e => setCodigo(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') buscar() }} className="pl-10" placeholder="Digite ou leia o código" /></div></Field><Button fullWidth loading={loading} onClick={() => buscar()}><span className="inline-flex items-center gap-2"><PackageSearch size={16}/>Buscar produto</span></Button></Card>
          <Card className="overflow-hidden p-0"><div className="relative aspect-video bg-slate-950 flex items-center justify-center"><video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover"/><div className="absolute inset-0 pointer-events-none flex items-center justify-center"><div className="w-[72%] max-w-md h-32 border-2 border-white/80 rounded-3xl shadow-[0_0_0_999px_rgba(0,0,0,.25)]"/></div>{!cameraOn && <div className="absolute inset-0 flex flex-col items-center justify-center text-white text-center p-6"><Camera size={42}/><b className="mt-3">Câmera desligada</b><span className="text-sm opacity-75">Clique em abrir câmera ou use o campo manual.</span></div>}</div></Card>
        </div>
        <div className="space-y-4">
          {produto ? <Card className="p-4 space-y-4"><div className="flex justify-between gap-3"><div><h2 className="font-bold text-lg text-[var(--vf-text)]">{produto.nome}</h2><p className="text-xs text-[var(--vf-text3)]">{produto.sku || produto.codigo_barras || codigo}</p></div><Badge color={produto.disponivel ? 'green' : 'red'}>{produto.disponivel ? 'Disponível' : 'Indisponível'}</Badge></div><div className="grid grid-cols-2 gap-2 text-sm"><Info label="Preço" value={fmtCurrency(produto.preco_venda || 0)} highlight/><Info label="Estoque" value={`${estoque}`} warn={minimo > 0 && estoque <= minimo}/><Info label="Custo" value={fmtCurrency(produto.custo_total || 0)}/><Info label="Margem" value={`${margem.toFixed(1)}%`}/><Info label="Categoria" value={String(produto.categoria || '-')}/><Info label="Mínimo" value={`${minimo || 0}`}/></div><div className="grid grid-cols-2 gap-2"><Link href={`/pdv?codigo=${encodeURIComponent(codigo)}`} className="vf-scan-action"><ShoppingCart size={16}/>Adicionar ao PDV</Link><Link href={`/estoque/produto/${produto.id}`} className="vf-scan-action"><PackageSearch size={16}/>Ver estoque</Link><Link href={`/etiquetas?produto=${produto.id}`} className="vf-scan-action"><Tag size={16}/>Gerar etiqueta</Link><Link href={`/produtos?codigo=${encodeURIComponent(codigo)}`} className="vf-scan-action"><ClipboardEdit size={16}/>Vincular/cadastrar</Link></div></Card> : <Card className="p-6 text-center text-[var(--vf-text3)]"><PackageSearch className="mx-auto mb-3" size={40}/><b className="block text-[var(--vf-text)]">Nenhum produto selecionado</b><p className="text-sm mt-1">Leia uma etiqueta ou informe um código para consultar.</p></Card>}
          <Card className="p-4 space-y-2"><b className="text-sm text-[var(--vf-text)]">Últimos códigos lidos</b>{history.length ? history.map(code => <button key={code} onClick={() => buscar(code)} className="w-full text-left rounded-xl border border-[var(--vf-border)] px-3 py-2 text-xs hover:bg-[var(--vf-surface2)]">{code}</button>) : <p className="text-xs text-[var(--vf-text3)]">Nenhuma leitura recente.</p>}</Card>
        </div>
      </div>
    </div>
  </div>
}

function Info({ label, value, highlight, warn }: { label: string; value: string; highlight?: boolean; warn?: boolean }) {
  return <div className={`rounded-2xl bg-[var(--vf-surface2)] p-3 ${warn ? 'border border-[var(--vf-warning)]' : ''}`}><span className="text-xs text-[var(--vf-text3)]">{label}</span><b className={`block ${highlight ? 'text-[var(--vf-primary)]' : warn ? 'text-[var(--vf-warning)]' : 'text-[var(--vf-text)]'}`}>{value}</b></div>
}
