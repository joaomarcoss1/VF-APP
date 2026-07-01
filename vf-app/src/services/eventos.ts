import type { Evento, EventoForm, EventoItemForm } from '@/types'
import { calcularPrecificacaoEvento } from '@/lib/precificacao'
import { db, getEmpresaId, normalizeEmptyValues, normalizeError, assertPermission, type AnyRecord } from './_base'
import { AuditoriaService } from './auditoria'

export const EventosService = {
  async listar(): Promise<Evento[]> {
    const { data, error } = await db().from('eventos').select('*, itens:evento_itens(*)').order('created_at', { ascending: false })
    if (error) throw normalizeError(error, 'Erro ao listar eventos.')
    return (data ?? []) as Evento[]
  },
  async criar(form: EventoForm): Promise<Evento> {
    await assertPermission('eventos', 'criar')
    const empresaId = await getEmpresaId()
    const calc = calcularPrecificacaoEvento({ pessoas: form.pessoas, margem_lucro: form.margem_lucro, taxa_operacional_percentual: form.taxa_operacional_percentual, custo_operacional_extra: form.custo_operacional_extra, desconto: form.desconto, itens: form.itens as EventoItemForm[] })
    const payload = normalizeEmptyValues({ empresa_id: empresaId, nome: form.nome, tipo_evento: form.tipo_evento, data_evento: form.data_evento || null, pessoas: calc.pessoas, margem_lucro: calc.margem_lucro, taxa_operacional_percentual: calc.taxa_operacional_percentual, custo_operacional_extra: calc.custo_operacional_extra, desconto: calc.desconto, custo_produtos: calc.custo_produtos, custo_total: calc.custo_total, preco_sugerido: calc.preco_sugerido, preco_por_pessoa: calc.preco_por_pessoa, lucro_estimado: calc.lucro_estimado, cmv_percentual: calc.cmv_percentual, observacoes: form.observacoes, status: form.status || 'orcamento' } as AnyRecord)
    const { data, error } = await db().from('eventos').insert(payload).select().single()
    if (error) throw normalizeError(error, 'Erro ao criar evento.')
    if (calc.itens.length) {
      const itens = calc.itens.map(item => ({ ...item, empresa_id: empresaId, evento_id: data.id }))
      const { error: itensError } = await db().from('evento_itens').insert(itens)
      if (itensError) throw normalizeError(itensError, 'Evento criado, mas houve erro ao salvar itens.')
    }
    await AuditoriaService.registrar('eventos.criar', 'eventos', data.id, { preco_sugerido: data.preco_sugerido, pessoas: data.pessoas }).catch(() => null)
    return data as Evento
  },
  async atualizar(id: string, form: EventoForm): Promise<Evento> {
    await assertPermission('eventos', 'editar')
    const empresaId = await getEmpresaId()
    const calc = calcularPrecificacaoEvento({ pessoas: form.pessoas, margem_lucro: form.margem_lucro, taxa_operacional_percentual: form.taxa_operacional_percentual, custo_operacional_extra: form.custo_operacional_extra, desconto: form.desconto, itens: form.itens as EventoItemForm[] })
    const payload = normalizeEmptyValues({ nome: form.nome, tipo_evento: form.tipo_evento, data_evento: form.data_evento || null, pessoas: calc.pessoas, margem_lucro: calc.margem_lucro, taxa_operacional_percentual: calc.taxa_operacional_percentual, custo_operacional_extra: calc.custo_operacional_extra, desconto: calc.desconto, custo_produtos: calc.custo_produtos, custo_total: calc.custo_total, preco_sugerido: calc.preco_sugerido, preco_por_pessoa: calc.preco_por_pessoa, lucro_estimado: calc.lucro_estimado, cmv_percentual: calc.cmv_percentual, observacoes: form.observacoes, status: form.status, updated_at: new Date().toISOString() } as AnyRecord)
    const { data, error } = await db().from('eventos').update(payload).eq('id', id).select().single()
    if (error) throw normalizeError(error, 'Erro ao atualizar evento.')
    await db().from('evento_itens').delete().eq('evento_id', id)
    if (calc.itens.length) {
      const { error: itensError } = await db().from('evento_itens').insert(calc.itens.map(item => ({ ...item, empresa_id: empresaId, evento_id: id })))
      if (itensError) throw normalizeError(itensError, 'Evento atualizado, mas houve erro ao salvar itens.')
    }
    await AuditoriaService.registrar('eventos.editar', 'eventos', id, { preco_sugerido: data.preco_sugerido }).catch(() => null)
    return data as Evento
  },
  async excluir(id: string): Promise<void> {
    await assertPermission('eventos', 'excluir')
    const { error } = await db().from('eventos').delete().eq('id', id)
    if (error) throw normalizeError(error, 'Erro ao excluir evento.')
    await AuditoriaService.registrar('eventos.excluir', 'eventos', id).catch(() => null)
  },
  async resumo() {
    const eventos = await this.listar()
    return {
      total: eventos.length,
      orcamentos: eventos.filter(e => e.status === 'orcamento').length,
      aprovados: eventos.filter(e => e.status === 'aprovado').length,
      receita_prevista: eventos.filter(e => e.status !== 'cancelado').reduce((a, e) => a + Number(e.preco_sugerido || 0), 0),
      lucro_previsto: eventos.filter(e => e.status !== 'cancelado').reduce((a, e) => a + Number(e.lucro_estimado || 0), 0),
    }
  },
}
