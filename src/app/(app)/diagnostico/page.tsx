'use client'
import { useQuery } from '@tanstack/react-query'
import Header from '@/components/layout/Header'
import { Alert, Badge, Button, Card, Empty, Skeleton } from '@/components/ui'
import { DiagnosticoV15Service } from '@/services'

function color(status: string): 'green'|'amber'|'red'|'blue' { return status === 'ok' ? 'green' : status === 'warn' ? 'amber' : status === 'error' ? 'red' : 'blue' }

export default function DiagnosticoPage() {
  const { data, isLoading, error, refetch, isFetching } = useQuery({ queryKey: ['diagnostico-tecnico-v15'], queryFn: DiagnosticoV15Service.executar, retry: false })
  const ok = (data ?? []).filter(c => c.status === 'ok').length
  const warn = (data ?? []).filter(c => c.status === 'warn').length
  const err = (data ?? []).filter(c => c.status === 'error').length
  return <div className="vf-fadein"><Header title="Diagnóstico técnico" /><div className="p-4 md:p-6 space-y-5">
    <Card className="p-5 flex flex-col md:flex-row gap-4 md:items-center md:justify-between" gold><div><div className="text-xs text-[var(--vf-secondary)] uppercase tracking-widest">Healthcheck V15.1</div><h1 className="text-2xl font-semibold">Prontidão do sistema</h1><p className="text-sm text-[var(--vf-text2)]">Supabase, empresa atual, perfil, Stripe, billing, RLS e tabelas operacionais.</p></div><Button loading={isFetching} onClick={() => refetch()}>Atualizar diagnóstico</Button></Card>
    <div className="grid grid-cols-3 gap-3"><Card className="p-4"><span className="text-xs text-[var(--vf-text3)]">OK</span><b className="block text-2xl text-[var(--vf-success)]">{ok}</b></Card><Card className="p-4"><span className="text-xs text-[var(--vf-text3)]">Atenção</span><b className="block text-2xl text-[var(--vf-warning)]">{warn}</b></Card><Card className="p-4"><span className="text-xs text-[var(--vf-text3)]">Erros</span><b className="block text-2xl text-[var(--vf-error)]">{err}</b></Card></div>
    {error && <Alert type="error">{(error as Error).message}</Alert>}
    {isLoading ? <Skeleton className="h-96" /> : !(data ?? []).length ? <Empty title="Nenhum check executado" description="Clique em atualizar diagnóstico." /> : <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">{(data ?? []).map(check => <Card key={check.chave} className="p-4"><div className="flex items-start justify-between gap-3"><div><h2 className="font-semibold text-[var(--vf-text)]">{check.titulo}</h2><p className="text-sm text-[var(--vf-text2)] mt-2">{check.detalhe}</p></div><Badge color={color(check.status)}>{check.status}</Badge></div></Card>)}</div>}
  </div></div>
}
