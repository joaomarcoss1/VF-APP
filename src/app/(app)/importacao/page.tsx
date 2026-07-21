'use client'
import { useMemo, useState } from 'react'
import Link from 'next/link'
import Header from '@/components/layout/Header'
import { Alert, Button, Card, Field, Input, Select } from '@/components/ui'
import { ImportacaoV14Service } from '@/services'
import { downloadWorkbookXlsx } from '@/lib/xlsx'
import { readTableFile, type ParsedSheetRow } from '@/lib/xlsx-reader'
import toast from 'react-hot-toast'

type Step = 'modelo' | 'preview' | 'resultado'

export default function ImportacaoPage() {
  const modelos = useMemo(() => ImportacaoV14Service.modelos(), [])
  const [tipo, setTipo] = useState(modelos[0]?.tipo || 'produtos')
  const [fileName, setFileName] = useState('')
  const [rows, setRows] = useState<ParsedSheetRow[]>([])
  const [validacao, setValidacao] = useState<any | null>(null)
  const [step, setStep] = useState<Step>('modelo')
  const [loading, setLoading] = useState(false)
  const atual = modelos.find(m => m.tipo === tipo) || modelos[0]

  function baixarModelo() {
    const row = Object.fromEntries(atual.colunas.map(c => [c, '']))
    downloadWorkbookXlsx({ Modelo: [row], Instrucoes: [{ Campo: 'tipo', Valor: tipo }, { Campo: 'observacao', Valor: 'Preencha a aba Modelo e importe no VF Nexus.' }] }, atual.arquivo, { title: `Modelo ${tipo}` })
  }

  async function onFile(file?: File) {
    if (!file) return
    setLoading(true)
    setFileName(file.name)
    try {
      const parsed = await readTableFile(file)
      const result = ImportacaoV14Service.validarLinhas(tipo, parsed as any[])
      setRows(parsed)
      setValidacao(result)
      setStep('preview')
      toast.success(`${parsed.length} linhas lidas.`)
    } catch (e) { toast.error(e instanceof Error ? e.message : String(e)) }
    finally { setLoading(false) }
  }

  async function confirmar() {
    if (!validacao) return
    if (validacao.erros.length) return toast.error('Corrija os erros antes de importar.')
    setLoading(true)
    try {
      let imported: any[] = []
      if (tipo === 'produtos') imported = await ImportacaoV14Service.importarProdutos(validacao.linhas)
      if (tipo === 'clientes') imported = await ImportacaoV14Service.importarClientes(validacao.linhas)
      if (tipo === 'fornecedores') imported = await ImportacaoV14Service.importarFornecedores(validacao.linhas)
      if (tipo === 'estoque') imported = await ImportacaoV14Service.importarEstoque(validacao.linhas)
      await ImportacaoV14Service.registrarImportacao(tipo, rows.length, 'processada', [], { importados: imported.length, arquivo: fileName })
      setStep('resultado')
      toast.success('Importação concluída.')
    } catch (e) {
      await ImportacaoV14Service.registrarImportacao(tipo, rows.length, 'erro', [{ erro: e instanceof Error ? e.message : String(e) }]).catch(() => null)
      toast.error(e instanceof Error ? e.message : String(e))
    } finally { setLoading(false) }
  }

  return <div className="vf-fadein"><Header title="Importação Excel" /><div className="p-4 md:p-6 space-y-4"><div className="flex flex-col md:flex-row md:items-end justify-between gap-3"><div><h1 className="text-xl md:text-2xl font-semibold text-[var(--vf-text)]">Importação real por Excel/CSV</h1><p className="text-sm text-[var(--vf-text2)] mt-1">Baixe o modelo, envie o arquivo, revise erros por linha e confirme a gravação no Supabase.</p></div><div className="flex flex-wrap gap-2"><Link href="/importacao/estoque" className="inline-flex rounded-xl border border-[var(--vf-border)] px-4 py-2 text-sm font-bold text-[var(--vf-primary)]">Importar estoque avançado</Link><Link href="/etiquetas/importar" className="inline-flex rounded-xl border border-[var(--vf-border)] px-4 py-2 text-sm font-bold text-[var(--vf-primary)]">Importar etiquetas</Link></div></div><Alert type="info">Suporta XLSX moderno no navegador e CSV. A importação valida antes de salvar e registra auditoria em importacoes_dados.</Alert><Card className="p-4 space-y-4"><div className="grid grid-cols-1 md:grid-cols-3 gap-3"><Field label="Tipo"><Select value={tipo} onChange={e => { setTipo(e.target.value); setRows([]); setValidacao(null); setStep('modelo') }}>{modelos.map(m => <option key={m.tipo} value={m.tipo}>{m.tipo}</option>)}</Select></Field><Field label="Arquivo .xlsx ou .csv"><Input type="file" accept=".xlsx,.csv,.txt" onChange={e => onFile(e.target.files?.[0])} /></Field><Field label="Modelo"><Button variant="secondary" onClick={baixarModelo}>Baixar modelo XLSX</Button></Field></div><div className="rounded-2xl border border-[var(--vf-border)] bg-[var(--vf-surface2)] p-3"><b className="text-sm text-[var(--vf-text)]">Colunas esperadas</b><div className="flex flex-wrap gap-2 mt-3">{atual.colunas.map(c => <span key={c} className="rounded-full bg-[var(--vf-card)] border border-[var(--vf-border)] px-3 py-1 text-xs text-[var(--vf-text2)]">{c}</span>)}</div></div></Card>{step === 'preview' && validacao && <Card className="p-4 space-y-4"><div className="flex flex-wrap justify-between gap-3"><div><b>Prévia: {fileName}</b><p className="text-xs text-[var(--vf-text3)]">{rows.length} linhas · {validacao.linhasValidas} válidas · {validacao.linhasComErro} com erro</p></div><Button onClick={confirmar} loading={loading} disabled={Boolean(validacao.erros.length)}>Confirmar importação</Button></div>{validacao.erros.length > 0 && <Alert type="error"><b>Erros encontrados:</b><ul className="list-disc pl-5 mt-2">{validacao.erros.slice(0,20).map((e:any,i:number)=><li key={i}>Linha {e.linha}, {e.campo}: {e.erro}</li>)}</ul></Alert>}<div className="overflow-x-auto"><table className="vf-table w-full text-sm"><thead><tr>{Object.keys(rows[0] || {}).map(h => <th key={h}>{h}</th>)}</tr></thead><tbody>{rows.slice(0,15).map((row,i)=><tr key={i}>{Object.keys(rows[0] || {}).map(h => <td key={h}>{String(row[h] ?? '')}</td>)}</tr>)}</tbody></table></div></Card>}{step === 'resultado' && <Alert type="success">Importação finalizada e registrada no histórico.</Alert>}</div></div>
}
