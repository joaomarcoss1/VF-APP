'use client'
import { useEffect, useState } from 'react'
import { Printer, Save } from 'lucide-react'
import toast from 'react-hot-toast'
import { OperationalShell } from '@/components/restaurante/OperationalShell'
import { formatCurrency } from '@/lib/restaurante-calculos'
import { RestauranteService, type RestaurantCashSession } from '@/services/restaurante'

export default function FechamentoCaixaPage() {
  const [cash, setCash] = useState<RestaurantCashSession | null>(null)
  const [valor, setValor] = useState(0)
  const [obs, setObs] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => { RestauranteService.caixaAberto().then((c) => { setCash(c); setValor(Number(c?.valor_esperado_dinheiro ?? c?.valor_abertura ?? 0)) }).catch(() => null) }, [])

  async function close() {
    try {
      setLoading(true)
      const closed = await RestauranteService.fecharCaixa({ dinheiro_informado: valor, observacao: obs })
      setCash(closed)
      toast.success('Caixa fechado/conferido com sucesso.')
    } catch (error: any) { toast.error(error.message ?? 'Erro ao fechar caixa.') } finally { setLoading(false) }
  }

  const esperado = Number(cash?.valor_esperado_dinheiro ?? cash?.valor_abertura ?? 0)
  const diff = Number((valor - esperado).toFixed(2))

  return (
    <OperationalShell sector="caixa" title="Fechamento do caixa" subtitle="Conferência de valores, divergências e impressão">
      <section className="grid gap-5 lg:grid-cols-[1fr,440px]">
        <div className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-black text-slate-950">Resumo do período</h2>
          <p className="text-sm font-semibold text-slate-500">Confira vendas e valores antes de encerrar a operação.</p>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl bg-slate-50 p-4"><span className="text-xs font-black uppercase text-slate-500">Valor de abertura</span><strong className="mt-2 block text-2xl font-black">{formatCurrency(cash?.valor_abertura ?? 0)}</strong></div>
            <div className="rounded-2xl bg-emerald-50 p-4"><span className="text-xs font-black uppercase text-emerald-700">Dinheiro esperado</span><strong className="mt-2 block text-2xl font-black text-emerald-700">{formatCurrency(esperado)}</strong></div>
            <div className="rounded-2xl bg-blue-50 p-4"><span className="text-xs font-black uppercase text-blue-700">Pix/Cartões</span><strong className="mt-2 block text-2xl font-black text-blue-700">Conferir no relatório</strong></div>
            <div className={`rounded-2xl p-4 ${diff === 0 ? 'bg-emerald-50' : 'bg-red-50'}`}><span className={`text-xs font-black uppercase ${diff === 0 ? 'text-emerald-700' : 'text-red-700'}`}>Diferença</span><strong className={`mt-2 block text-2xl font-black ${diff === 0 ? 'text-emerald-700' : 'text-red-700'}`}>{formatCurrency(diff)}</strong></div>
          </div>
        </div>
        <div className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-black text-slate-950">Conferência</h2>
          <label className="mt-5 block rounded-2xl border border-slate-200 p-4"><span className="text-xs font-black uppercase text-slate-500">Valor informado pelo operador</span><input value={valor} onChange={(e) => setValor(Number(e.target.value))} type="number" step="0.01" className="mt-2 w-full border-0 bg-transparent text-3xl font-black outline-none" /></label>
          <label className="mt-4 block"><span className="text-xs font-black uppercase text-slate-500">Observação</span><textarea value={obs} onChange={(e) => setObs(e.target.value)} className="vf-input mt-2 min-h-28" placeholder="Obrigatória se houver divergência." /></label>
          <div className="mt-5 grid gap-2 md:grid-cols-2">
            <button onClick={close} disabled={loading || (diff !== 0 && obs.trim().length < 4)} className="vf-btn vf-btn-primary w-full"><Save size={16} /> {loading ? 'Fechando...' : 'Fechar caixa'}</button>
            <a href="/atendimento/caixa/imprimir/fechamento/atual" className="vf-btn vf-btn-ghost w-full"><Printer size={16} /> Imprimir resumo</a>
          </div>
        </div>
      </section>
    </OperationalShell>
  )
}
