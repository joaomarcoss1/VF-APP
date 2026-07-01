'use client'

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Header from '@/components/layout/Header'
import { Alert, Badge, Button, Card, Empty, Input, Skeleton } from '@/components/ui'
import { AuditoriaService } from '@/services'

function labelAcao(acao: string) {
  if (acao.includes('criar')) return 'Criação'
  if (acao.includes('atualizar')) return 'Atualização'
  if (acao.includes('desativar') || acao.includes('excluir')) return 'Remoção/Bloqueio'
  if (acao.includes('fechamento')) return 'Fechamento'
  return 'Ação'
}

export default function AuditoriaPage() {
  const [busca, setBusca] = useState('')
  const { data, isLoading, error } = useQuery({ queryKey: ['auditoria'], queryFn: () => AuditoriaService.listar(150) })
  const logs = data ?? []
  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase()
    if (!q) return logs
    return logs.filter(l => [l.acao, l.entidade, l.entidade_id, JSON.stringify(l.detalhes ?? {})].join(' ').toLowerCase().includes(q))
  }, [logs, busca])

  return <div className="vf-fadein">
    <Header title="Auditoria" />
    <div className="p-4 md:p-6 space-y-5">
      <Alert type="info">Acompanhe ações importantes da empresa. Auditoria ajuda a identificar alterações de equipe, fechamento, permissões e operações críticas.</Alert>
      <Card className="p-4 flex flex-col md:flex-row gap-3 md:items-center md:justify-between"><div><h2 className="text-lg font-semibold">Histórico de ações</h2><p className="text-sm text-[var(--vf-text2)]">Registros recentes por empresa, usuário, entidade e detalhes.</p></div><div className="flex gap-2"><Input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar ação..." /><Button variant="secondary" onClick={() => setBusca('')}>Limpar</Button></div></Card>
      {error && <Alert type="error">{(error as Error).message}</Alert>}
      {isLoading ? <Skeleton className="h-64" /> : !filtrados.length ? <Empty icon="🛡️" title="Nenhum log encontrado" description="As próximas ações críticas aparecerão aqui." /> : <Card className="overflow-hidden">
        <div className="hidden md:block overflow-x-auto"><table className="vf-table min-w-[900px]"><thead><tr><th>Data</th><th>Tipo</th><th>Ação</th><th>Entidade</th><th>Detalhes</th></tr></thead><tbody>{filtrados.map(log => <tr key={log.id}><td>{new Date(log.created_at).toLocaleString('pt-BR')}</td><td><Badge color="blue">{labelAcao(log.acao)}</Badge></td><td className="font-medium text-[var(--vf-text)]">{log.acao}</td><td>{log.entidade || '—'}</td><td className="text-xs text-[var(--vf-text2)] max-w-[360px] truncate">{JSON.stringify(log.detalhes ?? {})}</td></tr>)}</tbody></table></div>
        <div className="md:hidden p-3 space-y-3">{filtrados.map(log => <Card key={log.id} className="p-3 bg-[var(--vf-surface2)]"><div className="flex items-start justify-between gap-2"><div><div className="font-semibold text-[var(--vf-text)]">{log.acao}</div><div className="text-xs text-[var(--vf-text2)]">{new Date(log.created_at).toLocaleString('pt-BR')}</div></div><Badge color="blue">{labelAcao(log.acao)}</Badge></div><div className="mt-2 text-xs text-[var(--vf-text2)]">{log.entidade || 'Sem entidade'} · {JSON.stringify(log.detalhes ?? {})}</div></Card>)}</div>
      </Card>}
    </div>
  </div>
}
