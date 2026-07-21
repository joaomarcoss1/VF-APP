import type { Produto, ProdutoForm } from '@/types'
import { db, getEmpresaId, normalizeEmptyValues, normalizeError, withEmpresa, assertPermission, type AnyRecord } from './_base'
import { AuditoriaService } from './auditoria'

const PRODUTO_COLUMNS = new Set([
  'nome','descricao','categoria','foto_url','imagem_url','sku','codigo_barras','codigo_interno','marca','modelo','tamanho','cor',
  'duracao_min','tipo_cadastro','tempo_preparo_min','rendimento','unidade_rendimento','modo_preparo',
  'custo_base','custo_frete','custo_taxas','custo_embalagem','custo_operacional','custo_outros','custo_total',
  'margem_aplicada','preco_venda','preco_manual','preco_minimo','preco_premium','cmv_percentual','margem_bruta','lucro_bruto',
  'grade','margem_categoria','validade_dias','perdas_percentual','producao_lote','comissao_percentual','impostos_estimados',
  'garantia','materiais_usados','preco_promocional','estoque_minimo','etiqueta_preferencial',
  'setor_producao','aparece_no_atendimento','ordem_atendimento','ativo','destaque','disponivel','updated_at'
])

const NUMERIC_COLUMNS = new Set([
  'duracao_min','tempo_preparo_min','rendimento','custo_base','custo_frete','custo_taxas','custo_embalagem','custo_operacional','custo_outros',
  'custo_total','margem_aplicada','preco_venda','preco_minimo','preco_premium','cmv_percentual','margem_bruta','lucro_bruto',
  'margem_categoria','validade_dias','perdas_percentual','producao_lote','comissao_percentual','impostos_estimados','preco_promocional',
  'estoque_minimo','ordem_atendimento'
])

const BOOLEAN_COLUMNS = new Set(['preco_manual','ativo','destaque','disponivel','aparece_no_atendimento'])

function recalcularIndicadores(payload: AnyRecord): AnyRecord {
  const custo = Number(payload.custo_total ?? 0)
  const preco = Number(payload.preco_venda ?? 0)
  if (preco > 0) {
    payload.cmv_percentual = Number(((custo / preco) * 100).toFixed(2))
    payload.lucro_bruto = Number((preco - custo).toFixed(2))
    payload.margem_bruta = Number((((preco - custo) / preco) * 100).toFixed(2))
  } else if ('preco_venda' in payload || 'custo_total' in payload) {
    payload.cmv_percentual = 0
    payload.lucro_bruto = Number((-custo).toFixed(2))
    payload.margem_bruta = 0
  }
  return payload
}

function pickProdutoColumns(input: AnyRecord): AnyRecord {
  const out: AnyRecord = {}
  for (const [key, value] of Object.entries(input)) {
    if (!PRODUTO_COLUMNS.has(key)) continue
    if (value === undefined) continue
    out[key] = value
  }
  return out
}

function sanitizeProdutoPayload(input: AnyRecord, options: { criando?: boolean } = {}): AnyRecord {
  const payload = normalizeEmptyValues(pickProdutoColumns(input))
  for (const key of Object.keys(payload)) {
    if (NUMERIC_COLUMNS.has(key) && payload[key] !== null && payload[key] !== '') payload[key] = Number(payload[key] || 0)
    if (BOOLEAN_COLUMNS.has(key) && payload[key] !== null) payload[key] = Boolean(payload[key])
  }

  const custoKeys = ['custo_base','custo_frete','custo_taxas','custo_embalagem','custo_operacional','custo_outros']
  const temCustoDetalhado = custoKeys.some((key) => key in payload)
  const custoDetalhado = custoKeys.reduce((sum, key) => sum + Number(payload[key] || 0), 0)
  if (temCustoDetalhado && custoDetalhado > 0) payload.custo_total = Number(custoDetalhado.toFixed(2))

  if (!payload.preco_manual && (!payload.preco_venda || Number(payload.preco_venda) <= 0) && Number(payload.custo_total || 0) > 0) {
    const margem = Number(payload.margem_aplicada ?? 300)
    payload.preco_venda = Number((Number(payload.custo_total) * (1 + margem / 100)).toFixed(2))
  }

  if (options.criando) {
    payload.ativo = payload.ativo ?? true
    payload.disponivel = payload.disponivel ?? true
    payload.destaque = Boolean(payload.destaque)
    payload.aparece_no_atendimento = payload.aparece_no_atendimento ?? true
    payload.setor_producao = payload.setor_producao || 'balcao'
  }

  return recalcularIndicadores(payload)
}

export const ProdutosService = {
  async listar(search?: string): Promise<Produto[]> {
    const empresaId = await getEmpresaId()
    let q = db().from('produtos').select('*, ficha_tecnica(*), estoque:produto_estoque(*)').eq('empresa_id', empresaId).eq('ativo', true).order('nome')
    if (search?.trim()) q = q.ilike('nome', `%${search.trim()}%`)
    const { data, error } = await q
    if (error) throw normalizeError(error, 'Erro ao listar produtos.')
    return (data ?? []) as Produto[]
  },
  async buscarPorId(id: string): Promise<Produto | null> {
    const empresaId = await getEmpresaId()
    const { data, error } = await db().from('produtos').select('*, ficha_tecnica(*), estoque:produto_estoque(*)').eq('empresa_id', empresaId).eq('id', id).maybeSingle()
    if (error) throw normalizeError(error, 'Erro ao buscar produto.')
    return data as Produto | null
  },
  async historicoPrecos(produtoId: string) {
    const empresaId = await getEmpresaId()
    const { data, error } = await db().from('historico_precos').select('*').eq('empresa_id', empresaId).eq('produto_id', produtoId).order('alterado_em', { ascending: false }).limit(50)
    if (error) return []
    return data ?? []
  },
  async rankingRentabilidade() {
    const empresaId = await getEmpresaId()
    const { data, error } = await db().from('produtos').select('*').eq('empresa_id', empresaId).eq('ativo', true).order('margem_bruta', { ascending: false }).limit(10)
    if (error) throw normalizeError(error, 'Erro ao carregar ranking de rentabilidade.')
    return data ?? []
  },
  async criar(form: ProdutoForm): Promise<Produto> {
    await assertPermission('produtos', 'criar')
    const payload = await withEmpresa(sanitizeProdutoPayload(form as any, { criando: true }))
    const { data, error } = await db().from('produtos').insert(payload).select().single()
    if (error) throw normalizeError(error, 'Erro ao cadastrar produto.')
    await AuditoriaService.registrar('produtos.criar', 'produtos', data.id, { nome: data.nome, preco_venda: data.preco_venda }).catch(() => null)
    return data as Produto
  },
  async atualizar(id: string, form: Partial<ProdutoForm>): Promise<Produto> {
    await assertPermission('produtos', 'editar')
    const payload = sanitizeProdutoPayload({ ...form, updated_at: new Date().toISOString() })
    const empresaId = await getEmpresaId()
    const { data, error } = await db().from('produtos').update(payload).eq('empresa_id', empresaId).eq('id', id).select().maybeSingle()
    if (error) throw normalizeError(error, 'Erro ao atualizar produto.')
    if (!data) throw new Error('Produto não encontrado nesta empresa ou sem permissão para editar.')
    await AuditoriaService.registrar('produtos.editar', 'produtos', id, { campos: Object.keys(payload) }).catch(() => null)
    return data as Produto
  },
  async excluir(id: string): Promise<void> {
    await assertPermission('produtos', 'excluir')
    const empresaId = await getEmpresaId()
    const { error } = await db().from('produtos').update({ ativo: false, updated_at: new Date().toISOString() }).eq('empresa_id', empresaId).eq('id', id)
    if (error) throw normalizeError(error, 'Erro ao remover produto.')
    await AuditoriaService.registrar('produtos.excluir', 'produtos', id).catch(() => null)
  },
}
