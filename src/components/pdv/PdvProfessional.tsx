'use client'
import Link from 'next/link'
import { Barcode, Boxes, Minus, Plus, ScanLine, Search, ShoppingCart, Trash2, Wifi, WifiOff, Tag, ReceiptText } from 'lucide-react'
import { Badge, Button, Card, Field, Input, Select, Alert } from '@/components/ui'
import { fmtCurrency } from '@/lib/precificacao'
import type { Produto } from '@/types'

export type PdvCartItem = { produto: Produto; quantidade: number; desconto: number }

export function PdvTopStatus({ online, pendentes }: { online: boolean; pendentes: number }) {
  return <div className="flex flex-wrap items-center gap-2 text-xs">
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 border ${online ? 'text-[var(--vf-success)] border-[color-mix(in_srgb,var(--vf-success)_32%,transparent)] bg-[color-mix(in_srgb,var(--vf-success)_8%,transparent)]' : 'text-[var(--vf-warning)] border-[color-mix(in_srgb,var(--vf-warning)_38%,transparent)] bg-[color-mix(in_srgb,var(--vf-warning)_10%,transparent)]'}`}>{online ? <Wifi size={14}/> : <WifiOff size={14}/>} {online ? 'Online' : 'Offline'}</span>
    {pendentes > 0 && <span className="rounded-full px-3 py-1 border border-[var(--vf-border)] text-[var(--vf-text2)]">{pendentes} venda(s) pendente(s)</span>}
  </div>
}

export function PdvScannerInput({ value, onChange, onSubmit }: { value: string; onChange: (value: string) => void; onSubmit: () => void }) {
  return <Card className="p-3 md:p-4 vf-pdv-scanner-card">
    <div className="grid grid-cols-1 md:grid-cols-[1fr,auto,auto] gap-3 items-end">
      <Field label="Código de barras / SKU" hint="Compatível com leitor físico: leia o código e pressione Enter.">
        <div className="relative"><Barcode className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--vf-text3)]" size={18}/><Input autoFocus value={value} onChange={e => onChange(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') onSubmit() }} className="pl-10" placeholder="Leia com scanner físico ou digite o código" /></div>
      </Field>
      <Button variant="secondary" onClick={onSubmit}><span className="inline-flex items-center gap-2"><ScanLine size={16}/>Adicionar por código</span></Button>
      <Link href="/scanner" className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl font-semibold px-4 py-2.5 text-sm border border-[var(--vf-border)] text-[var(--vf-primary)] bg-[var(--vf-card)] hover:bg-[var(--vf-surface2)]"><ScanLine size={16}/>Abrir câmera</Link>
    </div>
  </Card>
}

export function PdvFilters({ busca, setBusca, canal, setCanal, forma, setForma }: { busca: string; setBusca: (v:string)=>void; canal: string; setCanal: (v:string)=>void; forma: string; setForma: (v:string)=>void }) {
  return <Card className="p-4">
    <div className="grid grid-cols-1 md:grid-cols-[1fr,180px,190px] gap-3 items-end">
      <Field label="Buscar produto"><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--vf-text3)]" size={18}/><Input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Nome, SKU, código ou categoria" className="pl-10" /></div></Field>
      <Field label="Canal"><Select value={canal} onChange={e => setCanal(e.target.value)}><option value="local">Balcão/local</option><option value="delivery">Delivery</option><option value="whatsapp">WhatsApp</option><option value="servico">Serviço</option><option value="evento">Evento</option></Select></Field>
      <Field label="Pagamento"><Select value={forma} onChange={e => setForma(e.target.value)}><option value="pix">Pix</option><option value="dinheiro">Dinheiro</option><option value="cartao_credito">Cartão de crédito</option><option value="cartao_debito">Cartão de débito</option><option value="outro">Outro</option></Select></Field>
    </div>
  </Card>
}

export function PdvProductCard({ produto, onAdd }: { produto: Produto; onAdd: (produto: Produto) => void }) {
  const estoque = Number((produto as any).estoque?.[0]?.quantidade_atual ?? (produto as any).estoque_atual ?? 0)
  const minimo = Number((produto as any).estoque_minimo ?? (produto as any).estoque?.[0]?.estoque_minimo ?? 0)
  const baixo = estoque > 0 && minimo > 0 && estoque <= minimo
  return <button onClick={() => onAdd(produto)} className="group text-left vf-card p-3 min-h-[148px] vf-motion active:scale-[.98] hover:border-[color-mix(in_srgb,var(--vf-primary)_32%,transparent)]">
    <div className="flex items-start justify-between gap-2">
      <div className="w-10 h-10 rounded-2xl bg-[color-mix(in_srgb,var(--vf-primary)_10%,transparent)] text-[var(--vf-primary)] flex items-center justify-center overflow-hidden">
        {(produto as any).imagem_url ? <img src={(produto as any).imagem_url} alt="" className="w-full h-full object-cover"/> : <Boxes size={20}/>}      
      </div>
      <div className="flex flex-col items-end gap-1">{produto.destaque && <Badge color="gold">Destaque</Badge>}{baixo && <Badge color="amber">Baixo</Badge>}</div>
    </div>
    <b className="block text-[13px] text-[var(--vf-text)] line-clamp-2 mt-3 group-hover:text-[var(--vf-primary)]">{produto.nome}</b>
    <span className="block text-[11px] text-[var(--vf-text3)] mt-1 truncate">{produto.categoria || 'produto'} · {(produto as any).sku || (produto as any).codigo_barras || 'sem código'}</span>
    <div className="mt-3 flex items-end justify-between gap-2"><strong className="text-[var(--vf-primary)]">{fmtCurrency(produto.preco_venda || 0)}</strong><span className="text-[10px] text-[var(--vf-text3)]">Estoque {Number.isFinite(estoque) ? estoque : 0}</span></div>
  </button>
}

export function PdvProductGrid({ produtos, onAdd }: { produtos: Produto[]; onAdd: (produto: Produto) => void }) {
  return <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">{produtos.map(produto => <PdvProductCard key={produto.id} produto={produto} onAdd={onAdd}/>)}</div>
}

export function PdvCartPanel({ cart, onQty, onRemove, onClear, subtotal, custo, lucro, clienteNome, setClienteNome, clienteWhatsapp, setClienteWhatsapp, observacoes, setObservacoes, loading, onFinalize }: { cart: PdvCartItem[]; onQty: (id:string, q:number)=>void; onRemove: (id:string)=>void; onClear:()=>void; subtotal:number; custo:number; lucro:number; clienteNome:string; setClienteNome:(v:string)=>void; clienteWhatsapp:string; setClienteWhatsapp:(v:string)=>void; observacoes:string; setObservacoes:(v:string)=>void; loading:boolean; onFinalize:()=>void }) {
  return <Card className="p-4 xl:sticky xl:top-20 vf-pdv-cart">
    <div className="flex items-center justify-between gap-3 mb-3"><div className="flex items-center gap-2"><ShoppingCart size={18} className="text-[var(--vf-primary)]"/><div><h2 className="font-semibold text-[var(--vf-text)]">Carrinho</h2><p className="text-xs text-[var(--vf-text3)]">{cart.length} item(ns)</p></div></div><Badge color="blue">{fmtCurrency(subtotal)}</Badge></div>
    <div className="space-y-2 max-h-[38dvh] md:max-h-[48vh] overflow-y-auto pr-1">
      {!cart.length && <Alert type="info">Toque em um produto, leia um código ou abra a câmera para adicionar itens.</Alert>}
      {cart.map(item => <div key={item.produto.id} className="rounded-2xl border border-[var(--vf-border)] bg-[var(--vf-surface2)] p-3">
        <div className="flex justify-between gap-3"><div className="min-w-0"><b className="text-sm text-[var(--vf-text)] line-clamp-1">{item.produto.nome}</b><span className="block text-xs text-[var(--vf-text3)]">{fmtCurrency(item.produto.preco_venda || 0)} cada</span></div><button onClick={() => onRemove(item.produto.id)} className="w-8 h-8 rounded-xl text-[var(--vf-error)] hover:bg-[color-mix(in_srgb,var(--vf-error)_10%,transparent)]"><Trash2 size={16} className="mx-auto"/></button></div>
        <div className="mt-3 flex items-center justify-between gap-2"><div className="flex items-center rounded-xl border border-[var(--vf-border)] overflow-hidden"><button onClick={() => onQty(item.produto.id, item.quantidade - 1)} className="w-9 h-9 flex items-center justify-center"><Minus size={14}/></button><span className="w-10 text-center text-sm font-bold">{item.quantidade}</span><button onClick={() => onQty(item.produto.id, item.quantidade + 1)} className="w-9 h-9 flex items-center justify-center"><Plus size={14}/></button></div><b className="text-sm text-[var(--vf-primary)]">{fmtCurrency(Number(item.produto.preco_venda || 0) * item.quantidade - item.desconto)}</b></div>
      </div>)}
    </div>
    <div className="border-t border-[var(--vf-border)] mt-4 pt-4 space-y-3">
      <Field label="Cliente"><Input value={clienteNome} onChange={e => setClienteNome(e.target.value)} placeholder="Consumidor final" /></Field>
      <Field label="WhatsApp"><Input value={clienteWhatsapp} onChange={e => setClienteWhatsapp(e.target.value)} placeholder="(99) 99999-9999" /></Field>
      <Field label="Observações"><Input value={observacoes} onChange={e => setObservacoes(e.target.value)} placeholder="Mesa, entrega, observação do pedido..." /></Field>
      <div className="grid grid-cols-3 gap-2 text-center"><div className="rounded-2xl bg-[var(--vf-surface2)] p-2"><span className="text-[10px] text-[var(--vf-text3)]">Subtotal</span><b className="block text-xs">{fmtCurrency(subtotal)}</b></div><div className="rounded-2xl bg-[var(--vf-surface2)] p-2"><span className="text-[10px] text-[var(--vf-text3)]">Custo</span><b className="block text-xs">{fmtCurrency(custo)}</b></div><div className="rounded-2xl bg-[color-mix(in_srgb,var(--vf-success)_10%,transparent)] p-2"><span className="text-[10px] text-[var(--vf-text3)]">Lucro</span><b className="block text-xs text-[var(--vf-success)]">{fmtCurrency(lucro)}</b></div></div>
      <div className="grid grid-cols-[1fr,auto] gap-2"><Button fullWidth size="lg" loading={loading} disabled={!cart.length} onClick={onFinalize}><span className="inline-flex items-center gap-2"><ReceiptText size={17}/>Finalizar venda</span></Button><Button variant="ghost" disabled={!cart.length} onClick={onClear}><Trash2 size={17}/></Button></div>
      <div className="grid grid-cols-2 gap-2"><Link href="/etiquetas" className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl border border-[var(--vf-border)] text-xs font-bold text-[var(--vf-text2)]"><Tag size={15}/>Etiquetas</Link><Link href="/scanner" className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl border border-[var(--vf-border)] text-xs font-bold text-[var(--vf-text2)]"><ScanLine size={15}/>Scanner</Link></div>
    </div>
  </Card>
}
