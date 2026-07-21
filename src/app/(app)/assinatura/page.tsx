'use client'
import { useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import Header from '@/components/layout/Header'
import { Alert, Badge, Button, Card, Skeleton } from '@/components/ui'
import { BillingV15Service } from '@/services'
import { fmtCurrency } from '@/lib/precificacao'

function badgeColor(status?: string): 'green' | 'red' | 'amber' | 'blue' | 'gold' {
  const s = String(status || '').toLowerCase()
  if (['active','paid','isento_permanente','trial_manual'].includes(s)) return 'green'
  if (['past_due','checkout_created'].includes(s)) return 'amber'
  if (['canceled','unpaid','blocked','bloqueada','vencida','trial_desativado'].includes(s)) return 'red'
  return 'blue'
}

export default function AssinaturaPage() {
  const planosQ = useQuery({ queryKey: ['billing-v15-planos'], queryFn: BillingV15Service.planos, retry: false })
  const atualQ = useQuery({ queryKey: ['billing-v15-status'], queryFn: BillingV15Service.statusAtual, retry: false })
  const assQ = useQuery({ queryKey: ['billing-v15-assinatura'], queryFn: BillingV15Service.assinaturaAtual, retry: false })

  async function assinar(plano: any) {
    const data = await BillingV15Service.criarCheckout(plano)
    if (data.url) window.location.assign(data.url)
    else toast.success('Checkout preparado. Configure Stripe para pagamentos reais.')
  }

  const status = atualQ.data
  return <div className="vf-fadein">
    <Header title="Plano e assinatura" />
    <div className="p-4 md:p-6 space-y-5">
      <Card className="p-5 flex flex-col md:flex-row gap-4 md:items-center md:justify-between" gold>
        <div>
          <div className="text-xs uppercase tracking-widest text-[var(--vf-secondary)]">Billing VF Nexus</div>
          <h1 className="text-2xl font-semibold text-[var(--vf-text)] mt-1">Controle de assinatura da empresa</h1>
          <p className="text-sm text-[var(--vf-text2)] mt-1">Pagamentos via Stripe, teste manual e bloqueio automático por inadimplência.</p>
        </div>
        {status && <Badge color={badgeColor(status.status)}>{status.status}</Badge>}
      </Card>

      {atualQ.isLoading ? <Skeleton className="h-28 rounded-2xl" /> : status && <Alert type={status.blocked ? 'error' : status.status === 'past_due' ? 'warn' : 'success'}>
        {status.cobranca_abolida ? 'Esta empresa está isenta de cobranças permanentemente pelo Admin Master Global.' : status.trial_indeterminado ? 'Esta empresa está em modo teste sem prazo. O acesso permanece ativo até o Admin Master desativar o teste.' : status.reason || 'Assinatura ativa e acesso liberado.'}
      </Alert>}

      {assQ.data && <Card className="p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
        <div><span className="text-xs text-[var(--vf-text3)]">Modo</span><b className="block text-[var(--vf-text)]">{(assQ.data as any).modo_acesso || 'manual'}</b></div>
        <div><span className="text-xs text-[var(--vf-text3)]">Plano</span><b className="block text-[var(--vf-text)]">{(assQ.data as any).plano?.nome || (assQ.data as any).plano_codigo || '—'}</b></div>
        <div><span className="text-xs text-[var(--vf-text3)]">Valor</span><b className="block text-[var(--vf-primary)]">{fmtCurrency(Number((assQ.data as any).valor_mensal || (assQ.data as any).plano?.preco_mensal || 0))}</b></div>
        <div><span className="text-xs text-[var(--vf-text3)]">Renovação</span><b className="block text-[var(--vf-text)]">{(assQ.data as any).current_period_end ? new Date((assQ.data as any).current_period_end).toLocaleDateString('pt-BR') : '—'}</b></div>
      </Card>}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {planosQ.isLoading ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-56 rounded-2xl" />) : (planosQ.data ?? []).filter((p: any) => p.codigo !== 'teste').map((plano: any) => <Card key={plano.id || plano.codigo} className="p-5 space-y-4">
          <div className="flex items-start justify-between gap-2">
            <div><h2 className="font-bold text-[var(--vf-text)]">{plano.nome}</h2><p className="text-xs text-[var(--vf-text3)] mt-1">{plano.descricao}</p></div>
            {plano.codigo === 'profissional' && <Badge color="gold">Popular</Badge>}
          </div>
          <div className="text-3xl font-bold text-[var(--vf-primary)]">{fmtCurrency(Number(plano.preco_mensal || 0))}<span className="text-xs text-[var(--vf-text3)]">/mês</span></div>
          <div className="text-xs text-[var(--vf-text2)] space-y-1">
            {(plano.modulos || []).slice(0, 6).map((m: string) => <div key={m}>✓ {m === '*' ? 'Todos os módulos' : m}</div>)}
          </div>
          <Button fullWidth onClick={() => assinar(plano).catch(e => toast.error(e.message))}>Assinar com Stripe</Button>
        </Card>)}
      </div>
    </div>
  </div>
}
