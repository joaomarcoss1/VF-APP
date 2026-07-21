'use client'

import { useMemo, useState } from 'react'
import { Alert, Button, Card, Field, Input, Select, Textarea } from '@/components/ui'
import { fmtCurrency } from '@/lib/precificacao'
import { calcularValorRestante, getReservationLabelByBranch, type ReservationDeposit, type ReservationInput } from '@/services/reservas-adiantamentos'

const formas = [
  ['pix','Pix'], ['dinheiro','Dinheiro'], ['cartao_credito','Cartão de crédito'], ['cartao_debito','Cartão de débito'], ['link_pagamento','Link de pagamento'], ['outro','Outro'],
]

function today() { return new Date().toISOString().split('T')[0] }

export type ReservationFormState = ReservationInput & { cliente_telefone?: string; cliente_email?: string; descricao?: string; data_reservada?: string; hora_reservada?: string; forma_pagamento?: string; pix_chave?: string; pix_nome_recebedor?: string; pix_banco?: string; observacao?: string; recibo_custom?: Record<string, any> }

export function createInitialReservation(reserva?: ReservationDeposit | null, ramo?: string | null): ReservationFormState {
  const label = getReservationLabelByBranch(ramo || reserva?.ramo_atividade)
  return {
    cliente_nome: reserva?.cliente_nome || '',
    cliente_telefone: reserva?.cliente_telefone || '',
    cliente_email: reserva?.cliente_email || '',
    titulo: reserva?.titulo || '',
    descricao: reserva?.descricao || '',
    data_reservada: reserva?.data_reservada || today(),
    hora_reservada: reserva?.hora_reservada ? String(reserva.hora_reservada).slice(0,5) : '09:00',
    valor_total: Number(reserva?.valor_total || 0),
    valor_entrada: Number(reserva?.valor_entrada || 0),
    valor_restante: Number(reserva?.valor_restante || 0),
    forma_pagamento: reserva?.forma_pagamento || 'pix',
    pix_chave: reserva?.pix_chave || '',
    pix_nome_recebedor: reserva?.pix_nome_recebedor || '',
    pix_banco: reserva?.pix_banco || '',
    observacao: reserva?.observacao || '',
    tipo: reserva?.tipo || label.tipo,
    recibo_custom: reserva?.recibo_custom || {},
  }
}

export function ReservationForm({ initial, ramo, onSubmit, onCancel, saving, submitLabel = 'Salvar reserva' }: { initial?: ReservationDeposit | null; ramo?: string | null; onSubmit: (data: ReservationFormState) => void; onCancel?: () => void; saving?: boolean; submitLabel?: string }) {
  const [form, setForm] = useState<ReservationFormState>(() => createInitialReservation(initial, ramo))
  const labels = getReservationLabelByBranch(ramo || initial?.ramo_atividade)
  const restante = useMemo(() => {
    try { return calcularValorRestante(Number(form.valor_total || 0), Number(form.valor_entrada || 0)) } catch { return -1 }
  }, [form.valor_total, form.valor_entrada])
  const erro = restante < 0
  const set = (key: keyof ReservationFormState, value: any) => setForm(prev => ({ ...prev, [key]: value }))
  function submit() {
    if (erro) return
    onSubmit({ ...form, valor_restante: restante })
  }
  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-4">
      <Card className="p-4 space-y-5">
        <div><h2 className="text-lg font-semibold text-[var(--vf-text)]">{initial ? 'Editar' : labels.novo}</h2><p className="text-sm text-[var(--vf-text2)]">Todos os dados podem ser revisados antes de gerar PDF, WhatsApp ou impressão.</p></div>
        {erro && <Alert type="error">O valor de entrada não pode ser maior que o valor total.</Alert>}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Cliente" required><Input value={form.cliente_nome} onChange={e => set('cliente_nome', e.target.value)} placeholder="Nome do cliente" /></Field>
          <Field label="Telefone / WhatsApp"><Input value={form.cliente_telefone || ''} onChange={e => set('cliente_telefone', e.target.value)} placeholder="(99) 99999-9999" /></Field>
          <Field label="E-mail"><Input value={form.cliente_email || ''} onChange={e => set('cliente_email', e.target.value)} /></Field>
          <Field label="Forma de pagamento"><Select value={form.forma_pagamento || 'pix'} onChange={e => set('forma_pagamento', e.target.value)}>{formas.map(([v,l]) => <option key={v} value={v}>{l}</option>)}</Select></Field>
          <Field label="Serviço, produto ou reserva" required className="md:col-span-2"><Input value={form.titulo} onChange={e => set('titulo', e.target.value)} placeholder="Ex.: Corte + barba, bolo de aniversário, mesa reservada..." /></Field>
          <Field label="Descrição / detalhes" className="md:col-span-2"><Textarea value={form.descricao || ''} onChange={e => set('descricao', e.target.value)} placeholder="Detalhes do item, horário, observações combinadas com o cliente..." /></Field>
          <Field label="Data reservada"><Input type="date" value={form.data_reservada || ''} onChange={e => set('data_reservada', e.target.value)} /></Field>
          <Field label="Horário"><Input type="time" value={form.hora_reservada || ''} onChange={e => set('hora_reservada', e.target.value)} /></Field>
          <Field label="Valor total"><Input type="number" step="0.01" value={form.valor_total} onChange={e => set('valor_total', Number(e.target.value))} /></Field>
          <Field label="Entrada / sinal"><Input type="number" step="0.01" value={form.valor_entrada} onChange={e => set('valor_entrada', Number(e.target.value))} /></Field>
          {form.forma_pagamento === 'pix' && <><Field label="Chave Pix"><Input value={form.pix_chave || ''} onChange={e => set('pix_chave', e.target.value)} placeholder="CPF, telefone, e-mail ou aleatória" /></Field><Field label="Nome do recebedor"><Input value={form.pix_nome_recebedor || ''} onChange={e => set('pix_nome_recebedor', e.target.value)} /></Field><Field label="Banco"><Input value={form.pix_banco || ''} onChange={e => set('pix_banco', e.target.value)} /></Field></>}
          <Field label="Observação interna ou para recibo" className="md:col-span-2"><Textarea value={form.observacao || ''} onChange={e => set('observacao', e.target.value)} /></Field>
        </div>
        <div className="flex flex-col sm:flex-row justify-end gap-2 pt-2 border-t border-[var(--vf-border)]">{onCancel && <Button variant="ghost" onClick={onCancel}>Cancelar</Button>}<Button onClick={submit} loading={saving} disabled={erro || !form.cliente_nome || !form.titulo}>{submitLabel}</Button></div>
      </Card>
      <Card className="p-4 h-fit sticky top-4"><div className="text-xs uppercase tracking-wider text-[var(--vf-text3)]">Resumo</div><h3 className="text-lg font-semibold text-[var(--vf-text)] mt-1">{form.titulo || labels.menu}</h3><div className="space-y-3 mt-4"><div className="flex justify-between"><span>Total</span><b>{fmtCurrency(Number(form.valor_total || 0))}</b></div><div className="flex justify-between"><span>Entrada</span><b className="text-[var(--vf-success)]">{fmtCurrency(Number(form.valor_entrada || 0))}</b></div><div className="flex justify-between text-lg"><span>Restante</span><b className="text-[var(--vf-secondary)]">{fmtCurrency(Math.max(0, restante))}</b></div></div><Alert type="info"><span className="font-medium">{labels.mensagem}</span><br />O recibo pode ser editado antes do PDF ou envio.</Alert></Card>
    </div>
  )
}
