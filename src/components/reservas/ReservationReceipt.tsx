'use client'

import { useEffect, useState } from 'react'
import { Alert, Button, Card, Field, Input, Textarea } from '@/components/ui'
import { fmtCurrency } from '@/lib/precificacao'
import { baixarReciboReservaPDF, copiarTextoRecibo } from '@/lib/reservas-pdf'
import { getReservationLabelByBranch, type ReservationDeposit } from '@/services/reservas-adiantamentos'
import toast from 'react-hot-toast'

export function ReservationReceipt({ reserva, empresaNome = 'Empresa', onSaveCustom, saving }: { reserva: ReservationDeposit; empresaNome?: string; onSaveCustom?: (custom: Record<string, any>) => void; saving?: boolean }) {
  const labels = getReservationLabelByBranch(reserva.ramo_atividade)
  const [custom, setCustom] = useState<Record<string, any>>(reserva.recibo_custom || {})
  useEffect(() => setCustom(reserva.recibo_custom || {}), [reserva.id, reserva.recibo_custom])
  const preview: ReservationDeposit = { ...reserva, recibo_custom: custom }
  async function copy() {
    await navigator.clipboard.writeText(copiarTextoRecibo(preview, empresaNome))
    toast.success('Recibo copiado.')
  }
  function whats() {
    const text = encodeURIComponent(copiarTextoRecibo(preview, empresaNome))
    window.open(`https://wa.me/?text=${text}`, '_blank')
  }
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[0.95fr_1.05fr] gap-4">
      <Card className="p-4 space-y-4">
        <Alert type="info">Revise e edite todos os textos do recibo antes de imprimir, copiar, mandar ao cliente ou gerar PDF.</Alert>
        <Field label="Título do recibo"><Input value={custom.titulo || labels.recibo} onChange={e => setCustom(p => ({ ...p, titulo: e.target.value }))} /></Field>
        <Field label="Mensagem principal"><Textarea value={custom.mensagem || labels.mensagem} onChange={e => setCustom(p => ({ ...p, mensagem: e.target.value }))} /></Field>
        <Field label="Observação para o cliente"><Textarea value={custom.observacao_cliente || ''} onChange={e => setCustom(p => ({ ...p, observacao_cliente: e.target.value }))} placeholder="Ex.: O valor restante será pago no dia do atendimento." /></Field>
        <Field label="Termos ou garantia"><Textarea value={custom.termos || ''} onChange={e => setCustom(p => ({ ...p, termos: e.target.value }))} placeholder="Ex.: Reserva válida mediante confirmação do pagamento." /></Field>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" loading={saving} onClick={() => onSaveCustom?.(custom)}>Salvar pré-recibo</Button>
          <Button variant="ghost" onClick={copy}>Copiar texto</Button>
          <Button variant="ghost" onClick={whats}>WhatsApp</Button>
          <Button onClick={() => baixarReciboReservaPDF(preview, empresaNome)}>Gerar PDF</Button>
        </div>
      </Card>
      <Card className="p-5 bg-[var(--vf-surface)] print:shadow-none print:border-none">
        <div className="text-center border-b border-[var(--vf-border)] pb-4 mb-4">
          <div className="text-xs uppercase tracking-[0.25em] text-[var(--vf-text3)]">VF Nexus</div>
          <h2 className="text-xl font-bold text-[var(--vf-text)] mt-1">{custom.titulo || labels.recibo}</h2>
          <p className="text-sm text-[var(--vf-text2)] mt-1">{empresaNome}</p>
        </div>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between gap-3"><span className="text-[var(--vf-text3)]">Código</span><b>{reserva.codigo || '—'}</b></div>
          <div className="flex justify-between gap-3"><span className="text-[var(--vf-text3)]">Cliente</span><b>{reserva.cliente_nome}</b></div>
          <div className="flex justify-between gap-3"><span className="text-[var(--vf-text3)]">Telefone</span><b>{reserva.cliente_telefone || '—'}</b></div>
          <div className="rounded-2xl bg-[var(--vf-surface2)] p-4"><span className="text-[var(--vf-text3)] text-xs uppercase">Reserva / serviço</span><h3 className="font-semibold text-[var(--vf-text)] mt-1">{reserva.titulo}</h3>{reserva.descricao && <p className="text-[var(--vf-text2)] mt-1">{reserva.descricao}</p>}</div>
          <div className="grid grid-cols-2 gap-3"><div className="rounded-2xl bg-[var(--vf-surface2)] p-3"><span className="text-xs text-[var(--vf-text3)]">Data</span><b className="block">{reserva.data_reservada || '—'}</b></div><div className="rounded-2xl bg-[var(--vf-surface2)] p-3"><span className="text-xs text-[var(--vf-text3)]">Horário</span><b className="block">{reserva.hora_reservada ? String(reserva.hora_reservada).slice(0,5) : '—'}</b></div></div>
          <div className="grid grid-cols-3 gap-2"><div><span className="text-xs text-[var(--vf-text3)]">Total</span><b className="block">{fmtCurrency(Number(reserva.valor_total || 0))}</b></div><div><span className="text-xs text-[var(--vf-text3)]">Entrada</span><b className="block text-[var(--vf-success)]">{fmtCurrency(Number(reserva.valor_entrada || 0))}</b></div><div><span className="text-xs text-[var(--vf-text3)]">Restante</span><b className="block text-[var(--vf-secondary)]">{fmtCurrency(Number(reserva.valor_restante || 0))}</b></div></div>
          <div className="rounded-2xl border border-[var(--vf-border)] p-4"><p className="font-semibold">{custom.mensagem || labels.mensagem}</p>{custom.observacao_cliente && <p className="mt-2 text-[var(--vf-text2)]">{custom.observacao_cliente}</p>}{custom.termos && <p className="mt-2 text-xs text-[var(--vf-text3)]">{custom.termos}</p>}</div>
          {reserva.pix_chave && <div className="rounded-2xl bg-[color-mix(in_srgb,var(--vf-primary)_8%,var(--vf-surface2))] p-3"><span className="text-xs text-[var(--vf-text3)]">Pix</span><b className="block">{reserva.pix_chave}</b>{reserva.pix_nome_recebedor && <span className="text-xs text-[var(--vf-text2)]">{reserva.pix_nome_recebedor}</span>}</div>}
        </div>
      </Card>
    </div>
  )
}
