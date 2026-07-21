import { db, getCurrentUserId, getEmpresaId, getPerfilAtual, normalizeEmptyValues, normalizeError } from './_base'
import { getRamoDefinition, type RamoAtividade } from '@/config/ramos'

export type ReservationPaymentStatus = 'aguardando_pagamento' | 'pago' | 'cancelado' | 'reembolsado'
export type ReservationStatus = 'rascunho' | 'aguardando_pagamento' | 'confirmada' | 'agendada' | 'concluida' | 'cancelada' | 'nao_compareceu'
export type ReservationPaymentMethod = 'pix' | 'dinheiro' | 'cartao_credito' | 'cartao_debito' | 'link_pagamento' | 'outro'

export type ReservationDeposit = {
  id: string
  empresa_id: string
  ramo_atividade?: string | null
  tipo?: string | null
  codigo?: string | null
  cliente_id?: string | null
  cliente_nome: string
  cliente_telefone?: string | null
  cliente_email?: string | null
  titulo: string
  descricao?: string | null
  produto_id?: string | null
  servico_id?: string | null
  mesa_id?: string | null
  responsavel_id?: string | null
  data_reservada?: string | null
  hora_reservada?: string | null
  valor_total: number
  valor_entrada: number
  valor_restante: number
  forma_pagamento?: ReservationPaymentMethod | string | null
  pix_chave?: string | null
  pix_nome_recebedor?: string | null
  pix_banco?: string | null
  status_pagamento: ReservationPaymentStatus | string
  status_reserva: ReservationStatus | string
  confirmado_por?: string | null
  confirmado_em?: string | null
  cancelado_por?: string | null
  cancelado_em?: string | null
  motivo_cancelamento?: string | null
  recibo_emitido_em?: string | null
  observacao?: string | null
  recibo_custom?: Record<string, any> | null
  metadata?: Record<string, any> | null
  created_at?: string
  updated_at?: string
}

export type ReservationInput = Partial<ReservationDeposit> & {
  cliente_nome: string
  titulo: string
  valor_total: number
  valor_entrada: number
}

export type ReservationNotification = {
  id: string
  empresa_id: string
  reservation_id: string
  tipo: string
  titulo: string
  mensagem: string
  target_user_id?: string | null
  target_setor?: string | null
  notificar_em?: string | null
  lida_em?: string | null
  created_at?: string
}

const LABELS: Record<string, { menu: string; novo: string; recibo: string; mensagem: string; tipo: string; prefix: string }> = {
  bar_restaurante: { menu: 'Reserva com sinal', novo: 'Nova reserva com sinal', recibo: 'Comprovante de reserva com sinal', mensagem: 'Sua reserva foi registrada mediante sinal.', tipo: 'reserva', prefix: 'RES' },
  barbearia: { menu: 'Agendamento com sinal', novo: 'Novo agendamento com sinal', recibo: 'Comprovante de agendamento com sinal', mensagem: 'Seu horário foi reservado mediante sinal.', tipo: 'agendamento', prefix: 'AGE' },
  confeitaria: { menu: 'Encomenda com entrada', novo: 'Nova encomenda com entrada', recibo: 'Comprovante de encomenda com entrada', mensagem: 'Sua encomenda foi registrada mediante entrada.', tipo: 'encomenda', prefix: 'ENT' },
  roupas: { menu: 'Reserva de produto', novo: 'Nova reserva de produto', recibo: 'Comprovante de reserva de produto', mensagem: 'Seu produto foi reservado mediante entrada.', tipo: 'produto', prefix: 'RES' },
  eletronicos: { menu: 'Reserva ou entrada de serviço', novo: 'Nova reserva/entrada de serviço', recibo: 'Comprovante de reserva ou entrada', mensagem: 'Sua reserva/serviço foi registrado mediante entrada.', tipo: 'servico', prefix: 'ENT' },
  prestador_servicos: { menu: 'Serviço com entrada', novo: 'Novo serviço com entrada', recibo: 'Comprovante de serviço com entrada', mensagem: 'Seu serviço foi reservado mediante entrada.', tipo: 'servico', prefix: 'ENT' },
  autonomo: { menu: 'Entrada de atendimento', novo: 'Nova entrada de atendimento', recibo: 'Comprovante de entrada', mensagem: 'Sua entrada foi registrada com sucesso.', tipo: 'entrada', prefix: 'ENT' },
}

function dinheiro(n?: number | null) {
  return Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function getReservationLabelByBranch(ramo?: string | null) {
  const id = getRamoDefinition(ramo).id
  return LABELS[id] ?? LABELS.autonomo
}

export function calcularValorRestante(valorTotal: number, valorEntrada: number) {
  const total = Math.max(0, Number(valorTotal || 0))
  const entrada = Math.max(0, Number(valorEntrada || 0))
  if (entrada > total) throw new Error('O valor de entrada não pode ser maior que o valor total.')
  return Math.max(0, Math.round((total - entrada) * 100) / 100)
}

async function getRamoAtual() {
  const empresaId = await getEmpresaId()
  const { data } = await db().from('empresas').select('ramo_atividade,tipo').eq('id', empresaId).maybeSingle()
  return getRamoDefinition((data as any)?.ramo_atividade || (data as any)?.tipo || null).id
}

async function assertReservaAccess(action: 'criar'|'editar'|'confirmar'|'cancelar'|'ver') {
  const perfil = await getPerfilAtual().catch(() => null)
  const cargo = String(perfil?.cargo || '').toLowerCase()
  const isMaster = Boolean(perfil?.is_master) || cargo === 'master_admin' || cargo === 'super_admin'
  const canWrite = isMaster || ['admin','administrador','admin_empresa','gerente','caixa','atendimento','funcionario','vendedor'].includes(cargo)
  if (action === 'ver') return
  if (!canWrite) throw new Error('Usuário sem permissão para alterar reservas/adiantamentos.')
}

function normalizePayload(payload: Partial<ReservationInput>, ramo: string) {
  const valor_total = Math.max(0, Number(payload.valor_total || 0))
  const valor_entrada = Math.max(0, Number(payload.valor_entrada || 0))
  const valor_restante = calcularValorRestante(valor_total, valor_entrada)
  const labels = getReservationLabelByBranch(ramo)
  return normalizeEmptyValues({
    ...payload,
    ramo_atividade: ramo,
    tipo: payload.tipo || labels.tipo,
    valor_total,
    valor_entrada,
    valor_restante,
    status_pagamento: payload.status_pagamento || 'aguardando_pagamento',
    status_reserva: payload.status_reserva || 'aguardando_pagamento',
  } as any)
}

export function montarTextoRecibo(reserva: Partial<ReservationDeposit>, empresaNome = 'Empresa', ramo?: string | null) {
  const labels = getReservationLabelByBranch(ramo || reserva.ramo_atividade)
  const custom = reserva.recibo_custom || {}
  const linhas = [
    custom.titulo || labels.recibo,
    '',
    `Empresa: ${empresaNome}`,
    `Cliente: ${reserva.cliente_nome || '—'}`,
    reserva.cliente_telefone ? `Telefone: ${reserva.cliente_telefone}` : null,
    '',
    `Código: ${reserva.codigo || '—'}`,
    `Item/serviço: ${reserva.titulo || '—'}`,
    reserva.descricao ? `Descrição: ${reserva.descricao}` : null,
    `Data: ${reserva.data_reservada || '—'} ${reserva.hora_reservada ? `às ${reserva.hora_reservada}` : ''}`,
    '',
    `Valor total: ${dinheiro(reserva.valor_total)}`,
    `Entrada/sinal: ${dinheiro(reserva.valor_entrada)}`,
    `Restante: ${dinheiro(reserva.valor_restante)}`,
    `Pagamento: ${reserva.forma_pagamento || '—'}`,
    reserva.pix_chave ? `Pix: ${reserva.pix_chave}` : null,
    reserva.pix_nome_recebedor ? `Recebedor: ${reserva.pix_nome_recebedor}` : null,
    '',
    `Status: ${reserva.status_pagamento === 'pago' ? 'Pagamento confirmado' : 'Aguardando pagamento'}`,
    reserva.observacao ? `Observação: ${reserva.observacao}` : null,
    custom.observacao_cliente ? `Mensagem ao cliente: ${custom.observacao_cliente}` : null,
    '',
    custom.mensagem || labels.mensagem,
    custom.termos ? `Termos: ${custom.termos}` : null,
    '',
    `Emitido em: ${new Date().toLocaleString('pt-BR')}`,
  ].filter(Boolean)
  return linhas.join('\n')
}

export const ReservasAdiantamentosService = {
  getReservationLabelByBranch,

  async obterRamoAtual() {
    return getRamoAtual()
  },

  async listarReservas() {
    await assertReservaAccess('ver')
    const empresaId = await getEmpresaId()
    const { data, error } = await db().from('reservation_deposits').select('*').eq('empresa_id', empresaId).order('data_reservada', { ascending: true }).order('hora_reservada', { ascending: true })
    if (error) throw normalizeError(error, 'Erro ao listar reservas e adiantamentos.')
    return (data ?? []) as ReservationDeposit[]
  },

  async buscarReserva(id: string) {
    await assertReservaAccess('ver')
    const empresaId = await getEmpresaId()
    const { data, error } = await db().from('reservation_deposits').select('*').eq('empresa_id', empresaId).eq('id', id).maybeSingle()
    if (error) throw normalizeError(error, 'Erro ao buscar reserva.')
    return data as ReservationDeposit | null
  },

  async criarReserva(payload: ReservationInput) {
    await assertReservaAccess('criar')
    const empresaId = await getEmpresaId()
    const ramo = await getRamoAtual()
    const normalized = normalizePayload(payload, ramo)
    const { data, error } = await db().from('reservation_deposits').insert({ ...normalized, empresa_id: empresaId }).select().single()
    if (error) throw normalizeError(error, 'Erro ao criar reserva/adiantamento.')
    await this.criarNotificacao((data as any).id, 'reserva_criada', 'Reserva criada', `${(data as any).cliente_nome} — ${(data as any).titulo}`)
    return data as ReservationDeposit
  },

  async atualizarReserva(id: string, payload: Partial<ReservationInput>) {
    await assertReservaAccess('editar')
    const empresaId = await getEmpresaId()
    const atual = await this.buscarReserva(id)
    if (!atual) throw new Error('Reserva não encontrada.')
    const ramo = atual.ramo_atividade || await getRamoAtual()
    const merged = { ...atual, ...payload }
    const normalized = normalizePayload(merged as any, ramo)
    const { data, error } = await db().from('reservation_deposits').update({ ...normalized, updated_at: new Date().toISOString() }).eq('empresa_id', empresaId).eq('id', id).select().single()
    if (error) throw normalizeError(error, 'Erro ao atualizar reserva/adiantamento.')
    return data as ReservationDeposit
  },

  async salvarReciboCustom(id: string, reciboCustom: Record<string, any>) {
    await assertReservaAccess('editar')
    const empresaId = await getEmpresaId()
    const { data, error } = await db().from('reservation_deposits').update({ recibo_custom: reciboCustom, updated_at: new Date().toISOString() }).eq('empresa_id', empresaId).eq('id', id).select().single()
    if (error) throw normalizeError(error, 'Erro ao salvar dados editáveis do recibo.')
    return data as ReservationDeposit
  },

  async confirmarPagamento(id: string, formaPagamento?: string) {
    await assertReservaAccess('confirmar')
    const empresaId = await getEmpresaId()
    const userId = await getCurrentUserId()
    const { data, error } = await db().from('reservation_deposits').update({
      status_pagamento: 'pago',
      status_reserva: 'confirmada',
      forma_pagamento: formaPagamento || undefined,
      confirmado_por: userId,
      confirmado_em: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('empresa_id', empresaId).eq('id', id).select().single()
    if (error) throw normalizeError(error, 'Erro ao confirmar pagamento.')
    await this.criarNotificacao(id, 'pagamento_confirmado', 'Pagamento confirmado', `Reserva ${(data as any).codigo || ''} confirmada.`)
    await this.agendarLembretes(data as ReservationDeposit)
    return data as ReservationDeposit
  },

  async cancelarReserva(id: string, motivo?: string) {
    await assertReservaAccess('cancelar')
    const empresaId = await getEmpresaId()
    const userId = await getCurrentUserId()
    const { data, error } = await db().from('reservation_deposits').update({ status_pagamento: 'cancelado', status_reserva: 'cancelada', motivo_cancelamento: motivo, cancelado_por: userId, cancelado_em: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('empresa_id', empresaId).eq('id', id).select().single()
    if (error) throw normalizeError(error, 'Erro ao cancelar reserva.')
    return data as ReservationDeposit
  },

  async concluirReserva(id: string) {
    await assertReservaAccess('editar')
    return this.atualizarReserva(id, { status_reserva: 'concluida' } as any)
  },

  async marcarNaoCompareceu(id: string) {
    await assertReservaAccess('editar')
    return this.atualizarReserva(id, { status_reserva: 'nao_compareceu' } as any)
  },

  async gerarReciboReserva(id: string) {
    const empresaId = await getEmpresaId()
    const reserva = await this.buscarReserva(id)
    if (!reserva) throw new Error('Reserva não encontrada.')
    const { data: empresa } = await db().from('empresas').select('nome,nome_fantasia,razao_social').eq('id', empresaId).maybeSingle()
    return montarTextoRecibo(reserva, (empresa as any)?.nome_fantasia || (empresa as any)?.nome || (empresa as any)?.razao_social || 'Empresa', reserva.ramo_atividade)
  },

  async listarNotificacoesReserva() {
    const empresaId = await getEmpresaId()
    const { data, error } = await db().from('reservation_deposit_notifications').select('*').eq('empresa_id', empresaId).order('created_at', { ascending: false }).limit(50)
    if (error) throw normalizeError(error, 'Erro ao listar notificações de reservas.')
    return (data ?? []) as ReservationNotification[]
  },

  async marcarNotificacaoReservaComoLida(id: string) {
    const empresaId = await getEmpresaId()
    const { error } = await db().from('reservation_deposit_notifications').update({ lida_em: new Date().toISOString() }).eq('empresa_id', empresaId).eq('id', id)
    if (error) throw normalizeError(error, 'Erro ao marcar notificação como lida.')
    return true
  },

  async criarNotificacao(reservationId: string, tipo: string, titulo: string, mensagem: string, notificarEm?: string) {
    const empresaId = await getEmpresaId()
    await db().from('reservation_deposit_notifications').insert({ empresa_id: empresaId, reservation_id: reservationId, tipo, titulo, mensagem, notificar_em: notificarEm || null })
  },

  async agendarLembretes(reserva: ReservationDeposit) {
    if (!reserva.data_reservada || !reserva.hora_reservada) return
    const empresaId = await getEmpresaId()
    const when = new Date(`${reserva.data_reservada}T${String(reserva.hora_reservada).slice(0,5)}:00`)
    if (Number.isNaN(when.getTime())) return
    const moments = [24 * 60, 60, 0]
    const rows = moments.map((min) => {
      const date = new Date(when.getTime() - min * 60_000)
      return {
        empresa_id: empresaId,
        reservation_id: reserva.id,
        tipo: min === 0 ? 'horario_reserva' : 'reserva_proxima',
        titulo: min === 0 ? 'Reserva no horário' : `Reserva em ${min === 60 ? '1 hora' : '1 dia'}`,
        mensagem: `${reserva.cliente_nome} — ${reserva.titulo}. Restante: ${dinheiro(reserva.valor_restante)}.`,
        notificar_em: date.toISOString(),
      }
    })
    await db().from('reservation_deposit_notifications').insert(rows)
  },
}
