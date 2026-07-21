'use client'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { ReservationForm, type ReservationFormState } from '@/components/reservas/ReservationForm'
import { ReservasAdiantamentosService, getReservationLabelByBranch } from '@/services/reservas-adiantamentos'
import toast from 'react-hot-toast'

export default function NovaReservaPage() {
  const router = useRouter()
  const { data: ramo } = useQuery({ queryKey: ['reservas-ramo'], queryFn: () => ReservasAdiantamentosService.obterRamoAtual() })
  const labels = getReservationLabelByBranch(ramo)
  const criar = useMutation({ mutationFn: (payload: ReservationFormState) => ReservasAdiantamentosService.criarReserva(payload as any), onSuccess: (data) => { toast.success('Reserva criada. Revise o recibo antes de enviar.'); router.push(`/reservas/${data.id}/recibo`) }, onError: (e: Error) => toast.error(e.message) })
  return <div className="p-4 md:p-6 pb-24 space-y-4"><div><button onClick={() => router.back()} className="text-sm text-[var(--vf-text2)] hover:text-[var(--vf-primary)]">← Voltar</button><h1 className="text-2xl font-bold text-[var(--vf-text)] mt-2">{labels.novo}</h1><p className="text-sm text-[var(--vf-text2)]">Crie a entrada e gere um recibo editável para o cliente.</p></div><ReservationForm ramo={ramo} onSubmit={(data) => criar.mutate(data)} onCancel={() => router.push('/reservas')} saving={criar.isPending} submitLabel="Salvar e revisar recibo" /></div>
}
