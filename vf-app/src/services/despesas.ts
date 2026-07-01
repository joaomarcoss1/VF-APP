import type { Despesa, DespesaForm } from '@/types'
import { db, normalizeEmptyValues, normalizeError, withEmpresa, assertPermission, type AnyRecord } from './_base'
import { AuditoriaService } from './auditoria'

export const DespesasService = {
  async listar(): Promise<Despesa[]> {
    const { data, error } = await db().from('despesas').select('*').order('created_at', { ascending: false })
    if (error) throw normalizeError(error, 'Erro ao listar despesas.')
    return (data ?? []) as Despesa[]
  },
  async criar(form: DespesaForm): Promise<Despesa> {
    await assertPermission('despesas', 'criar')
    const payload = await withEmpresa({ ...form, valor: Number(form.valor || 0), percentual: form.percentual ? Number(form.percentual) : null } as AnyRecord)
    const { data, error } = await db().from('despesas').insert(payload).select().single()
    if (error) throw normalizeError(error, 'Erro ao criar despesa.')
    await AuditoriaService.registrar('despesas.criar', 'despesas', data.id, { nome: data.nome, valor: data.valor }).catch(() => null)
    return data as Despesa
  },
  async atualizar(id: string, form: Partial<DespesaForm>): Promise<Despesa> {
    await assertPermission('despesas', 'editar')
    const payload = normalizeEmptyValues({ ...form, updated_at: new Date().toISOString() } as AnyRecord)
    if (payload.valor !== undefined) payload.valor = Number(payload.valor || 0)
    if (payload.percentual !== undefined && payload.percentual !== null) payload.percentual = Number(payload.percentual || 0)
    const { data, error } = await db().from('despesas').update(payload).eq('id', id).select().single()
    if (error) throw normalizeError(error, 'Erro ao atualizar despesa.')
    await AuditoriaService.registrar('despesas.editar', 'despesas', id, { campos: Object.keys(form) }).catch(() => null)
    return data as Despesa
  },
  async excluir(id: string): Promise<void> {
    await assertPermission('despesas', 'excluir')
    const { error } = await db().from('despesas').delete().eq('id', id)
    if (error) throw normalizeError(error, 'Erro ao excluir despesa.')
    await AuditoriaService.registrar('despesas.excluir', 'despesas', id).catch(() => null)
  },
  async resumoMensal(): Promise<{ total_fixo: number; total_variavel: number; total_geral: number; despesas: Despesa[] }> {
    const despesas = await this.listar(); const ativas = despesas.filter(d => d.ativa)
    const fator = (rec: string) => rec === 'diaria' ? 30 : rec === 'semanal' ? 4.33 : rec === 'mensal' ? 1 : 1
    const total_fixo = ativas.filter(d => d.tipo === 'fixa').reduce((a, d) => a + Number(d.valor) * fator(d.recorrencia), 0)
    const total_variavel = ativas.filter(d => d.tipo !== 'fixa').reduce((a, d) => a + Number(d.valor) * fator(d.recorrencia), 0)
    return { total_fixo, total_variavel, total_geral: total_fixo + total_variavel, despesas: ativas }
  },
}
