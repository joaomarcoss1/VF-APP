'use client'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams, useRouter } from 'next/navigation'
import { Button, Card, Skeleton } from '@/components/ui'
import { ReservationReceipt } from '@/components/reservas/ReservationReceipt'
import { ReservasAdiantamentosService } from '@/services/reservas-adiantamentos'
import { db, getEmpresaId } from '@/services/_base'
import toast from 'react-hot-toast'

async function empresaNome() {
  const empresaId = await getEmpresaId()
  const { data } = await db().from('empresas').select('nome,nome_fantasia,razao_social').eq('id', empresaId).maybeSingle()
  return (data as any)?.nome_fantasia || (data as any)?.nome || (data as any)?.razao_social || 'Empresa'
}

export default function ReciboReservaPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const qc = useQueryClient()
  const { data: reserva, isLoading } = useQuery({ queryKey: ['reserva', id], queryFn: () => ReservasAdiantamentosService.buscarReserva(id), enabled: Boolean(id) })
  const { data: nomeEmpresa } = useQuery({ queryKey: ['empresa-nome-reserva'], queryFn: empresaNome })
  const save = useMutation({ mutationFn: (custom: Record<string, any>) => ReservasAdiantamentosService.salvarReciboCustom(id, custom), onSuccess: () => { qc.invalidateQueries({ queryKey: ['reserva', id] }); toast.success('Pré-recibo salvo.') }, onError: (e: Error) => toast.error(e.message) })
  const confirmar = useMutation({ mutationFn: () => ReservasAdiantamentosService.confirmarPagamento(id, reserva?.forma_pagamento || undefined), onSuccess: () => { qc.invalidateQueries({ queryKey: ['reserva', id] }); toast.success('Pagamento confirmado e reserva agendada.') }, onError: (e: Error) => toast.error(e.message) })
  if (isLoading) return <div className="p-4 md:p-6"><Skeleton className="h-96" /></div>
  if (!reserva) return <div className="p-4 md:p-6">Reserva não encontrada.</div>
  return <div className="p-4 md:p-6 pb-24 space-y-4"><div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"><div><button onClick={() => router.back()} className="text-sm text-[var(--vf-text2)] hover:text-[var(--vf-primary)]">← Voltar</button><h1 className="text-2xl font-bold text-[var(--vf-text)] mt-2">Recibo editável</h1><p className="text-sm text-[var(--vf-text2)]">Revise tudo antes de gerar PDF, copiar, imprimir ou enviar ao cliente.</p></div><div className="flex gap-2"><Button variant="ghost" onClick={() => router.push(`/reservas/${id}`)}>Editar dados</Button>{reserva.status_pagamento !== 'pago' && <Button onClick={() => confirmar.mutate()} loading={confirmar.isPending}>Confirmar pagamento</Button>}</div></div><ReservationReceipt reserva={reserva} empresaNome={nomeEmpresa} onSaveCustom={(custom) => save.mutate(custom)} saving={save.isPending} /><Card className="p-4 print:hidden"><Button fullWidth variant="ghost" onClick={() => window.print()}>Imprimir página</Button></Card></div>
}
