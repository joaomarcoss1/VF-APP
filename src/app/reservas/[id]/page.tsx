'use client'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams, useRouter } from 'next/navigation'
import { ReservationForm, type ReservationFormState } from '@/components/reservas/ReservationForm'
import { Button, Skeleton } from '@/components/ui'
import { ReservasAdiantamentosService } from '@/services/reservas-adiantamentos'
import toast from 'react-hot-toast'

export default function EditarReservaPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const qc = useQueryClient()
  const { data: reserva, isLoading } = useQuery({ queryKey: ['reserva', id], queryFn: () => ReservasAdiantamentosService.buscarReserva(id), enabled: Boolean(id) })
  const atualizar = useMutation({ mutationFn: (payload: ReservationFormState) => ReservasAdiantamentosService.atualizarReserva(id, payload as any), onSuccess: () => { qc.invalidateQueries({ queryKey: ['reserva', id] }); qc.invalidateQueries({ queryKey: ['reservas-adiantamentos'] }); toast.success('Reserva atualizada.'); router.push(`/reservas/${id}/recibo`) }, onError: (e: Error) => toast.error(e.message) })
  if (isLoading) return <div className="p-4 md:p-6"><Skeleton className="h-96" /></div>
  if (!reserva) return <div className="p-4 md:p-6">Reserva não encontrada.</div>
  return <div className="p-4 md:p-6 pb-24 space-y-4"><div className="flex items-center justify-between gap-3"><div><button onClick={() => router.back()} className="text-sm text-[var(--vf-text2)] hover:text-[var(--vf-primary)]">← Voltar</button><h1 className="text-2xl font-bold text-[var(--vf-text)] mt-2">Editar reserva</h1><p className="text-sm text-[var(--vf-text2)]">Edite valores, cliente, serviço, data, Pix e observações antes do recibo.</p></div><Button variant="secondary" onClick={() => router.push(`/reservas/${id}/recibo`)}>Ver recibo</Button></div><ReservationForm initial={reserva} onSubmit={(data) => atualizar.mutate(data)} onCancel={() => router.push('/reservas')} saving={atualizar.isPending} submitLabel="Salvar e revisar recibo" /></div>
}
