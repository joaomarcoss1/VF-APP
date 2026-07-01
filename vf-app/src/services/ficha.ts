import type { FichaTecnica, FichaTecnicaForm } from '@/types'
import { db, normalizeEmptyValues, normalizeError, assertPermission, type AnyRecord } from './_base'
import { AuditoriaService } from './auditoria'

export const FichaService = {
  async listar(produtoId: string): Promise<FichaTecnica[]> {
    const { data, error } = await db().from('ficha_tecnica').select('*, insumo:insumos(*, categoria:categorias_insumos(*))').eq('produto_id', produtoId).order('created_at')
    if (error) throw normalizeError(error, 'Erro ao listar ficha técnica.')
    return (data ?? []) as FichaTecnica[]
  },
  async adicionar(form: FichaTecnicaForm): Promise<FichaTecnica> {
    await assertPermission('fichas', 'criar')
    const { data, error } = await db().from('ficha_tecnica').insert(normalizeEmptyValues(form as any)).select('*, insumo:insumos(*)').single()
    if (error) throw normalizeError(error, 'Erro ao adicionar ingrediente à ficha.')
    await AuditoriaService.registrar('fichas.criar', 'ficha_tecnica', data.id, { produto_id: data.produto_id, insumo_id: data.insumo_id }).catch(() => null)
    return data as FichaTecnica
  },
  async atualizar(id: string, quantidade: number, unidade: string): Promise<FichaTecnica> {
    await assertPermission('fichas', 'editar')
    const { data, error } = await db().from('ficha_tecnica').update({ quantidade, unidade }).eq('id', id).select('*, insumo:insumos(*)').single()
    if (error) throw normalizeError(error, 'Erro ao atualizar ingrediente da ficha.')
    await AuditoriaService.registrar('fichas.editar', 'ficha_tecnica', id, { quantidade, unidade }).catch(() => null)
    return data as FichaTecnica
  },
  async remover(id: string): Promise<void> {
    await assertPermission('fichas', 'excluir')
    const { error } = await db().from('ficha_tecnica').delete().eq('id', id)
    if (error) throw normalizeError(error, 'Erro ao remover ingrediente da ficha.')
    await AuditoriaService.registrar('fichas.excluir', 'ficha_tecnica', id).catch(() => null)
  },
  async duplicar(produtoOrigemId: string, produtoDestinoId: string): Promise<void> {
    await assertPermission('fichas', 'criar')
    const { data: ficha, error: readError } = await db().from('ficha_tecnica').select('insumo_id, quantidade, unidade, observacao').eq('produto_id', produtoOrigemId)
    if (readError) throw normalizeError(readError, 'Erro ao copiar ficha técnica.')
    if (ficha?.length) {
      const novaFicha = ficha.map((f: AnyRecord) => ({ ...f, produto_id: produtoDestinoId }))
      const { error } = await db().from('ficha_tecnica').insert(novaFicha)
      if (error) throw normalizeError(error, 'Erro ao duplicar ficha técnica.')
    }
  },
}
