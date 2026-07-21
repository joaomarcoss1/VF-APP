import type { AlertaEstoque, Insumo, InsumoForm } from '@/types'
import { db, getEmpresaId, normalizeEmptyValues, normalizeError, withEmpresa, assertPermission, type AnyRecord } from './_base'
import { AuditoriaService } from './auditoria'

export const InsumosService = {
  async listar(search?: string): Promise<Insumo[]> {
    const empresaId = await getEmpresaId()
    let q = db().from('insumos').select('*, categoria:categorias_insumos(id,nome,icone,cor), fornecedor:fornecedores(id,nome)').eq('empresa_id', empresaId).eq('ativo', true).order('nome')
    if (search?.trim()) q = q.ilike('nome', `%${search.trim()}%`)
    const { data, error } = await q
    if (error) throw normalizeError(error, 'Erro ao listar insumos.')
    return (data ?? []) as Insumo[]
  },
  async buscarPorId(id: string): Promise<Insumo | null> {
    const empresaId = await getEmpresaId()
    const { data, error } = await db().from('insumos').select('*, categoria:categorias_insumos(*), fornecedor:fornecedores(*)').eq('empresa_id', empresaId).eq('id', id).maybeSingle()
    if (error) throw normalizeError(error, 'Erro ao buscar insumo.')
    return data as Insumo | null
  },
  async criar(form: InsumoForm): Promise<Insumo> {
    await assertPermission('insumos', 'criar')
    const payload = await withEmpresa({ ...form, ativo: form.ativo ?? true } as AnyRecord)
    const { data, error } = await db().from('insumos').insert(payload).select().single()
    if (error) throw normalizeError(error, 'Erro ao criar insumo.')
    await AuditoriaService.registrar('insumos.criar', 'insumos', data.id, { nome: data.nome }).catch(() => null)
    return data as Insumo
  },
  async atualizar(id: string, form: Partial<InsumoForm>): Promise<Insumo> {
    await assertPermission('insumos', 'editar')
    const empresaId = await getEmpresaId()
    const { data, error } = await db().from('insumos').update({ ...normalizeEmptyValues(form), updated_at: new Date().toISOString() }).eq('empresa_id', empresaId).eq('id', id).select().maybeSingle()
    if (error) throw normalizeError(error, 'Erro ao atualizar insumo.')
    if (!data) throw new Error('Insumo não encontrado nesta empresa ou sem permissão para editar.')
    await AuditoriaService.registrar('insumos.editar', 'insumos', id, { campos: Object.keys(form) }).catch(() => null)
    return data as Insumo
  },
  async excluir(id: string): Promise<void> {
    await assertPermission('insumos', 'excluir')
    const empresaId = await getEmpresaId()
    const { error } = await db().from('insumos').update({ ativo: false, updated_at: new Date().toISOString() }).eq('empresa_id', empresaId).eq('id', id)
    if (error) throw normalizeError(error, 'Erro ao remover insumo.')
    await AuditoriaService.registrar('insumos.excluir', 'insumos', id).catch(() => null)
  },
  async alertasEstoque(): Promise<AlertaEstoque[]> {
    const empresaId = await getEmpresaId()
    const { data, error } = await db().from('insumos').select('*').eq('empresa_id', empresaId).eq('ativo', true)
    if (error) throw normalizeError(error, 'Erro ao carregar alertas de estoque.')
    const hoje = new Date()
    const alertas: AlertaEstoque[] = []
    for (const insumo of (data ?? []) as Insumo[]) {
      if ((insumo.estoque_minimo ?? 0) > 0 && (insumo.estoque_atual ?? 0) <= 0) alertas.push({ insumo, tipo: 'critico', mensagem: `${insumo.nome} está zerado no estoque` })
      else if ((insumo.estoque_minimo ?? 0) > 0 && (insumo.estoque_atual ?? 0) <= (insumo.estoque_minimo ?? 0)) alertas.push({ insumo, tipo: 'baixo', mensagem: `${insumo.nome} abaixo do mínimo (${insumo.estoque_atual} / mín. ${insumo.estoque_minimo})` })
      if (insumo.data_vencimento) {
        const venc = new Date(`${insumo.data_vencimento}T00:00:00`)
        const diff = Math.ceil((venc.getTime() - hoje.getTime()) / 86_400_000)
        if (diff < 0) alertas.push({ insumo, tipo: 'vencido', mensagem: `${insumo.nome} venceu há ${Math.abs(diff)} dia(s)` })
        else if (diff <= 3) alertas.push({ insumo, tipo: 'vencendo', mensagem: `${insumo.nome} vence em ${diff} dia(s)` })
      }
      if ((insumo.estoque_ideal ?? 0) > 0 && (insumo.estoque_atual ?? 0) > (insumo.estoque_ideal ?? 0) * 1.5) alertas.push({ insumo, tipo: 'excesso', mensagem: `${insumo.nome} em excesso no estoque` })
    }
    return alertas
  },
}
