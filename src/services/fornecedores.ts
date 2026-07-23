import type { Fornecedor, FornecedorForm } from '@/types'
import { db, getEmpresaId, normalizeEmptyValues, normalizeError, withEmpresa, assertPermission, type AnyRecord } from './_base'
import { AuditoriaService } from './auditoria'
import { tenantPage, type PageRequest } from './tenant/tenant-query'

export const FornecedoresService = {
  async listarPaginado(request: PageRequest = {}) {
    return tenantPage<Fornecedor>('fornecedores', '*', { ...request, orderBy: request.orderBy || 'nome', ascending: request.ascending ?? true }, (query) => {
      query = query.eq('ativo', true)
      const search = String(request.search || '').trim().replace(/[,%()]/g, ' ')
      if (search) query = query.or(`nome.ilike.%${search}%,cnpj.ilike.%${search}%,telefone.ilike.%${search}%,whatsapp.ilike.%${search}%`)
      return query
    })
  },
  async listar(): Promise<Fornecedor[]> {
    const empresaId = await getEmpresaId()
    const { data, error } = await db().from('fornecedores').select('*').eq('empresa_id', empresaId).eq('ativo', true).order('nome')
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
    const empresaId = await getEmpresaId()
    const { data, error } = await db().from('fornecedores').update({ ...normalizeEmptyValues(form), updated_at: new Date().toISOString() }).eq('empresa_id', empresaId).eq('id', id).select().maybeSingle()
    if (error) throw normalizeError(error, 'Erro ao atualizar fornecedor.')
    if (!data) throw new Error('Fornecedor não encontrado nesta empresa ou sem permissão para editar.')
    await AuditoriaService.registrar('fornecedores.editar', 'fornecedores', id, { campos: Object.keys(form) }).catch(() => null)
    return data as Fornecedor
  },
  async excluir(id: string): Promise<void> {
    await assertPermission('fornecedores', 'excluir')
    const empresaId = await getEmpresaId()
    const { error } = await db().from('fornecedores').update({ ativo: false, updated_at: new Date().toISOString() }).eq('empresa_id', empresaId).eq('id', id)
    if (error) throw normalizeError(error, 'Erro ao remover fornecedor.')
    await AuditoriaService.registrar('fornecedores.excluir', 'fornecedores', id).catch(() => null)
  },
  async comparativoPrecos(nomeInsumo: string): Promise<Array<{ fornecedor: string; preco_kg: number; preco_litro: number }>> {
    const empresaId = await getEmpresaId()
    const { data, error } = await db().from('insumos').select('nome, custo_por_kg, custo_por_litro, fornecedor:fornecedores(nome)').eq('empresa_id', empresaId).ilike('nome', `%${nomeInsumo}%`).eq('ativo', true)
    if (error) throw normalizeError(error, 'Erro ao comparar preços de fornecedores.')
    return (data ?? []).map((i: any) => ({ fornecedor: i.fornecedor?.nome ?? 'Sem fornecedor', preco_kg: Number(i.custo_por_kg ?? 0), preco_litro: Number(i.custo_por_litro ?? 0) }))
  },
}
