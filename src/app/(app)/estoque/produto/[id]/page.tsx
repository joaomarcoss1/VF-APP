'use client'
import { useParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import Header from '@/components/layout/Header'
import { Badge, ButtonLink, Card, Skeleton, Alert } from '@/components/ui'
import { createBrowserClient } from '@/lib/supabase'
import { fmtCurrency } from '@/lib/precificacao'
import { getEmpresaIdObrigatoria } from '@/services/_tenant'

export default function EstoqueProdutoPage() {
  const params = useParams<{ id: string }>()
  const { data, isLoading, error } = useQuery({ queryKey: ['estoque-produto', params.id], queryFn: async () => {
    const db = createBrowserClient()
    const empresaId = await getEmpresaIdObrigatoria()
    const { data, error } = await db.from('produtos').select('*, estoque:produto_estoque(*), movimentacoes:movimentacoes_produto_estoque(*)').eq('id', params.id).eq('empresa_id', empresaId).maybeSingle()
    if (error) throw new Error(error.message)
    return data as any
  }})
  return <div className="vf-fadein"><Header title="Produto no estoque" /><div className="p-4 md:p-6 space-y-4">{isLoading ? <Skeleton className="h-64 rounded-3xl" /> : error ? <Alert type="error">{(error as Error).message}</Alert> : !data ? <Alert type="warn">Produto não encontrado.</Alert> : <><div className="flex flex-col md:flex-row justify-between gap-3"><div><h1 className="text-2xl font-bold text-[var(--vf-text)]">{data.nome}</h1><p className="text-sm text-[var(--vf-text3)]">{data.codigo_barras || data.sku || 'Sem código vinculado'}</p></div><div className="flex gap-2"><ButtonLink href="/scanner" variant="secondary">Scanner</ButtonLink><ButtonLink href="/etiquetas">Etiqueta</ButtonLink></div></div><div className="grid grid-cols-2 lg:grid-cols-4 gap-3"><Card className="p-4"><span className="text-xs text-[var(--vf-text3)]">Preço</span><b className="block text-xl text-[var(--vf-primary)]">{fmtCurrency(data.preco_venda || 0)}</b></Card><Card className="p-4"><span className="text-xs text-[var(--vf-text3)]">Custo</span><b className="block text-xl">{fmtCurrency(data.custo_total || 0)}</b></Card><Card className="p-4"><span className="text-xs text-[var(--vf-text3)]">Estoque atual</span><b className="block text-xl">{data.estoque?.[0]?.quantidade_atual ?? 0}</b></Card><Card className="p-4"><span className="text-xs text-[var(--vf-text3)]">Status</span><Badge color={data.disponivel ? 'green' : 'red'}>{data.disponivel ? 'Disponível' : 'Indisponível'}</Badge></Card></div><Card className="p-4"><h2 className="font-semibold mb-3">Últimas movimentações</h2><div className="space-y-2">{(data.movimentacoes || []).slice(0,10).map((m:any)=><div key={m.id} className="flex justify-between rounded-2xl border border-[var(--vf-border)] p-3 text-sm"><span>{m.tipo} · {m.motivo || 'sem motivo'}</span><b>{m.quantidade}</b></div>)}{!data.movimentacoes?.length && <p className="text-sm text-[var(--vf-text3)]">Nenhuma movimentação registrada.</p>}</div></Card></>}</div></div>
}
