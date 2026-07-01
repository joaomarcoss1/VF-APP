import type { Produto, ProdutoForm } from '@/types'
import { db, normalizeEmptyValues, normalizeError, withEmpresa, assertPermission, type AnyRecord } from './_base'
import { AuditoriaService } from './auditoria'

function recalcularIndicadores(payload: AnyRecord): AnyRecord {
  const custo = Number(payload.custo_total ?? 0)
  const preco = Number(payload.preco_venda ?? 0)
  if (preco > 0) {
    payload.cmv_percentual = Number(((custo / preco) * 100).toFixed(2))
    payload.lucro_bruto = Number((preco - custo).toFixed(2))
    payload.margem_bruta = Number((((preco - custo) / preco) * 100).toFixed(2))
  }
  return payload
}

function sanitizeProdutoPayload(input: AnyRecord): AnyRecord {
  const payload = normalizeEmptyValues({ ...input })
  const custoDetalhado = ['custo_base','custo_frete','custo_taxas','custo_embalagem','custo_operacional','custo_outros'].reduce((sum, key) => sum + Number(payload[key] || 0), 0)
  if (custoDetalhado > 0) payload.custo_total = Number(custoDetalhado.toFixed(2))
  if (!payload.preco_manual && (!payload.preco_venda || Number(payload.preco_venda) <= 0) && Number(payload.custo_total || 0) > 0) {
    const margem = Number(payload.margem_aplicada ?? 300)
    payload.preco_venda = Number((Number(payload.custo_total) * (1 + margem / 100)).toFixed(2))
  }
  payload.ativo = payload.ativo ?? true
  payload.disponivel = payload.disponivel ?? true
  payload.destaque = Boolean(payload.destaque)
  return recalcularIndicadores(payload)
}

export const ProdutosService = {
  async listar(search?: string): Promise<Produto[]> {
    let q = db().from('produtos').select('*, ficha_tecnica(*)').eq('ativo', true).order('nome')
    if (search?.trim()) q = q.ilike('nome', `%${search.trim()}%`)
    const { data, error } = await q
    if (error) throw normalizeError(error, 'Erro ao listar produtos.')
    return (data ?? []) as Produto[]
  },
  async buscarPorId(id: string): Promise<Produto | null> {
    const { data, error } = await db().from('produtos').select('*, ficha_tecnica(*)').eq('id', id).maybeSingle()
    if (error) throw normalizeError(error, 'Erro ao buscar produto.')
    return data as Produto | null
  },
  async historicoPrecos(produtoId: string) {
    const { data, error } = await db().from('historico_precos').select('*').eq('produto_id', produtoId).order('alterado_em', { ascending: false }).limit(50)
    if (error) return []
    return data ?? []
  },
  async rankingRentabilidade() {
    const { data, error } = await db().from('produtos').select('*').eq('ativo', true).order('margem_bruta', { ascending: false }).limit(10)
    if (error) throw normalizeError(error, 'Erro ao carregar ranking de rentabilidade.')
    return data ?? []
  },
  async criar(form: ProdutoForm): Promise<Produto> {
    await assertPermission('produtos', 'criar')
    const payload = await withEmpresa(sanitizeProdutoPayload(form as any))
    const { data, error } = await db().from('produtos').insert(payload).select().single()
    if (error) throw normalizeError(error, 'Erro ao cadastrar produto.')
    await AuditoriaService.registrar('produtos.criar', 'produtos', data.id, { nome: data.nome, preco_venda: data.preco_venda }).catch(() => null)
    return data as Produto
  },
  async atualizar(id: string, form: Partial<ProdutoForm>): Promise<Produto> {
    await assertPermission('produtos', 'editar')
    const payload = sanitizeProdutoPayload({ ...form, updated_at: new Date().toISOString() })
    const { data, error } = await db().from('produtos').update(payload).eq('id', id).select().single()
    if (error) throw normalizeError(error, 'Erro ao atualizar produto.')
    await AuditoriaService.registrar('produtos.editar', 'produtos', id, { campos: Object.keys(form) }).catch(() => null)
    return data as Produto
  },
  async excluir(id: string): Promise<void> {
    await assertPermission('produtos', 'excluir')
    const { error } = await db().from('produtos').update({ ativo: false, updated_at: new Date().toISOString() }).eq('id', id)
    if (error) throw normalizeError(error, 'Erro ao remover produto.')
    await AuditoriaService.registrar('produtos.excluir', 'produtos', id).catch(() => null)
  },
}
