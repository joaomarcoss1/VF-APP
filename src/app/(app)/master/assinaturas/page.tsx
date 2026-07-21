'use client'
import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import Header from '@/components/layout/Header'
import { Alert, Badge, Button, Card, ConfirmActionButton, Input, Skeleton } from '@/components/ui'
import { BillingV15Service } from '@/services'

function badge(status?: string): 'green' | 'red' | 'amber' | 'blue' | 'gold' {
  const s = String(status || '').toLowerCase()
  if (['active','trial_manual','isento_permanente'].includes(s)) return 'green'
  if (['past_due','checkout_created'].includes(s)) return 'amber'
  if (['trial_desativado','canceled','unpaid','blocked','sem_cobranca_ativa'].includes(s)) return 'red'
  return 'blue'
}

export default function MasterAssinaturasPage() {
  const qc = useQueryClient()
  const [busca, setBusca] = useState('')
  const assinaturasQ = useQuery({ queryKey: ['master-assinaturas-v15'], queryFn: BillingV15Service.masterListarAssinaturas })
  const empresasQ = useQuery({ queryKey: ['master-empresas-billing-v15'], queryFn: BillingV15Service.masterListarEmpresasSemAssinatura })
  const trial = useMutation({ mutationFn: ({ empresaId, ativo, obs }: any) => BillingV15Service.masterSetTrial(empresaId, ativo, obs), onSuccess: () => { toast.success('Teste atualizado.'); qc.invalidateQueries() }, onError: (e: Error) => toast.error(e.message) })
  const isencao = useMutation({ mutationFn: ({ empresaId, ativo, obs }: any) => BillingV15Service.masterSetCobrancaAbolida(empresaId, ativo, obs), onSuccess: () => { toast.success('Isenção atualizada.'); qc.invalidateQueries() }, onError: (e: Error) => toast.error(e.message) })

  const rows = useMemo(() => {
    const map = new Map<string, any>()
    ;(empresasQ.data ?? []).forEach((e: any) => map.set(e.id, { empresa: e, status: e.billing_status || 'sem_assinatura' }))
    ;(assinaturasQ.data ?? []).forEach((a: any) => map.set(a.empresa_id, a))
    const q = busca.toLowerCase().trim()
    return Array.from(map.values()).filter((row: any) => !q || JSON.stringify(row).toLowerCase().includes(q))
  }, [empresasQ.data, assinaturasQ.data, busca])

  return <div className="vf-fadein"><Header title="Assinaturas das empresas" /><div className="p-4 md:p-6 space-y-5">
    <Alert type="warn">As funções <b>Teste sem prazo</b> e <b>Abolir cobranças para sempre</b> aparecem somente para o Admin Master Global. Use com auditoria: elas controlam diretamente o bloqueio ou liberação da empresa.</Alert>
    <Card className="p-4 flex flex-col md:flex-row gap-3 md:items-center md:justify-between"><div><h1 className="text-xl font-semibold">Controle de pagamento das empresas</h1><p className="text-sm text-[var(--vf-text2)]">Stripe, teste manual, inadimplência e isenção permanente.</p></div><Input className="md:max-w-xs" value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar empresa..." /></Card>
    {assinaturasQ.isLoading || empresasQ.isLoading ? <Skeleton className="h-96" /> : <Card className="overflow-hidden"><div className="overflow-x-auto"><table className="vf-table min-w-[1100px]"><thead><tr><th>Empresa</th><th>Status</th><th>Modo</th><th>Plano</th><th>Stripe</th><th>Teste</th><th>Isenção permanente</th><th>Ações Master</th></tr></thead><tbody>{rows.map((row: any) => {
      const e = row.empresa || row.empresas || row
      const empresaId = row.empresa_id || e.id
      const status = row.status || e.billing_status || 'sem_assinatura'
      const trialAtivo = Boolean(row.trial_indeterminado || row.trial_ativo || e.trial_indeterminado)
      const isenta = Boolean(row.cobranca_abolida || e.cobranca_abolida)
      return <tr key={empresaId}><td><b>{e.nome_fantasia || e.nome || 'Empresa'}</b><div className="text-xs text-[var(--vf-text3)]">{e.codigo_empresa || e.matricula_empresa || empresaId}</div></td><td><Badge color={badge(status)}>{status}</Badge></td><td>{row.modo_acesso || 'manual'}</td><td>{row.plano?.nome || row.plano_codigo || '—'}</td><td className="text-xs">{row.stripe_subscription_id || '—'}</td><td><Badge color={trialAtivo ? 'green' : 'gray'}>{trialAtivo ? 'ativo' : 'inativo'}</Badge></td><td><Badge color={isenta ? 'gold' : 'gray'}>{isenta ? 'sem cobrança' : 'cobra normalmente'}</Badge></td><td className="space-x-2 whitespace-nowrap"><Button size="sm" variant="secondary" loading={trial.isPending} onClick={() => trial.mutate({ empresaId, ativo: true, obs: 'Ativado pelo painel master' })}>Ativar teste</Button><ConfirmActionButton title="Desativar teste grátis?" description="A empresa pode ser bloqueada caso não tenha assinatura Stripe ativa ou isenção permanente." onConfirm={async (obs) => { await trial.mutateAsync({ empresaId, ativo: false, obs }) }} requireReason confirmLabel="Desativar teste">Desativar teste</ConfirmActionButton><ConfirmActionButton title="Abolir cobranças para sempre?" description="Esta empresa ficará liberada permanentemente sem cobrança. Apenas o Admin Master Global deve usar esta função." onConfirm={async (obs) => { await isencao.mutateAsync({ empresaId, ativo: true, obs }) }} requireReason variant="secondary" confirmLabel="Abolir cobranças">Isentar</ConfirmActionButton><ConfirmActionButton title="Reativar cobranças?" description="A empresa volta a depender de assinatura ativa, teste ou pagamento." onConfirm={async (obs) => { await isencao.mutateAsync({ empresaId, ativo: false, obs }) }} requireReason confirmLabel="Reativar cobrança">Cobrar</ConfirmActionButton></td></tr>
    })}</tbody></table></div></Card>}
  </div></div>
}
