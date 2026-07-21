'use client'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import Header from '@/components/layout/Header'
import { Alert, Badge, Button, Card, Skeleton } from '@/components/ui'
import { OnboardingV15Service } from '@/services'

const passos = [
  ['dados_empresa', 'Dados da empresa', 'Nome, CNPJ, telefone, endereço e responsável.'],
  ['branding', 'Logo e cores', 'Identidade visual usada em relatórios, etiquetas e portal.'],
  ['equipe', 'Equipe e permissões', 'Admin, gerente, funcionários e matriz visual de permissões.'],
  ['entregadores', 'Entregadores', 'Cadastro de entregadores e valores padrão.'],
  ['produtos', 'Produtos/estoque', 'Cadastro manual ou importação de planilha.'],
  ['pdv', 'PDV', 'Teste de venda, formas de pagamento e comprovante.'],
  ['caixa', 'Caixa', 'Abertura, movimentações e fechamento.'],
  ['assinatura', 'Assinatura', 'Plano, teste, Stripe ou isenção do Admin Master.'],
] as const

export default function OnboardingEmpresaPage() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ['onboarding-v15'], queryFn: OnboardingV15Service.progresso })
  const salvar = useMutation({ mutationFn: ({ chave, valor }: any) => OnboardingV15Service.salvarPasso(chave, valor), onSuccess: () => { toast.success('Checklist atualizado.'); qc.invalidateQueries({ queryKey: ['onboarding-v15'] }) }, onError: (e: Error) => toast.error(e.message) })
  const total = passos.length
  const done = passos.filter(([k]) => Boolean((data as any)?.[k])).length
  return <div className="vf-fadein"><Header title="Primeira configuração" /><div className="p-4 md:p-6 space-y-5">
    <Alert type="info">Use este wizard para deixar a empresa pronta para operar: dados, branding, equipe, entregadores, produtos, PDV, caixa e assinatura.</Alert>
    <Card className="p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3" gold><div><div className="text-xs text-[var(--vf-secondary)] uppercase tracking-widest">Onboarding operacional</div><h1 className="text-2xl font-semibold">{done}/{total} etapas concluídas</h1></div><Badge color={done === total ? 'green' : 'amber'}>{Math.round((done/total)*100)}%</Badge></Card>
    {isLoading ? <Skeleton className="h-96" /> : <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">{passos.map(([k, title, desc]) => { const ok = Boolean((data as any)?.[k]); return <Card key={k} className="p-4 space-y-3"><div className="flex items-start justify-between"><h2 className="font-semibold">{title}</h2><Badge color={ok ? 'green' : 'gray'}>{ok ? 'ok' : 'pendente'}</Badge></div><p className="text-sm text-[var(--vf-text2)]">{desc}</p><Button fullWidth variant={ok ? 'secondary' : 'primary'} loading={salvar.isPending} onClick={() => salvar.mutate({ chave: k, valor: !ok })}>{ok ? 'Marcar pendente' : 'Concluir etapa'}</Button></Card> })}</div>}
  </div></div>
}
