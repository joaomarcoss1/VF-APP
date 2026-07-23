'use client'
import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { Banknote, Calculator, Clock3, CreditCard, Eye, Printer, WalletCards } from 'lucide-react'
import { OperationalShell } from '@/components/restaurante/OperationalShell'
import { NotificationStack } from '@/components/restaurante/NotificationStack'
import { PaymentPanel } from '@/components/restaurante/PaymentPanel'
import { StatusBadge } from '@/components/restaurante/StatusBadge'
import { formatCurrency, type RestaurantPaymentInput } from '@/lib/restaurante-calculos'
import { RestauranteService, type RestaurantCashSession, type RestaurantOrder, type RestaurantTab } from '@/services/restaurante'
import { useRestaurantNotifications } from '@/hooks/useRestaurantNotifications'

export default function CaixaPage() {
  const [cash, setCash] = useState<RestaurantCashSession | null>(null)
  const [tabs, setTabs] = useState<RestaurantTab[]>([])
  const [orders, setOrders] = useState<RestaurantOrder[]>([])
  const [selected, setSelected] = useState<RestaurantTab | null>(null)
  const [openingValue, setOpeningValue] = useState(200)
  const [paying, setPaying] = useState(false)
  const [loading, setLoading] = useState(true)
  const { notifications, markAsRead } = useRestaurantNotifications('caixa')

  async function load() {
    setLoading(true)
    const [caixa, comandas, pedidos] = await Promise.all([RestauranteService.caixaAberto(), RestauranteService.listarComandas('todas'), RestauranteService.listarPedidosCozinha('todos')])
    setCash(caixa)
    setTabs(comandas)
    setOrders(pedidos)
    setSelected((current) => current ? comandas.find((tab) => tab.id === current.id) ?? comandas[0] ?? null : comandas.find((tab) => tab.status === 'aguardando_fechamento') ?? comandas[0] ?? null)
    setLoading(false)
  }
  useEffect(() => { load(); const timer = window.setInterval(load, 6000); return () => window.clearInterval(timer) }, [])

  const summary = useMemo(() => ({
    aguardando: tabs.filter((tab) => tab.status === 'aguardando_fechamento').length,
    abertas: tabs.filter((tab) => ['aberta', 'itens_enviados'].includes(tab.status)).length,
    totalAberto: tabs.filter((tab) => tab.status !== 'paga').reduce((sum, tab) => sum + Number(tab.total || 0), 0),
    pedidosProntos: orders.filter((order) => order.status === 'pronto').length,
  }), [orders, tabs])

  async function openCash() {
    try { setCash(await RestauranteService.abrirCaixa(openingValue)); toast.success('Caixa aberto com sucesso.') } catch (error: any) { toast.error(error.message ?? 'Erro ao abrir caixa.') }
  }

  async function finish(payments: RestaurantPaymentInput[]) {
    if (!selected) return
    try {
      setPaying(true)
      await RestauranteService.finalizarPagamento(selected.id, payments)
      toast.success('Pagamento finalizado e comanda baixada.')
      setSelected(null)
      await load()
    } catch (error: any) { toast.error(error.message ?? 'Erro ao finalizar pagamento.') } finally { setPaying(false) }
  }

  if (!cash && !loading) {
    return (
      <OperationalShell sector="caixa" title="Caixa" subtitle="Abra o caixa antes de receber pagamentos">
        <section className="mx-auto max-w-xl rounded-[32px] border border-[var(--vf-border)] bg-[var(--vf-card)] p-6 shadow-xl">
          <div className="grid h-16 w-16 place-items-center rounded-3xl bg-emerald-50 text-emerald-700"><Banknote size={30} /></div>
          <h2 className="mt-5 text-2xl font-black text-[var(--vf-text)]">Abrir caixa</h2>
          <p className="mt-2 text-sm font-semibold leading-6 text-[var(--vf-text3)]">Informe o valor inicial para iniciar os recebimentos do dia.</p>
          <label className="mt-6 block rounded-2xl border border-[var(--vf-border)] p-4"><span className="text-xs font-black uppercase text-[var(--vf-text3)]">Valor inicial</span><input value={openingValue} onChange={(e) => setOpeningValue(Number(e.target.value))} type="number" step="0.01" className="mt-2 w-full border-0 bg-transparent text-3xl font-black outline-none" /></label>
          <button onClick={openCash} className="vf-btn vf-btn-primary mt-5 w-full">Abrir caixa</button>
        </section>
      </OperationalShell>
    )
  }

  return (
    <OperationalShell sector="caixa" title="Caixa" subtitle="Comandas, pagamentos, pedidos e fechamento" actions={<a href="/atendimento/caixa/fechamento" className="vf-btn vf-btn-secondary"><Calculator size={15} /> Fechar caixa</a>}>
      <NotificationStack notifications={notifications} onDismiss={markAsRead} />
      <section className="grid gap-4 md:grid-cols-4">
        <div className="vf-card p-5"><span className="text-xs font-black uppercase text-[var(--vf-text3)]">Aguardando fechamento</span><strong className="mt-2 block text-3xl font-black text-amber-600">{summary.aguardando}</strong></div>
        <div className="vf-card p-5"><span className="text-xs font-black uppercase text-[var(--vf-text3)]">Em atendimento</span><strong className="mt-2 block text-3xl font-black text-blue-600">{summary.abertas}</strong></div>
        <div className="vf-card p-5"><span className="text-xs font-black uppercase text-[var(--vf-text3)]">Pedidos prontos</span><strong className="mt-2 block text-3xl font-black text-emerald-600">{summary.pedidosProntos}</strong></div>
        <div className="vf-card p-5"><span className="text-xs font-black uppercase text-[var(--vf-text3)]">Total em aberto</span><strong className="mt-2 block text-3xl font-black text-[var(--vf-text)]">{formatCurrency(summary.totalAberto)}</strong></div>
      </section>

      <section className="mt-6 grid gap-5 xl:grid-cols-[370px,1fr,320px]">
        <div className="rounded-[30px] border border-[var(--vf-border)] bg-[var(--vf-card)] p-4 shadow-sm md:p-5">
          <h2 className="text-lg font-black text-[var(--vf-text)]">Comandas</h2>
          <p className="text-sm font-semibold text-[var(--vf-text3)]">Somente o caixa finaliza pagamento e libera mesa.</p>
          <div className="mt-4 space-y-3">
            {tabs.map((tab) => (
              <button key={tab.id} onClick={() => setSelected(tab)} className={`w-full rounded-[22px] border p-4 text-left transition ${selected?.id === tab.id ? 'border-blue-300 bg-blue-50' : tab.status === 'aguardando_fechamento' ? 'border-amber-300 bg-amber-50 animate-[vf-attention_1.9s_ease-in-out_infinite]' : 'border-[var(--vf-border)] bg-[var(--vf-surface2)] hover:border-blue-200'}`}>
                <div className="flex items-start justify-between gap-2"><div><strong className="block text-[var(--vf-text)]">{tab.mesa?.nome ?? `Comanda #${tab.codigo}`}</strong><span className="text-xs font-bold text-[var(--vf-text3)]">{tab.cliente_nome ?? 'Cliente não informado'} · {tab.itens?.length ?? 0} itens</span></div><StatusBadge status={tab.status} /></div>
                <strong className="mt-3 block text-lg text-blue-600">{formatCurrency(tab.total)}</strong>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-[30px] border border-[var(--vf-border)] bg-[var(--vf-card)] p-4 shadow-sm md:p-5">
          {!selected ? <div className="vf-empty">Selecione uma comanda para receber.</div> : (
            <>
              <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                <div><h2 className="text-xl font-black text-[var(--vf-text)]">Comanda #{selected.codigo}</h2><p className="text-sm font-semibold text-[var(--vf-text3)]">{selected.mesa?.nome ?? 'Venda balcão'} · {selected.cliente_nome ?? 'Cliente não informado'}</p></div>
                <div className="flex gap-2"><a href={`/atendimento/caixa/imprimir/pre-conta/${selected.id}`} className="vf-btn vf-btn-ghost"><Printer size={15} /> Pré-conta</a><StatusBadge status={selected.status} /></div>
              </div>
              <div className="mt-5 space-y-3">
                {(selected.itens ?? []).map((item) => <div key={item.id} className="flex justify-between gap-3 rounded-2xl bg-[var(--vf-surface2)] p-3 text-sm"><div><strong>{item.quantidade}x {item.nome_produto}</strong>{item.observacao && <p className="text-xs font-semibold text-[var(--vf-text3)]">Obs: {item.observacao}</p>}</div><strong>{formatCurrency(item.total)}</strong></div>)}
              </div>
              <div className="mt-5 rounded-2xl border border-[var(--vf-border)] bg-[var(--vf-surface2)] p-4 text-sm">
                <div className="flex justify-between"><span>Subtotal</span><strong>{formatCurrency(selected.subtotal)}</strong></div>
                <div className="mt-2 flex justify-between"><span>Taxa de serviço</span><strong>{formatCurrency(selected.taxa_servico)}</strong></div>
                <div className="mt-2 flex justify-between"><span>Desconto</span><strong>{formatCurrency(selected.desconto)}</strong></div>
                <div className="mt-3 flex justify-between border-t border-[var(--vf-border)] pt-3 text-xl"><span className="font-black">Total</span><strong className="text-blue-600">{formatCurrency(selected.total)}</strong></div>
              </div>
              <div className="mt-5"><PaymentPanel total={selected.total} onConfirm={finish} loading={paying} /></div>
            </>
          )}
        </div>

        <aside className="space-y-4">
          <div className="rounded-[30px] border border-[var(--vf-border)] bg-[var(--vf-card)] p-5 shadow-sm">
            <h2 className="text-lg font-black text-[var(--vf-text)]">Resumo do caixa</h2>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between"><span>Caixa</span><strong className="text-emerald-600">Aberto</strong></div>
              <div className="flex justify-between"><span>Valor de abertura</span><strong>{formatCurrency(cash?.valor_abertura ?? 0)}</strong></div>
              <div className="flex justify-between"><span>Esperado dinheiro</span><strong>{formatCurrency(cash?.valor_esperado_dinheiro ?? 0)}</strong></div>
              <div className="flex justify-between"><span>Total em aberto</span><strong>{formatCurrency(summary.totalAberto)}</strong></div>
            </div>
          </div>
          <div className="rounded-[30px] border border-[var(--vf-border)] bg-[var(--vf-card)] p-5 shadow-sm">
            <h2 className="text-lg font-black text-[var(--vf-text)]">Pedidos da cozinha</h2>
            <div className="mt-3 space-y-2">
              {orders.filter((o) => o.status === 'pronto').slice(0, 5).map((order) => <div key={order.id} className="flex items-center justify-between rounded-2xl bg-emerald-50 p-3 text-sm"><span className="font-black">Mesa {order.mesa_numero ?? 'Balcão'}</span><StatusBadge status={order.status} /></div>)}
              {orders.filter((o) => o.status === 'pronto').length === 0 && <p className="text-sm font-semibold text-[var(--vf-text3)]">Nenhum pedido pronto.</p>}
            </div>
          </div>
        </aside>
      </section>
    </OperationalShell>
  )
}
