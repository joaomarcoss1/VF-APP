'use client'
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import Header from '@/components/layout/Header'
import { Alert, Badge, Button, Card, Field, Input, Skeleton, Textarea } from '@/components/ui'
import { BillingV15Service, type PlanoSaasV15 } from '@/services'
import { fmtCurrency } from '@/lib/precificacao'

const empty: PlanoSaasV15 = { codigo: '', nome: '', descricao: '', preco_mensal: 0, stripe_price_id: '', modulos: [], limites: {}, recursos: {}, ativo: true, ordem: 0 }

export default function MasterPlanosPage() {
  const qc = useQueryClient()
  const { data, isLoading, error } = useQuery({ queryKey: ['master-planos-v15'], queryFn: BillingV15Service.planos })
  const [form, setForm] = useState<PlanoSaasV15>(empty)
  const salvar = useMutation({ mutationFn: BillingV15Service.masterSalvarPlano, onSuccess: () => { toast.success('Plano salvo.'); setForm(empty); qc.invalidateQueries({ queryKey: ['master-planos-v15'] }) }, onError: (e: Error) => toast.error(e.message) })

  return <div className="vf-fadein"><Header title="Planos SaaS" /><div className="p-4 md:p-6 space-y-5">
    <Alert type="info">Somente o Admin Master Global gerencia planos, preços e IDs de preço da Stripe. A assinatura teste e a isenção permanente são controladas em Master → Assinaturas.</Alert>
    {error && <Alert type="error">{(error as Error).message}</Alert>}
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_.8fr] gap-5">
      <Card className="p-4 overflow-hidden">
        <h2 className="text-lg font-semibold mb-3">Planos configurados</h2>
        {isLoading ? <Skeleton className="h-64" /> : <div className="overflow-x-auto"><table className="vf-table min-w-[760px]"><thead><tr><th>Plano</th><th>Código</th><th>Preço</th><th>Stripe Price</th><th>Status</th><th>Ação</th></tr></thead><tbody>{(data ?? []).map((p: any) => <tr key={p.id || p.codigo}><td><b>{p.nome}</b><div className="text-xs text-[var(--vf-text3)]">{p.descricao}</div></td><td>{p.codigo}</td><td>{fmtCurrency(Number(p.preco_mensal || 0))}</td><td className="text-xs">{p.stripe_price_id || 'price via API'}</td><td><Badge color={p.ativo ? 'green' : 'gray'}>{p.ativo ? 'ativo' : 'inativo'}</Badge></td><td><Button size="sm" variant="secondary" onClick={() => setForm({ ...p, modulos: p.modulos || [] })}>Editar</Button></td></tr>)}</tbody></table></div>}
      </Card>
      <Card className="p-4 space-y-3" gold>
        <h2 className="text-lg font-semibold">Criar/editar plano</h2>
        <Field label="Código"><Input value={form.codigo} onChange={e => setForm({ ...form, codigo: e.target.value })} placeholder="starter" /></Field>
        <Field label="Nome"><Input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} placeholder="Starter" /></Field>
        <Field label="Descrição"><Textarea value={form.descricao || ''} onChange={e => setForm({ ...form, descricao: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-3"><Field label="Preço mensal"><Input type="number" value={form.preco_mensal || 0} onChange={e => setForm({ ...form, preco_mensal: Number(e.target.value) })} /></Field><Field label="Ordem"><Input type="number" value={form.ordem || 0} onChange={e => setForm({ ...form, ordem: Number(e.target.value) })} /></Field></div>
        <Field label="Stripe Price ID"><Input value={form.stripe_price_id || ''} onChange={e => setForm({ ...form, stripe_price_id: e.target.value })} placeholder="price_..." /></Field>
        <Field label="Módulos separados por vírgula"><Input value={(form.modulos || []).join(',')} onChange={e => setForm({ ...form, modulos: e.target.value.split(',').map(x => x.trim()).filter(Boolean) })} placeholder="dashboard,pdv,estoque" /></Field>
        <Button fullWidth loading={salvar.isPending} onClick={() => salvar.mutate(form)} disabled={!form.codigo || !form.nome}>Salvar plano</Button>
      </Card>
    </div>
  </div></div>
}
