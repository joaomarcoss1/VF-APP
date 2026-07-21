import type { Agendamento, AgendamentoForm } from '@/types'
import { getEmpresaIdObrigatoria } from './_tenant'
import { db, normalizeEmptyValues, normalizeError, withEmpresa, assertPermission, type AnyRecord } from './_base'
import { ClientesService } from './clientes'
import { ComprovantesService, gerarTextoComprovante } from './comprovantes'
import { AuditoriaService } from './auditoria'

export const AgendamentosService = {
  async listar(inicio?: string, fim?: string): Promise<Agendamento[]> {
    const empresaId = await getEmpresaIdObrigatoria()
    let q = db().from('agendamentos').select('*, produto:produtos(id,nome,categoria,preco_venda,custo_total)').eq('empresa_id', empresaId).order('data_agendamento', { ascending: true }).order('hora_inicio', { ascending: true })
    if (inicio) q = q.gte('data_agendamento', inicio)
    if (fim) q = q.lte('data_agendamento', fim)
    const { data, error } = await q
    if (error) throw normalizeError(error, 'Erro ao listar agendamentos.')
    return (data ?? []) as Agendamento[]
  },
  async criar(form: AgendamentoForm): Promise<Agendamento> {
    await assertPermission('agendamentos', 'criar')
    const valor = Number(form.valor || 0); const desconto = Number(form.desconto || 0); const taxaServico = Number(form.taxa_servico || 0); const total = Math.max(0, valor + taxaServico - desconto)
    const payload = await withEmpresa({ ...form, produto_id: form.produto_id || null, valor, desconto, taxa_servico: taxaServico, total: Number(total.toFixed(2)), forma_pagamento: form.forma_pagamento || 'pix', status: form.status || 'agendado' } as AnyRecord)
    const { data, error } = await db().from('agendamentos').insert(payload).select().single()
    if (error) throw normalizeError(error, 'Erro ao criar agendamento.')
    const ag = data as Agendamento
    await ClientesService.upsertFromContact({ nome: ag.cliente_nome, whatsapp: ag.cliente_whatsapp, email: ag.cliente_email, origem: 'agendamento' }).catch(() => undefined)
    const mensagem = gerarTextoComprovante({ empresa_nome: 'VF Nexus', cliente_nome: ag.cliente_nome, cliente_whatsapp: ag.cliente_whatsapp, itens: [{ nome: ag.servico_nome, quantidade: 1, valor_unitario: Number(ag.valor || 0), total: Number(ag.valor || 0) }], subtotal: Number(ag.valor || 0), desconto: Number(ag.desconto || 0), taxa_servico: Number(ag.taxa_servico || 0), total: Number(ag.total || 0), forma_pagamento: ag.forma_pagamento, data_hora: `${ag.data_agendamento} ${ag.hora_inicio}`, observacoes: ag.observacoes, tipo: 'agendamento' })
    await ComprovantesService.registrar({ tipo: 'agendamento', agendamento_id: ag.id, cliente_nome: ag.cliente_nome, cliente_whatsapp: ag.cliente_whatsapp, descricao: ag.servico_nome, total: Number(ag.total || 0), forma_pagamento: ag.forma_pagamento, mensagem }).catch(() => undefined)
    await AuditoriaService.registrar('agendamentos.criar', 'agendamentos', ag.id, { cliente: ag.cliente_nome, total: ag.total }).catch(() => null)
    return ag
  },
  async atualizar(id: string, form: Partial<AgendamentoForm>): Promise<Agendamento> {
    await assertPermission('agendamentos', 'editar')
    const payload = normalizeEmptyValues({ ...form, updated_at: new Date().toISOString() } as AnyRecord)
    if (payload.valor !== undefined || payload.desconto !== undefined || payload.taxa_servico !== undefined) {
      const atual = await db().from('agendamentos').select('valor,desconto,taxa_servico').eq('empresa_id', await getEmpresaIdObrigatoria()).eq('id', id).maybeSingle()
      const valor = Number(payload.valor ?? atual.data?.valor ?? 0); const desconto = Number(payload.desconto ?? atual.data?.desconto ?? 0); const taxa = Number(payload.taxa_servico ?? atual.data?.taxa_servico ?? 0)
      payload.total = Number(Math.max(0, valor + taxa - desconto).toFixed(2))
    }
    const { data, error } = await db().from('agendamentos').update(payload).eq('empresa_id', await getEmpresaIdObrigatoria()).eq('id', id).select().single()
    if (error) throw normalizeError(error, 'Erro ao atualizar agendamento.')
    await AuditoriaService.registrar('agendamentos.editar', 'agendamentos', id, { campos: Object.keys(form) }).catch(() => null)
    return data as Agendamento
  },
  async excluir(id: string): Promise<void> {
    await assertPermission('agendamentos', 'excluir')
    const { error } = await db().from('agendamentos').delete().eq('empresa_id', await getEmpresaIdObrigatoria()).eq('id', id)
    if (error) throw normalizeError(error, 'Erro ao excluir agendamento.')
    await AuditoriaService.registrar('agendamentos.excluir', 'agendamentos', id).catch(() => null)
  },
  async proximos(limit = 20): Promise<Agendamento[]> {
    const hoje = new Date().toISOString().split('T')[0]
    const empresaId = await getEmpresaIdObrigatoria()
    const { data, error } = await db().from('agendamentos').select('*').eq('empresa_id', empresaId).gte('data_agendamento', hoje).neq('status', 'cancelado').order('data_agendamento', { ascending: true }).order('hora_inicio', { ascending: true }).limit(limit)
    if (error) throw normalizeError(error, 'Erro ao carregar próximos agendamentos.')
    return (data ?? []) as Agendamento[]
  },
}
