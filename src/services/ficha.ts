import type { FichaTecnica, FichaTecnicaForm } from '@/types'
import { db, getEmpresaId, normalizeEmptyValues, normalizeError, assertPermission, type AnyRecord } from './_base'
import { AuditoriaService } from './auditoria'

type FichaUpdatePayload = {
  quantidade: number
  unidade: string
  observacao?: string | null
}

export const FichaService = {
  async listar(produtoId: string): Promise<FichaTecnica[]> {
    const empresaId = await getEmpresaId()
    const { data, error } = await db()
      .from('ficha_tecnica')
      .select('*, insumo:insumos(*, categoria:categorias_insumos(*))')
      .eq('empresa_id', empresaId)
      .eq('produto_id', produtoId)
      .order('created_at')
    if (error) throw normalizeError(error, 'Erro ao listar ficha técnica.')
    return (data ?? []) as FichaTecnica[]
  },
  async adicionar(form: FichaTecnicaForm): Promise<FichaTecnica> {
    await assertPermission('fichas', 'criar')
    const empresaId = await getEmpresaId()
    const produtoId = (form as any).produto_id
    const insumoId = (form as any).insumo_id
    const [{ data: produto }, { data: insumo }] = await Promise.all([
      db().from('produtos').select('id').eq('empresa_id', empresaId).eq('id', produtoId).maybeSingle(),
      db().from('insumos').select('id').eq('empresa_id', empresaId).eq('id', insumoId).maybeSingle(),
    ])
    if (!produto) throw new Error('Produto não pertence à empresa atual.')
    if (!insumo) throw new Error('Insumo não pertence à empresa atual.')
    const payload = normalizeEmptyValues({ ...(form as any), empresa_id: empresaId })
    const { data, error } = await db().from('ficha_tecnica').insert(payload).select('*, insumo:insumos(*)').single()
    if (error) throw normalizeError(error, 'Erro ao adicionar ingrediente à ficha.')
    await AuditoriaService.registrar('fichas.criar', 'ficha_tecnica', data.id, { produto_id: data.produto_id, insumo_id: data.insumo_id }).catch(() => null)
    return data as FichaTecnica
  },
  async atualizar(id: string, quantidade: number, unidade: string, observacao?: string | null): Promise<FichaTecnica> {
    await assertPermission('fichas', 'editar')
    const empresaId = await getEmpresaId()
    const payload: FichaUpdatePayload & { updated_at: string } = { quantidade: Number(quantidade || 0), unidade, observacao: observacao ?? null, updated_at: new Date().toISOString() }
    const { data, error } = await db()
      .from('ficha_tecnica')
      .update(payload)
      .eq('empresa_id', empresaId)
      .eq('id', id)
      .select('*, insumo:insumos(*)')
      .maybeSingle()
    if (error) throw normalizeError(error, 'Erro ao atualizar ingrediente da ficha.')
    if (!data) throw new Error('Ingrediente da ficha não encontrado nesta empresa ou sem permissão para editar.')
    await AuditoriaService.registrar('fichas.editar', 'ficha_tecnica', id, { quantidade, unidade }).catch(() => null)
    return data as FichaTecnica
  },
  async remover(id: string): Promise<void> {
    await assertPermission('fichas', 'excluir')
    const empresaId = await getEmpresaId()
    const { error } = await db().from('ficha_tecnica').delete().eq('empresa_id', empresaId).eq('id', id)
    if (error) throw normalizeError(error, 'Erro ao remover ingrediente da ficha.')
    await AuditoriaService.registrar('fichas.excluir', 'ficha_tecnica', id).catch(() => null)
  },
  async duplicar(produtoOrigemId: string, produtoDestinoId: string): Promise<void> {
    await assertPermission('fichas', 'criar')
    const empresaId = await getEmpresaId()
    const { data: destino } = await db().from('produtos').select('id').eq('empresa_id', empresaId).eq('id', produtoDestinoId).maybeSingle()
    if (!destino) throw new Error('Produto de destino não pertence à empresa atual.')
    const { data: ficha, error: readError } = await db().from('ficha_tecnica').select('insumo_id, quantidade, unidade, observacao').eq('empresa_id', empresaId).eq('produto_id', produtoOrigemId)
    if (readError) throw normalizeError(readError, 'Erro ao copiar ficha técnica.')
    if (ficha?.length) {
      const novaFicha = ficha.map((f: AnyRecord) => ({ ...f, empresa_id: empresaId, produto_id: produtoDestinoId }))
      const { error } = await db().from('ficha_tecnica').insert(novaFicha)
      if (error) throw normalizeError(error, 'Erro ao duplicar ficha técnica.')
    }
  },
}
