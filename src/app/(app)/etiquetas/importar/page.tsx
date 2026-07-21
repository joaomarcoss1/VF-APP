'use client'
import { useMemo, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import Link from 'next/link'
import { FileSpreadsheet, Printer, Upload } from 'lucide-react'
import Header from '@/components/layout/Header'
import { Alert, Button, Card, Field, Input, Select } from '@/components/ui'
import { readTableFile } from '@/lib/xlsx-reader'
import { EtiquetasService, type EtiquetaFormato, type EtiquetaLayout, ETIQUETA_FORMATOS, ETIQUETA_MODELOS } from '@/services'
import toast from 'react-hot-toast'

export default function ImportarEtiquetasPage() {
  const [rows, setRows] = useState<any[]>([])
  const [formato, setFormato] = useState<EtiquetaFormato>('a4_3_colunas')
  const [layout, setLayout] = useState<EtiquetaLayout>('simples')
  const [nome, setNome] = useState(`Etiquetas importadas ${new Date().toLocaleDateString('pt-BR')}`)
  const itens = useMemo(() => rows.map(r => EtiquetasService.normalizarImportacao(r)).filter(Boolean) as any[], [rows])
  async function carregar(file?: File) {
    if (!file) return
    try {
      const parsed = await readTableFile(file)
      setRows(parsed)
      toast.success(`${parsed.length} linha(s) carregadas para etiquetas.`)
    } catch (e) { toast.error(e instanceof Error ? e.message : String(e)) }
  }
  const gerar = useMutation({ mutationFn: () => EtiquetasService.salvarLote(nome, formato, itens, layout), onSuccess: lote => { toast.success('Lote gerado a partir do arquivo.'); window.open(`/etiquetas/imprimir/${lote.id}`, '_blank') }, onError: (e: Error) => toast.error(e.message) })
  return <div className="vf-fadein"><Header title="Importar etiquetas"/><div className="p-4 md:p-6 space-y-4 max-w-6xl mx-auto"><div className="flex flex-col md:flex-row justify-between gap-3"><div><h1 className="text-2xl font-semibold text-[var(--vf-text)]">Gerar etiquetas por Excel/CSV/PDF</h1><p className="text-sm text-[var(--vf-text2)]">Suba arquivo com produto, código, valor, promoção, quantidade e cores para gerar um lote automático.</p></div><Link href="/etiquetas" className="inline-flex items-center justify-center rounded-xl border border-[var(--vf-border)] px-4 py-2 text-sm font-bold">Voltar</Link></div><Alert type="info">Colunas aceitas: produto, codigo_barras, sku, valor, valor_promocional, quantidade_etiquetas, tipo_etiqueta, titulo_promocional, data_final_promocao, cor_fundo, cor_texto, cor_destaque, usar_logo.</Alert><Card className="p-4 space-y-4"><div className="grid grid-cols-1 md:grid-cols-4 gap-3"><Field label="Arquivo"><Input type="file" accept=".xlsx,.csv,.txt,.pdf" onChange={e => carregar(e.target.files?.[0])}/></Field><Field label="Nome do lote"><Input value={nome} onChange={e => setNome(e.target.value)}/></Field><Field label="Formato"><Select value={formato} onChange={e => setFormato(e.target.value as EtiquetaFormato)}>{Object.entries(ETIQUETA_FORMATOS).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}</Select></Field><Field label="Modelo"><Select value={layout} onChange={e => setLayout(e.target.value as EtiquetaLayout)}>{ETIQUETA_MODELOS.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}</Select></Field></div><Button disabled={!itens.length} loading={gerar.isPending} onClick={() => gerar.mutate()}><Printer size={16}/>Gerar lote e imprimir</Button></Card><Card className="p-4"><div className="flex items-center gap-2 mb-3"><FileSpreadsheet size={18}/><b>Prévia do arquivo</b></div><div className="overflow-x-auto"><table className="vf-table w-full"><thead><tr><th>Produto</th><th>Código</th><th>Valor</th><th>Promoção</th><th>Qtd.</th></tr></thead><tbody>{itens.slice(0,30).map((item:any, i:number) => <tr key={i}><td>{item.produto.nome}</td><td>{item.codigo_barras || item.produto.sku}</td><td>{item.preco}</td><td>{item.preco_promocional || '-'}</td><td>{item.quantidade}</td></tr>)}</tbody></table>{!itens.length && <p className="text-sm text-[var(--vf-text3)] py-8 text-center"><Upload className="mx-auto mb-2"/>Nenhum arquivo carregado.</p>}</div></Card></div></div>
}
