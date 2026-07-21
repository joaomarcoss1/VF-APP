'use client'
import { useMemo, useState } from 'react'
import { Banknote, CreditCard, QrCode, WalletCards } from 'lucide-react'
import { calcularPagamentoMisto, calcularTroco, formatCurrency, money, type RestaurantPaymentInput } from '@/lib/restaurante-calculos'

const paymentOptions = [
  { id: 'dinheiro', label: 'Dinheiro', icon: Banknote },
  { id: 'pix', label: 'Pix', icon: QrCode },
  { id: 'credito', label: 'Cartão de crédito', icon: CreditCard },
  { id: 'debito', label: 'Cartão de débito', icon: CreditCard },
  { id: 'voucher', label: 'Voucher', icon: WalletCards },
]

export function PaymentPanel({ total, onConfirm, loading }: { total: number; onConfirm: (payments: RestaurantPaymentInput[]) => void; loading?: boolean }) {
  const [forma, setForma] = useState('dinheiro')
  const [valor, setValor] = useState(total)
  const [recebido, setRecebido] = useState(total)
  const [payments, setPayments] = useState<RestaurantPaymentInput[]>([])
  const summary = useMemo(() => calcularPagamentoMisto(total, payments), [payments, total])
  const trocoAtual = forma === 'dinheiro' ? calcularTroco(valor, recebido) : 0

  function addPayment() {
    const payment = { forma_pagamento: forma, valor: money(valor), valor_recebido: forma === 'dinheiro' ? money(recebido) : money(valor) }
    setPayments((current) => [...current, payment])
    const nextRestante = Math.max(0, total - (summary.totalPago + payment.valor))
    setValor(money(nextRestante))
    setRecebido(money(nextRestante))
  }

  return (
    <section className="grid gap-4 lg:grid-cols-[220px,1fr]">
      <div className="space-y-2">
        {paymentOptions.map((option) => {
          const Icon = option.icon
          const active = forma === option.id
          return <button key={option.id} onClick={() => setForma(option.id)} className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left text-sm font-black transition ${active ? 'border-emerald-300 bg-emerald-50 text-emerald-700 shadow-sm' : 'border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:bg-blue-50'}`}><Icon size={17} /> {option.label}</button>
        })}
      </div>
      <div className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl bg-slate-50 p-4">
            <span className="text-xs font-black uppercase tracking-wide text-slate-500">Total</span>
            <strong className="mt-1 block text-xl font-black text-slate-950">{formatCurrency(total)}</strong>
          </div>
          <label className="rounded-2xl border border-slate-200 p-4">
            <span className="text-xs font-black uppercase tracking-wide text-slate-500">Valor</span>
            <input value={valor} onChange={(e) => setValor(Number(e.target.value))} type="number" step="0.01" className="mt-2 w-full border-0 bg-transparent text-xl font-black outline-none" />
          </label>
          <label className="rounded-2xl border border-slate-200 p-4">
            <span className="text-xs font-black uppercase tracking-wide text-slate-500">Recebido</span>
            <input value={recebido} onChange={(e) => setRecebido(Number(e.target.value))} type="number" step="0.01" disabled={forma !== 'dinheiro'} className="mt-2 w-full border-0 bg-transparent text-xl font-black outline-none disabled:text-slate-300" />
          </label>
        </div>
        {forma === 'dinheiro' && <div className="mt-4 rounded-2xl bg-emerald-50 p-4 text-center"><span className="text-xs font-black uppercase tracking-wide text-emerald-700">Troco</span><strong className="block text-3xl font-black text-emerald-700">{formatCurrency(trocoAtual)}</strong></div>}
        <div className="mt-4 flex flex-wrap gap-2">
          {[10, 20, 50, 100].map((v) => <button key={v} onClick={() => { setRecebido(v); setValor(total) }} className="vf-btn vf-btn-ghost">{formatCurrency(v)}</button>)}
          <button onClick={() => { setValor(total); setRecebido(total) }} className="vf-btn vf-btn-ghost">Valor exato</button>
          <button onClick={addPayment} className="vf-btn vf-btn-secondary">Adicionar pagamento</button>
        </div>
        <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="mb-3 flex items-center justify-between"><strong>Pagamentos</strong><span className="text-sm font-black text-slate-500">Restante: {formatCurrency(summary.restante)}</span></div>
          {payments.length === 0 ? <p className="text-sm font-semibold text-slate-500">Nenhum pagamento lançado.</p> : payments.map((p, index) => <div key={index} className="flex items-center justify-between border-t border-slate-200 py-2 text-sm"><span className="font-bold capitalize">{p.forma_pagamento}</span><strong>{formatCurrency(p.valor)}</strong></div>)}
        </div>
        <button disabled={loading || !summary.quitado} onClick={() => onConfirm(payments.length ? payments : [{ forma_pagamento: forma, valor: total, valor_recebido: forma === 'dinheiro' ? recebido : total }])} className="vf-btn vf-btn-primary mt-4 w-full disabled:opacity-50">{loading ? 'Finalizando...' : 'Finalizar pagamento'}</button>
      </div>
    </section>
  )
}
