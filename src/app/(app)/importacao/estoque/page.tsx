'use client'
import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useMutation } from '@tanstack/react-query'
import { Download, FileSpreadsheet, Upload } from 'lucide-react'
import Header from '@/components/layout/Header'
import { Alert, Button, Card, Field, Input } from '@/components/ui'
import { readTableFile } from '@/lib/xlsx-reader'
import { downloadWorkbookXlsx } from '@/lib/xlsx'
import { ImportacaoEstoqueService } from '@/services'
import toast from 'react-hot-toast'

export default function ImportacaoEstoquePage() {
  const [rows, setRows] = useState<any[]>([])
  const validacao = useMemo(() => rows.length ? ImportacaoEstoqueService.validarLinhas(rows) : null, [rows])
  async function carregar(file?: File) {
    if (!file) return
    try {
      const parsed = await readTableFile(file)
      setRows(parsed)
      toast.success(`${parsed.length} linha(s) carregadas.`)
    } catch (e) { toast.error(e instanceof Error ? e.message : String(e)) }
  }
  const importar = useMutation({ mutationFn: () => ImportacaoEstoqueService.importarProdutosEstoque(rows), onSuccess: (r) => toast.success(`${r.resultados.length} item(ns) importado(s).`), onError: (e: Error) => toast.error(e.message) })
  function baixarModelo() { downloadWorkbookXlsx({ Estoque: [{ Produto: 'Caipirinha', codigo_barras: '789001', SKU: 'DRINK-001', Categoria: 'drink', Quantidade: 20, Valor_custo: 3.5, Valor_venda: 7.35, Estoque_minimo: 5, Fornecedor: 'Fornecedor X', Observacao: 'Entrada inicial' }], Instrucoes: [{ Campo: 'Produto, código/SKU, quantidade e valores', Observacao: 'Preencha e importe no VF Nexus.' }] }, 'modelo-importacao-estoque.xlsx', { title: 'Modelo de importação de estoque' }) }
  return <div className="vf-fadein"><Header title="Importar estoque"/><div className="p-4 md:p-6 space-y-4 max-w-6xl mx-auto"><div className="flex flex-col md:flex-row justify-between gap-3"><div><h1 className="text-2xl font-semibold text-[var(--vf-text)]">Importação de estoque por Excel/CSV/PDF</h1><p className="text-sm text-[var(--vf-text2)]">Crie ou atualize produtos, quantidades, custo, venda e estoque mínimo em lote.</p></div><div className="flex gap-2"><Button variant="secondary" onClick={baixarModelo}><Download size={16}/>Modelo XLSX</Button><Link href="/importacao" className="inline-flex items-center justify-center rounded-xl border border-[var(--vf-border)] px-4 py-2 text-sm font-bold">Voltar</Link></div></div><Alert type="info">O sistema identifica colunas automaticamente e valida linha por linha antes de salvar. Para PDF, prefira tabela textual selecionável; PDFs em imagem precisam ser convertidos para Excel/CSV.</Alert><Card className="p-4 space-y-4"><Field label="Arquivo"><Input type="file" accept=".xlsx,.csv,.txt,.pdf" onChange={e => carregar(e.target.files?.[0])}/></Field>{validacao && <div className="grid grid-cols-3 gap-2 text-center"><Metric label="Linhas" value={validacao.total}/><Metric label="Válidas" value={validacao.linhasValidas}/><Metric label="Com erro" value={validacao.linhasComErro}/></div>}<Button disabled={!rows.length || !validacao?.linhasValidas} loading={importar.isPending} onClick={() => importar.mutate()}><Upload size={16}/>Confirmar importação</Button></Card><Card className="p-4"><div className="flex items-center gap-2 mb-3"><FileSpreadsheet size={18}/><b>Prévia</b></div><div className="overflow-x-auto"><table className="vf-table w-full"><thead><tr><th>Produto</th><th>Código</th><th>SKU</th><th>Qtd.</th><th>Custo</th><th>Venda</th></tr></thead><tbody>{(validacao?.linhas || []).slice(0,40).map((r:any,i:number)=><tr key={i}><td>{r.produto}</td><td>{r.codigo_barras}</td><td>{r.sku}</td><td>{r.quantidade}</td><td>{r.valor_custo}</td><td>{r.valor_venda}</td></tr>)}</tbody></table>{!rows.length && <p className="text-sm text-[var(--vf-text3)] py-8 text-center">Nenhum arquivo carregado.</p>}</div>{Boolean(validacao?.erros.length) && <Alert type="warn">Há {validacao?.erros.length} erro(s). Você pode corrigir o arquivo e importar novamente. As linhas inválidas serão ignoradas.</Alert>}</Card></div></div>
}
function Metric({ label, value }: { label: string; value: number }) { return <div className="rounded-2xl bg-[var(--vf-surface2)] p-3"><span className="text-xs text-[var(--vf-text3)]">{label}</span><b className="block text-lg text-[var(--vf-primary)]">{value}</b></div> }
