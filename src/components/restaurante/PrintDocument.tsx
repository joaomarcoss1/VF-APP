'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { formatCurrency } from '@/lib/restaurante-calculos'
import { RestauranteService, type RestaurantTab } from '@/services/restaurante'

export function PrintDocument({ type }: { type: 'comanda' | 'pre-conta' | 'comprovante' | 'fechamento' }) {
  const params = useParams<{ id: string }>()
  const [tab, setTab] = useState<RestaurantTab | null>(null)

  useEffect(() => {
    const id = String(params?.id ?? '')
    if (type !== 'fechamento' && id) RestauranteService.buscarComanda(id).then(setTab).catch(() => null)
  }, [params, type])

  const title = type === 'comanda' ? 'Comanda de Produção' : type === 'pre-conta' ? 'Pré-conta' : type === 'comprovante' ? 'Comprovante' : 'Fechamento do Caixa'

  return (
    <main className="min-h-dvh bg-slate-100 p-4 text-slate-950 print:bg-white print:p-0">
      <style>{`
        @media print { .no-print { display: none !important; } .thermal { box-shadow: none !important; border: 0 !important; width: 80mm !important; margin: 0 !important; } body { background: white !important; } }
      `}</style>
      <div className="no-print mx-auto mb-4 flex max-w-sm justify-between gap-3"><button onClick={() => window.print()} className="vf-btn vf-btn-primary flex-1">Imprimir</button><button onClick={() => history.back()} className="vf-btn vf-btn-ghost flex-1">Voltar</button></div>
      <section className="thermal mx-auto w-[80mm] rounded-2xl border border-slate-200 bg-white p-5 font-mono text-[12px] shadow-xl">
        <div className="text-center">
          <strong className="block text-base">VF NEXUS</strong>
          <span>{title}</span>
          <div className="my-2 border-t border-dashed border-slate-400" />
        </div>
        {type === 'fechamento' ? (
          <div className="space-y-1">
            <p>Caixa: Atual</p>
            <p>Abertura: {new Date().toLocaleString('pt-BR')}</p>
            <p>Fechamento: {new Date().toLocaleString('pt-BR')}</p>
            <div className="my-2 border-t border-dashed border-slate-400" />
            <p>Dinheiro esperado: R$ 0,00</p>
            <p>Valor informado: R$ 0,00</p>
            <p>Diferença: R$ 0,00</p>
          </div>
        ) : (
          <div>
            <p>Mesa: {tab?.mesa?.numero ?? 'Balcão'}</p>
            <p>Comanda: #{tab?.codigo ?? '000000'}</p>
            <p>Data: {new Date().toLocaleString('pt-BR')}</p>
            <div className="my-2 border-t border-dashed border-slate-400" />
            {(tab?.itens ?? []).map((item) => <div key={item.id} className="mb-1"><div className="flex justify-between gap-2"><span>{item.quantidade}x {item.nome_produto}</span><span>{formatCurrency(item.total)}</span></div>{item.observacao && <p>Obs: {item.observacao}</p>}</div>)}
            {(tab?.itens?.length ?? 0) === 0 && <p>Nenhum item localizado.</p>}
            <div className="my-2 border-t border-dashed border-slate-400" />
            {type !== 'comanda' && <><div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(tab?.subtotal ?? 0)}</span></div><div className="flex justify-between"><span>Taxa</span><span>{formatCurrency(tab?.taxa_servico ?? 0)}</span></div><div className="flex justify-between font-bold"><span>Total</span><span>{formatCurrency(tab?.total ?? 0)}</span></div></>}
            {type === 'comanda' && <p className="text-center font-bold">*** ENVIAR PARA PRODUÇÃO ***</p>}
          </div>
        )}
        <div className="my-2 border-t border-dashed border-slate-400" />
        <p className="text-center">Obrigado e volte sempre!</p>
      </section>
    </main>
  )
}
