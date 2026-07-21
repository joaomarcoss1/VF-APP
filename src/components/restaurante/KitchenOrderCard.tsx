import { CheckCircle2, Clock3, Flame } from 'lucide-react'
import type { RestaurantOrder, OrderStatus } from '@/services/restaurante'
import { StatusBadge } from './StatusBadge'

export function KitchenOrderCard({ order, onChangeStatus }: { order: RestaurantOrder; onChangeStatus: (status: OrderStatus) => void }) {
  const style = order.status === 'novo'
    ? 'border-red-300 bg-red-50 shadow-red-100 animate-[vf-attention_1.7s_ease-in-out_infinite]'
    : order.status === 'em_preparo'
      ? 'border-amber-300 bg-amber-50 shadow-amber-100'
      : order.status === 'pronto'
        ? 'border-emerald-300 bg-emerald-50 shadow-emerald-100'
        : 'border-slate-200 bg-white shadow-slate-100'
  return (
    <article className={`rounded-[26px] border p-5 shadow-xl transition-all duration-300 ${style}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="text-xs font-black uppercase tracking-[.18em] text-slate-500">Mesa</span>
          <h3 className="text-3xl font-black text-slate-950">{order.mesa_numero ?? 'Balcão'}</h3>
          <p className="text-xs font-bold text-slate-500">Comanda #{order.codigo_comanda ?? order.comanda_id.slice(0, 6)}</p>
        </div>
        <StatusBadge status={order.status} />
      </div>
      <div className="my-4 space-y-2 rounded-2xl bg-white/76 p-3 ring-1 ring-black/5">
        {(order.itens ?? []).map((item) => (
          <div key={item.id} className="flex justify-between gap-3 text-sm">
            <span className="font-extrabold text-slate-800">{item.quantidade}x {item.nome_produto}</span>
            {item.observacao && <span className="max-w-[42%] text-right text-xs font-semibold text-slate-500">{item.observacao}</span>}
          </div>
        ))}
      </div>
      {order.status === 'novo' && <button onClick={() => onChangeStatus('em_preparo')} className="vf-btn vf-btn-danger w-full"><Flame size={16} /> Começar preparo</button>}
      {order.status === 'em_preparo' && <button onClick={() => onChangeStatus('pronto')} className="vf-btn vf-btn-secondary w-full"><Clock3 size={16} /> Marcar como pronto</button>}
      {order.status === 'pronto' && <button onClick={() => onChangeStatus('retirado')} className="vf-btn vf-btn-primary w-full"><CheckCircle2 size={16} /> Pedido retirado</button>}
      {order.status === 'retirado' && <div className="rounded-2xl bg-white/70 p-3 text-center text-sm font-black text-slate-500">Finalizado</div>}
    </article>
  )
}
