'use client'
import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { ChefHat, Clock3, Flame, RotateCcw } from 'lucide-react'
import { KitchenOrderCard } from '@/components/restaurante/KitchenOrderCard'
import { NotificationStack } from '@/components/restaurante/NotificationStack'
import { OperationalShell } from '@/components/restaurante/OperationalShell'
import { RestauranteService, type OrderStatus, type RestaurantOrder } from '@/services/restaurante'
import { useRestaurantNotifications } from '@/hooks/useRestaurantNotifications'

const filters: Array<{ id: OrderStatus | 'todos'; label: string }> = [
  { id: 'todos', label: 'Todos' },
  { id: 'novo', label: 'Novos' },
  { id: 'em_preparo', label: 'Em preparo' },
  { id: 'pronto', label: 'Prontos' },
  { id: 'retirado', label: 'Retirados' },
]

export default function CozinhaPage() {
  const [orders, setOrders] = useState<RestaurantOrder[]>([])
  const [filter, setFilter] = useState<OrderStatus | 'todos'>('todos')
  const [loading, setLoading] = useState(true)
  const { notifications, markAsRead } = useRestaurantNotifications('cozinha')

  async function load() {
    setLoading(true)
    setOrders(await RestauranteService.listarPedidosCozinha('todos'))
    setLoading(false)
  }
  useEffect(() => { load(); const timer = window.setInterval(load, 5000); return () => window.clearInterval(timer) }, [])

  const filtered = useMemo(() => filter === 'todos' ? orders : orders.filter((o) => o.status === filter), [filter, orders])
  const counters = useMemo(() => ({ novo: orders.filter((o) => o.status === 'novo').length, em_preparo: orders.filter((o) => o.status === 'em_preparo').length, pronto: orders.filter((o) => o.status === 'pronto').length }), [orders])

  async function change(orderId: string, status: OrderStatus) {
    try {
      await RestauranteService.atualizarPedido(orderId, status)
      toast.success(status === 'em_preparo' ? 'Preparo iniciado.' : status === 'pronto' ? 'Pedido marcado como pronto.' : 'Pedido atualizado.')
      await load()
    } catch (error: any) { toast.error(error.message ?? 'Erro ao atualizar pedido.') }
  }

  return (
    <OperationalShell sector="cozinha" title="Cozinha" subtitle="Pedidos em tempo real por prioridade e status" actions={<button onClick={load} className="vf-btn vf-btn-ghost"><RotateCcw size={15} /> Atualizar</button>}>
      <NotificationStack notifications={notifications} onDismiss={markAsRead} />
      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-[26px] border border-red-200 bg-red-50 p-5"><div className="flex items-center gap-3"><Flame className="text-red-600" /><span className="text-sm font-black uppercase text-red-700">Novos</span></div><strong className="mt-3 block text-4xl font-black text-red-700">{counters.novo}</strong></div>
        <div className="rounded-[26px] border border-amber-200 bg-amber-50 p-5"><div className="flex items-center gap-3"><Clock3 className="text-amber-600" /><span className="text-sm font-black uppercase text-amber-700">Em preparo</span></div><strong className="mt-3 block text-4xl font-black text-amber-700">{counters.em_preparo}</strong></div>
        <div className="rounded-[26px] border border-emerald-200 bg-emerald-50 p-5"><div className="flex items-center gap-3"><ChefHat className="text-emerald-600" /><span className="text-sm font-black uppercase text-emerald-700">Prontos</span></div><strong className="mt-3 block text-4xl font-black text-emerald-700">{counters.pronto}</strong></div>
      </section>
      <section className="mt-6 rounded-[30px] border border-slate-200 bg-white p-4 shadow-sm md:p-5">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h2 className="text-xl font-black text-slate-950">Fila da cozinha</h2>
            <p className="text-sm font-semibold text-slate-500">Vermelho: novo · Amarelo: em preparo · Verde: pronto para retirada.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {filters.map((item) => <button key={item.id} onClick={() => setFilter(item.id)} className={`rounded-full px-4 py-2 text-xs font-black transition ${filter === item.id ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-600 hover:bg-blue-50 hover:text-blue-700'}`}>{item.label}</button>)}
          </div>
        </div>
        {loading ? <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-[280px] vf-skeleton" />)}</div> : <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">{filtered.map((order) => <KitchenOrderCard key={order.id} order={order} onChangeStatus={(status) => change(order.id, status)} />)}</div>}
        {!loading && filtered.length === 0 && <div className="vf-empty mt-5 text-center"><strong>Nenhum pedido nessa fila.</strong><p className="text-sm text-slate-500">Aguardando novos pedidos do atendimento.</p></div>}
      </section>
    </OperationalShell>
  )
}
