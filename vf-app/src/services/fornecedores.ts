import type { Fornecedor, FornecedorForm } from '@/types'
import { db, normalizeEmptyValues, normalizeError, withEmpresa, assertPermission, type AnyRecord } from './_base'
import { AuditoriaService } from './auditoria'

export const FornecedoresService = {
  async listar(): Promise<Fornecedor[]> {
    const { data, error } = await db().from('fornecedores').select('*').eq('ativo', true).order('nome')
    if (error) throw normalizeError(error, 'Erro ao listar fornecedores.')
    return (data ?? []) as Fornecedor[]
  },
  async criar(form: FornecedorForm): Promise<Fornecedor> {
    await assertPermission('fornecedores', 'criar')
    const payload = await withEmpresa({ ...form, ativo: form.ativo ?? true } as AnyRecord)
    const { data, error } = await db().from('fornecedores').insert(payload).select().single()
    if (error) throw normalizeError(error, 'Erro ao criar fornecedor.')
    await AuditoriaService.registrar('fornecedores.criar', 'fornecedores', data.id, { nome: data.nome }).catch(() => null)
    return data as Fornecedor
  },
  async atualizar(id: string, form: Partial<FornecedorForm>): Promise<Fornecedor> {
    await assertPermission('fornecedores', 'editar')
    const { data, error } = await db().from('fornecedores').update({ ...normalizeEmptyValues(form), updated_at: new Date().toISOString() }).eq('id', id).select().single()
    if (error) throw normalizeError(error, 'Erro ao atualizar fornecedor.')
    await AuditoriaService.registrar('fornecedores.editar', 'fornecedores', id, { campos: Object.keys(form) }).catch(() => null)
    return data as Fornecedor
  },
  async excluir(id: string): Promise<void> {
    await assertPermission('fornecedores', 'excluir')
    const { error } = await db().from('fornecedores').update({ ativo: false, updated_at: new Date().toISOString() }).eq('id', id)
    if (error) throw normalizeError(error, 'Erro ao remover fornecedor.')
    await AuditoriaService.registrar('fornecedores.excluir', 'fornecedores', id).catch(() => null)
  },
  async comparativoPrecos(nomeInsumo: string): Promise<Array<{ fornecedor: string; preco_kg: number; preco_litro: number }>> {
    const { data, error } = await db().from('insumos').select('nome, custo_por_kg, custo_por_litro, fornecedor:fornecedores(nome)').ilike('nome', `%${nomeInsumo}%`).eq('ativo', true)
    if (error) throw normalizeError(error, 'Erro ao comparar preços de fornecedores.')
    return (data ?? []).map((i: any) => ({ fornecedor: i.fornecedor?.nome ?? 'Sem fornecedor', preco_kg: Number(i.custo_por_kg ?? 0), preco_litro: Number(i.custo_por_litro ?? 0) }))
  },
}
