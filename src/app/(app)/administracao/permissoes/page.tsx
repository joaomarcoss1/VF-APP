'use client'
import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import Header from '@/components/layout/Header'
import { Alert, Badge, Button, Card, Skeleton } from '@/components/ui'
import { ACOES_PERMISSOES_V15, CARGOS_PERMISSOES_V15, PermissoesV15Service } from '@/services'

export default function PermissoesPage() {
  const qc = useQueryClient()
  const [cargo, setCargo] = useState<string>('funcionario')
  const { data, isLoading } = useQuery({ queryKey: ['permissoes-v15'], queryFn: PermissoesV15Service.matriz })
  const modulos = PermissoesV15Service.modulos()
  const [draft, setDraft] = useState<Record<string, boolean>>({})
  const merged = useMemo(() => {
    const map: Record<string, boolean> = {}
    ;(data ?? []).filter((r: any) => r.cargo === cargo).forEach((r: any) => { map[`${r.modulo}:${r.acao}`] = Boolean(r.permitido) })
    return { ...map, ...draft }
  }, [data, cargo, draft])
  const salvar = useMutation({ mutationFn: async () => {
    const rows = Object.entries(merged).map(([key, permitido]) => { const [modulo, acao] = key.split(':'); return { cargo, modulo, acao, permitido: Boolean(permitido) } })
    await PermissoesV15Service.salvar(rows)
  }, onSuccess: () => { toast.success('Permissões salvas.'); setDraft({}); qc.invalidateQueries({ queryKey: ['permissoes-v15'] }) }, onError: (e: Error) => toast.error(e.message) })

  return <div className="vf-fadein"><Header title="Permissões visuais" /><div className="p-4 md:p-6 space-y-5">
    <Alert type="info">Defina de forma visual o que gerente, funcionário, financeiro, operacional e entregador podem acessar. O front melhora a experiência, mas o bloqueio definitivo continua no Supabase/RLS.</Alert>
    <Card className="p-4 flex gap-2 flex-wrap">{CARGOS_PERMISSOES_V15.map(c => <Button key={c} variant={cargo === c ? 'primary' : 'secondary'} onClick={() => { setCargo(c); setDraft({}) }}>{c}</Button>)}<div className="flex-1" /><Button loading={salvar.isPending} onClick={() => salvar.mutate()}>Salvar matriz</Button></Card>
    {isLoading ? <Skeleton className="h-96" /> : <Card className="overflow-hidden"><div className="overflow-x-auto"><table className="vf-table min-w-[1050px]"><thead><tr><th>Módulo</th>{ACOES_PERMISSOES_V15.map(a => <th key={a}>{a}</th>)}</tr></thead><tbody>{modulos.map(m => <tr key={m.key}><td><b>{m.label}</b><div className="text-xs text-[var(--vf-text3)]">{m.key}</div></td>{ACOES_PERMISSOES_V15.map(a => { const key = `${m.key}:${a}`; const checked = Boolean(merged[key]); return <td key={key}><button onClick={() => setDraft(d => ({ ...d, [key]: !checked }))} className={`px-2 py-1 rounded-full border text-xs ${checked ? 'text-[var(--vf-success)] border-[color-mix(in_srgb,var(--vf-success)_35%,transparent)] bg-[color-mix(in_srgb,var(--vf-success)_10%,transparent)]' : 'text-[var(--vf-text3)] border-[var(--vf-border)]'}`}>{checked ? 'Liberado' : 'Bloqueado'}</button></td> })}</tr>)}</tbody></table></div></Card>}
    <Badge color="gold">Cargo selecionado: {cargo}</Badge>
  </div></div>
}
