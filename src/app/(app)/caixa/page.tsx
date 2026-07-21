'use client'
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import Header from '@/components/layout/Header'
import { Alert, Badge, Button, Card, Field, Input, Skeleton, Textarea } from '@/components/ui'
import { CaixaV15Service } from '@/services'
import { fmtCurrency } from '@/lib/precificacao'

export default function CaixaPage() {
  const qc = useQueryClient()
  const abertoQ = useQuery({ queryKey: ['caixa-aberto-v15'], queryFn: CaixaV15Service.caixaAberto })
  const histQ = useQuery({ queryKey: ['caixa-historico-v15'], queryFn: CaixaV15Service.historico })
  const [saldo, setSaldo] = useState(0)
  const [mov, setMov] = useState({ tipo: 'entrada' as 'entrada'|'saida', descricao: '', valor: 0 })
  const [fechar, setFechar] = useState({ dinheiro_informado: 0, observacoes: '' })
  const invalidate = () => { qc.invalidateQueries({ queryKey: ['caixa-aberto-v15'] }); qc.invalidateQueries({ queryKey: ['caixa-historico-v15'] }) }
  const abrirM = useMutation({ mutationFn: () => CaixaV15Service.abrir(saldo), onSuccess: () => { toast.success('Caixa aberto.'); invalidate() }, onError: (e: Error) => toast.error(e.message) })
  const movM = useMutation({ mutationFn: () => CaixaV15Service.registrarMovimento(mov), onSuccess: () => { toast.success('Movimento registrado.'); setMov({ tipo: 'entrada', descricao: '', valor: 0 }); invalidate() }, onError: (e: Error) => toast.error(e.message) })
  const fecharM = useMutation({ mutationFn: () => CaixaV15Service.fechar(fechar), onSuccess: () => { toast.success('Caixa fechado.'); invalidate() }, onError: (e: Error) => toast.error(e.message) })
  const aberto = abertoQ.data

  return <div className="vf-fadein"><Header title="Fechamento de caixa" /><div className="p-4 md:p-6 space-y-5">
    <Alert type="info">Controle de caixa operacional: abertura, entradas/saídas manuais, fechamento, dinheiro esperado, dinheiro informado e diferença para auditoria.</Alert>
    <div className="grid grid-cols-1 xl:grid-cols-[.8fr_1.2fr] gap-5">
      <Card className="p-5 space-y-4" gold><div className="flex items-center justify-between"><h2 className="text-lg font-semibold">Caixa atual</h2>{aberto ? <Badge color="green">aberto</Badge> : <Badge color="gray">fechado</Badge>}</div>{abertoQ.isLoading ? <Skeleton className="h-28" /> : aberto ? <><div className="grid grid-cols-2 gap-3 text-sm"><div><span className="text-[var(--vf-text3)]">Aberto em</span><b className="block">{new Date(aberto.opened_at || '').toLocaleString('pt-BR')}</b></div><div><span className="text-[var(--vf-text3)]">Saldo inicial</span><b className="block text-[var(--vf-primary)]">{fmtCurrency(Number(aberto.saldo_inicial || 0))}</b></div></div><Field label="Entrada/saída manual"><div className="grid grid-cols-3 gap-2"><select className="vf-input" value={mov.tipo} onChange={e => setMov({ ...mov, tipo: e.target.value as any })}><option value="entrada">Entrada</option><option value="saida">Saída</option></select><Input className="col-span-2" value={mov.descricao} onChange={e => setMov({ ...mov, descricao: e.target.value })} placeholder="Descrição" /></div></Field><Field label="Valor"><Input type="number" value={mov.valor} onChange={e => setMov({ ...mov, valor: Number(e.target.value) })} /></Field><Button fullWidth variant="secondary" loading={movM.isPending} onClick={() => movM.mutate()} disabled={!mov.descricao || mov.valor <= 0}>Registrar movimento</Button><div className="h-px bg-[var(--vf-border)]" /><Field label="Dinheiro informado no fechamento"><Input type="number" value={fechar.dinheiro_informado} onChange={e => setFechar({ ...fechar, dinheiro_informado: Number(e.target.value) })} /></Field><Field label="Observações"><Textarea value={fechar.observacoes} onChange={e => setFechar({ ...fechar, observacoes: e.target.value })} /></Field><Button fullWidth loading={fecharM.isPending} onClick={() => fecharM.mutate()}>Fechar caixa</Button></> : <><Field label="Saldo inicial"><Input type="number" value={saldo} onChange={e => setSaldo(Number(e.target.value))} /></Field><Button fullWidth loading={abrirM.isPending} onClick={() => abrirM.mutate()}>Abrir caixa</Button></>}</Card>
      <Card className="overflow-hidden"><div className="p-4 border-b border-[var(--vf-border)]"><h2 className="text-lg font-semibold">Histórico de caixas</h2></div>{histQ.isLoading ? <Skeleton className="h-64" /> : <div className="overflow-x-auto"><table className="vf-table min-w-[820px]"><thead><tr><th>Data</th><th>Status</th><th>Inicial</th><th>Esperado</th><th>Informado</th><th>Diferença</th><th>Fechado em</th></tr></thead><tbody>{(histQ.data ?? []).map(c => <tr key={c.id}><td>{new Date(`${c.data_caixa}T00:00:00`).toLocaleDateString('pt-BR')}</td><td><Badge color={c.status === 'aberto' ? 'green' : 'blue'}>{c.status}</Badge></td><td>{fmtCurrency(Number(c.saldo_inicial || 0))}</td><td>{fmtCurrency(Number(c.dinheiro_esperado || 0))}</td><td>{fmtCurrency(Number(c.dinheiro_informado || 0))}</td><td className={Number(c.diferenca || 0) === 0 ? '' : Number(c.diferenca || 0) > 0 ? 'text-[var(--vf-success)]' : 'text-[var(--vf-error)]'}>{fmtCurrency(Number(c.diferenca || 0))}</td><td>{c.closed_at ? new Date(c.closed_at).toLocaleString('pt-BR') : '—'}</td></tr>)}</tbody></table></div>}</Card>
    </div>
  </div></div>
}
