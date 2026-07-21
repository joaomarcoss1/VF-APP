'use client'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChefHat, Plus, ReceiptText, Search, Settings, ShoppingBag, UsersRound, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { BigActionButton } from '@/components/restaurante/BigActionButton'
import { OperationalShell } from '@/components/restaurante/OperationalShell'
import { NotificationStack } from '@/components/restaurante/NotificationStack'
import { TableCard } from '@/components/restaurante/TableCard'
import { StatusBadge } from '@/components/restaurante/StatusBadge'
import { formatCurrency } from '@/lib/restaurante-calculos'
import { RestauranteService, type RestaurantTable, type RestaurantTab, type TableStatus } from '@/services/restaurante'
import { useRestaurantNotifications } from '@/hooks/useRestaurantNotifications'

const filters: Array<{ id: TableStatus | 'todas'; label: string }> = [
  { id: 'todas', label: 'Todas' },
  { id: 'livre', label: 'Livres' },
  { id: 'ocupada', label: 'Ocupadas' },
  { id: 'aguardando_fechamento', label: 'Aguardando' },
  { id: 'bloqueada', label: 'Bloqueadas' },
]

type ModalMode = 'mesa' | 'balcao'

export default function AtendimentoPage() {
  const router = useRouter()
  const [tables, setTables] = useState<RestaurantTable[]>([])
  const [tabs, setTabs] = useState<RestaurantTab[]>([])
  const [filter, setFilter] = useState<TableStatus | 'todas'>('todas')
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [mode, setMode] = useState<ModalMode>('mesa')
  const [selectedMesaId, setSelectedMesaId] = useState('')
  const [cliente, setCliente] = useState('')
  const [pessoas, setPessoas] = useState(2)
  const { notifications, markAsRead } = useRestaurantNotifications('atendimento')

  async function load() {
    setLoading(true)
    const [mesas, comandas] = await Promise.all([RestauranteService.listarMesas(), RestauranteService.listarComandas('todas')])
    setTables(mesas)
    setTabs(comandas)
    setLoading(false)
  }

  useEffect(() => { load(); const timer = window.setInterval(load, 7000); return () => window.clearInterval(timer) }, [])

  const filteredTables = useMemo(() => filter === 'todas' ? tables : tables.filter((table) => table.status === filter), [filter, tables])
  const freeTables = useMemo(() => tables.filter((table) => table.status === 'livre'), [tables])
  const counters = useMemo(() => ({
    abertas: tabs.filter((tab) => ['aberta', 'itens_enviados'].includes(tab.status)).length,
    aguardando: tabs.filter((tab) => tab.status === 'aguardando_fechamento').length,
    total: tabs.reduce((sum, tab) => sum + Number(tab.total || 0), 0),
    prontas: notifications.filter((n) => n.title.toLowerCase().includes('pronto')).length,
  }), [notifications, tabs])

  async function abrirMesa(table?: RestaurantTable) {
    try {
      if (table && ['ocupada', 'aguardando_fechamento', 'em_pagamento'].includes(table.status)) {
        const existing = await RestauranteService.buscarComandaAbertaDaMesa(table.id)
        if (existing) return router.push(`/atendimento/comanda/${existing.id}`)
      }
      setMode('mesa')
      setSelectedMesaId(table?.status === 'livre' ? table.id : freeTables[0]?.id ?? '')
      setModalOpen(true)
    } catch (error: any) {
      toast.error(error.message ?? 'Erro ao abrir mesa.')
    }
  }

  async function abrirComanda() {
    try {
      const mesaId = mode === 'mesa' ? selectedMesaId : null
      if (mode === 'mesa' && !mesaId) return toast.error('Escolha uma mesa livre para abrir a comanda.')
      const comanda = await RestauranteService.abrirComanda({ mesa_id: mesaId, cliente_nome: cliente, pessoas: mode === 'mesa' ? pessoas : 1, tipo: mode === 'mesa' ? 'mesa' : 'balcao' })
      toast.success(mode === 'mesa' ? 'Comanda de mesa aberta.' : 'Venda balcão iniciada.')
      router.push(`/atendimento/comanda/${comanda.id}`)
    } catch (error: any) {
      toast.error(error.message ?? 'Erro ao abrir comanda.')
    }
  }

  return (
    <OperationalShell sector="atendimento" title="VF Nexus Atendimento" subtitle="Mesas, comandas, pedidos e fechamento rápido" actions={<a href="/atendimento/funcionarios" className="vf-btn vf-btn-ghost hidden md:inline-flex"><Settings size={15} /> Configurar</a>}>
      <NotificationStack notifications={notifications} onDismiss={markAsRead} />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <BigActionButton icon={Plus} title="Nova Comanda" description="Escolha mesa ou venda balcão" tone="blue" onClick={() => { setMode('mesa'); setSelectedMesaId(freeTables[0]?.id ?? ''); setModalOpen(true) }} />
        <BigActionButton icon={UsersRound} title="Mesas" description="Mapa visual de ocupação do salão" tone="gold" onClick={() => document.getElementById('mesas')?.scrollIntoView({ behavior: 'smooth' })} />
        <BigActionButton icon={ReceiptText} title="Comandas Abertas" description={`${counters.abertas} em atendimento e ${counters.aguardando} aguardando caixa`} tone="green" onClick={() => document.getElementById('comandas')?.scrollIntoView({ behavior: 'smooth' })} />
        <BigActionButton icon={ChefHat} title="Pedidos Prontos" description="Alertas da cozinha para retirada" tone="red" onClick={() => document.getElementById('comandas')?.scrollIntoView({ behavior: 'smooth' })} />
      </div>

      <section className="mt-6 grid gap-4 md:grid-cols-4">
        <div className="vf-card p-5"><span className="text-xs font-black uppercase text-slate-500">Comandas abertas</span><strong className="mt-2 block text-3xl font-black text-slate-950">{counters.abertas}</strong></div>
        <div className="vf-card p-5"><span className="text-xs font-black uppercase text-slate-500">Aguardando caixa</span><strong className="mt-2 block text-3xl font-black text-amber-600">{counters.aguardando}</strong></div>
        <div className="vf-card p-5"><span className="text-xs font-black uppercase text-slate-500">Pedidos prontos</span><strong className="mt-2 block text-3xl font-black text-emerald-600">{counters.prontas}</strong></div>
        <div className="vf-card p-5"><span className="text-xs font-black uppercase text-slate-500">Total em aberto</span><strong className="mt-2 block text-3xl font-black text-blue-600">{formatCurrency(counters.total)}</strong></div>
      </section>

      <section id="mesas" className="mt-6 rounded-[30px] border border-slate-200 bg-white p-4 shadow-sm md:p-5">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div><h2 className="text-xl font-black text-slate-950">Mesas do salão</h2><p className="text-sm font-semibold text-slate-500">Toque em uma mesa livre para abrir ou ocupada para continuar a comanda.</p></div>
          <div className="flex flex-wrap gap-2">{filters.map((item) => <button key={item.id} onClick={() => setFilter(item.id)} className={`rounded-full px-4 py-2 text-xs font-black transition ${filter === item.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-slate-100 text-slate-600 hover:bg-blue-50 hover:text-blue-700'}`}>{item.label}</button>)}</div>
        </div>
        {loading ? <div className="mt-5 grid gap-3 md:grid-cols-3 xl:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-[150px] vf-skeleton" />)}</div> : <div className="mt-5 grid gap-3 md:grid-cols-3 xl:grid-cols-4">{filteredTables.map((table) => <TableCard key={table.id} table={table} onClick={() => abrirMesa(table)} />)}</div>}
      </section>

      <section id="comandas" className="mt-6 rounded-[30px] border border-slate-200 bg-white p-4 shadow-sm md:p-5">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center"><div><h2 className="text-xl font-black text-slate-950">Comandas em andamento</h2><p className="text-sm font-semibold text-slate-500">Visualização rápida de mesa, cliente, itens, status e valor.</p></div><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} /><input placeholder="Buscar comanda" className="vf-input pl-10" /></div></div>
        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          {tabs.map((tab) => <button key={tab.id} onClick={() => router.push(`/atendimento/comanda/${tab.id}`)} className="flex items-center justify-between gap-4 rounded-[24px] border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-blue-200 hover:bg-blue-50"><div className="min-w-0"><strong className="block text-slate-950">{tab.tipo === 'mesa' ? tab.mesa?.nome ?? `Mesa ${tab.mesa?.numero ?? ''}` : 'Venda balcão'} · #{tab.codigo}</strong><span className="mt-1 flex items-center gap-2 text-xs font-bold text-slate-500">{tab.cliente_nome ?? 'Cliente não informado'} · {tab.itens?.length ?? 0} itens</span></div><div className="text-right"><StatusBadge status={tab.status} /><strong className="mt-2 block text-blue-600">{formatCurrency(tab.total)}</strong></div></button>)}
          {tabs.length === 0 && <div className="vf-empty lg:col-span-2"><ShoppingBag size={22} /><strong className="mt-2 block">Nenhuma comanda aberta.</strong><p className="text-sm text-slate-500">Abra uma nova comanda para iniciar o atendimento.</p></div>}
        </div>
      </section>

      {modalOpen && <div className="fixed inset-0 z-50 grid place-items-end bg-slate-950/60 p-0 backdrop-blur-sm md:place-items-center md:p-4">
        <div className="w-full max-w-2xl rounded-t-[32px] bg-white p-5 shadow-2xl md:rounded-[32px]">
          <div className="flex items-start justify-between gap-3"><div><h2 className="text-2xl font-black text-slate-950">Nova comanda</h2><p className="text-sm font-semibold text-slate-500">Escolha mesa enumerada ou venda balcão.</p></div><button onClick={() => setModalOpen(false)} className="grid h-10 w-10 place-items-center rounded-2xl bg-slate-100 text-slate-600"><X size={18} /></button></div>
          <div className="mt-5 grid grid-cols-2 gap-3"><button onClick={() => setMode('mesa')} className={`rounded-2xl border p-4 text-left font-black ${mode === 'mesa' ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-slate-200 bg-slate-50'}`}>Atendimento em mesa</button><button onClick={() => setMode('balcao')} className={`rounded-2xl border p-4 text-left font-black ${mode === 'balcao' ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-slate-200 bg-slate-50'}`}>Venda balcão</button></div>
          {mode === 'mesa' && <label className="mt-4 block"><span className="text-xs font-black uppercase text-slate-500">Mesa livre</span><select value={selectedMesaId} onChange={(e) => setSelectedMesaId(e.target.value)} className="vf-input mt-2"><option value="">Escolha uma mesa</option>{freeTables.map((m) => <option key={m.id} value={m.id}>{m.nome ?? `Mesa ${m.numero}`} · {m.capacidade ?? 4} lugares</option>)}</select></label>}
          <div className="mt-4 grid gap-3 md:grid-cols-[1fr,160px]"><label><span className="text-xs font-black uppercase text-slate-500">Cliente opcional</span><input value={cliente} onChange={(e) => setCliente(e.target.value)} className="vf-input mt-2" placeholder="Nome do cliente" /></label><label><span className="text-xs font-black uppercase text-slate-500">Pessoas</span><input value={pessoas} onChange={(e) => setPessoas(Number(e.target.value))} className="vf-input mt-2" type="number" min={1} /></label></div>
          <button onClick={abrirComanda} className="vf-btn vf-btn-primary mt-5 w-full">{mode === 'mesa' ? 'Abrir comanda da mesa' : 'Iniciar venda balcão'}</button>
        </div>
      </div>}
    </OperationalShell>
  )
}
