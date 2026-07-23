'use client'

import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { Alert, Button, ButtonLink, Card, Skeleton } from '@/components/ui'
import { ReservationCard } from '@/components/reservas/ReservationCard'
import { ReservationReminderToast } from '@/components/reservas/ReservationReminderToast'
import { ReservasAdiantamentosService, getReservationLabelByBranch, type ReservationDeposit } from '@/services/reservas-adiantamentos'
import { fmtCurrency } from '@/lib/precificacao'
import toast from 'react-hot-toast'

const filtros = [
  ['todas','Todas'], ['hoje','Hoje'], ['proximas','Próximas'], ['aguardando','Aguardando pagamento'], ['confirmadas','Confirmadas'], ['concluidas','Concluídas'], ['canceladas','Canceladas'],
]

export default function ReservasPage() {
  const router = useRouter()
  const qc = useQueryClient()
  const [filtro, setFiltro] = useState('todas')
  const { data: ramo } = useQuery({ queryKey: ['reservas-ramo'], queryFn: () => ReservasAdiantamentosService.obterRamoAtual() })
  const labels = getReservationLabelByBranch(ramo)
  const { data: reservas, isLoading } = useQuery({ queryKey: ['reservas-adiantamentos'], queryFn: () => ReservasAdiantamentosService.listarReservas() })
  const { data: notifications } = useQuery({ queryKey: ['reservas-notificacoes'], queryFn: () => ReservasAdiantamentosService.listarNotificacoesReserva(), refetchInterval: 60_000 })
  const confirmar = useMutation({ mutationFn: (r: ReservationDeposit) => ReservasAdiantamentosService.confirmarPagamento(r.id, r.forma_pagamento || undefined), onSuccess: () => { qc.invalidateQueries({ queryKey: ['reservas-adiantamentos'] }); qc.invalidateQueries({ queryKey: ['reservas-notificacoes'] }); toast.success('Pagamento confirmado e reserva agendada.') }, onError: (e: Error) => toast.error(e.message) })
  const lista = useMemo(() => {
    const today = new Date().toISOString().split('T')[0]
    return (reservas || []).filter(r => {
      if (filtro === 'hoje') return r.data_reservada === today
      if (filtro === 'proximas') return (r.data_reservada || '') >= today && !['cancelada','concluida','nao_compareceu'].includes(String(r.status_reserva))
      if (filtro === 'aguardando') return r.status_pagamento === 'aguardando_pagamento'
      if (filtro === 'confirmadas') return ['pago'].includes(String(r.status_pagamento)) && ['confirmada','agendada'].includes(String(r.status_reserva))
      if (filtro === 'concluidas') return r.status_reserva === 'concluida'
      if (filtro === 'canceladas') return r.status_reserva === 'cancelada'
      return true
    })
  }, [reservas, filtro])
  const totalEntrada = (reservas || []).reduce((acc, r) => acc + Number(r.valor_entrada || 0), 0)
  const totalRestante = (reservas || []).reduce((acc, r) => acc + Number(r.valor_restante || 0), 0)
  return <div className="vf-fadein p-4 md:p-6 pb-24 space-y-5">
    <ReservationReminderToast notifications={notifications} />
    <div className="rounded-[28px] p-5 md:p-6 text-white bg-[radial-gradient(circle_at_top_left,rgba(242,183,46,.35),transparent_28%),linear-gradient(135deg,#07111f,#0f2742_50%,#07111f)] shadow-2xl overflow-hidden relative">
      <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-[rgba(242,183,46,.16)] blur-2xl" />
      <div className="relative flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div><div className="text-xs uppercase tracking-[0.25em] text-amber-200">VF Nexus</div><h1 className="text-2xl md:text-3xl font-bold mt-2">{labels.menu}</h1><p className="text-sm text-[var(--vf-text3)] mt-1 max-w-2xl">Reserve horários, produtos, serviços ou encomendas com entrada, recibo editável e notificação no horário.</p></div>
        <ButtonLink href="/reservas/nova" variant="secondary">＋ {labels.novo}</ButtonLink>
      </div>
    </div>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <Card className="p-4"><span className="text-xs text-[var(--vf-text3)]">Reservas</span><b className="block text-2xl text-[var(--vf-text)]">{reservas?.length || 0}</b></Card>
      <Card className="p-4"><span className="text-xs text-[var(--vf-text3)]">Aguardando</span><b className="block text-2xl text-[var(--vf-warning)]">{(reservas || []).filter(r => r.status_pagamento === 'aguardando_pagamento').length}</b></Card>
      <Card className="p-4"><span className="text-xs text-[var(--vf-text3)]">Entradas</span><b className="block text-xl text-[var(--vf-success)]">{fmtCurrency(totalEntrada)}</b></Card>
      <Card className="p-4"><span className="text-xs text-[var(--vf-text3)]">Restante</span><b className="block text-xl text-[var(--vf-secondary)]">{fmtCurrency(totalRestante)}</b></Card>
    </div>
    <Alert type="info">Antes de mandar ao cliente ou imprimir, abra o recibo para revisar e editar valores, observações, nomes, serviços e mensagens.</Alert>
    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">{filtros.map(([v,l]) => <button key={v} onClick={() => setFiltro(v)} className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap border transition ${filtro === v ? 'bg-[var(--vf-primary)] text-white border-[var(--vf-primary)]' : 'bg-[var(--vf-surface)] text-[var(--vf-text2)] border-[var(--vf-border)]'}`}>{l}</button>)}</div>
    {isLoading ? <Skeleton className="h-60" /> : <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">{lista.map(r => <ReservationCard key={r.id} reserva={r} onConfirmar={() => confirmar.mutate(r)} onEditar={() => router.push(`/reservas/${r.id}`)} onRecibo={() => router.push(`/reservas/${r.id}/recibo`)} loading={confirmar.isPending} />)}</div>}
  </div>
}
