import { db, getCurrentUserId, getEmpresaId, normalizeError, assertPermission, type AnyRecord } from './_base'
import { AuditoriaService } from './auditoria'

export type ImportacaoEstoqueRow = {
  produto?: string
  nome?: string
  codigo_barras?: string
  codigo?: string
  sku?: string
  categoria?: string
  quantidade?: string | number
  quantidade_atual?: string | number
  valor_custo?: string | number
  custo?: string | number
  valor_venda?: string | number
  preco_venda?: string | number
  estoque_minimo?: string | number
  fornecedor?: string
  observacao?: string
}

export type ImportacaoValidada = { linhas: AnyRecord[]; erros: Array<{ linha: number; campo: string; erro: string }>; linhasValidas: number; linhasComErro: number; total: number }

function normalizeKey(key: string): string {
  return key.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
}

function pick(row: AnyRecord, key?: string): any {
  return key ? row[key] : undefined
}

function money(value: unknown): number {
  if (typeof value === 'number') return value
  return Number(String(value ?? '').replace(/R\$/gi, '').replace(/\./g, '').replace(',', '.').replace(/[^0-9.-]/g, '')) || 0
}

function num(value: unknown): number {
  if (typeof value === 'number') return value
  return Number(String(value ?? '').replace(',', '.').replace(/[^0-9.-]/g, '')) || 0
}

export const ImportacaoEstoqueService = {
  detectarColunas(rows: AnyRecord[]) {
    const headers = Object.keys(rows[0] || {})
    const map: Record<string, string> = {}
    for (const h of headers) {
      const k = normalizeKey(h)
      if (['produto','nome','nome_produto','descricao_produto'].includes(k)) map.produto = h
      if (['codigo_barras','codigo','ean','barcode'].includes(k)) map.codigo_barras = h
      if (['sku','referencia','codigo_sku'].includes(k)) map.sku = h
      if (['categoria','grupo'].includes(k)) map.categoria = h
      if (['quantidade','qtd','quantidade_atual','estoque'].includes(k)) map.quantidade = h
      if (['valor_custo','custo','custo_unitario','preco_custo'].includes(k)) map.valor_custo = h
      if (['valor_venda','preco_venda','preco','valor'].includes(k)) map.valor_venda = h
      if (['estoque_minimo','minimo'].includes(k)) map.estoque_minimo = h
      if (['fornecedor'].includes(k)) map.fornecedor = h
      if (['observacao','observacoes'].includes(k)) map.observacao = h
    }
    return map
  },
  validarLinhas(rows: AnyRecord[], mapping?: Record<string, string>): ImportacaoValidada {
    const map = mapping || this.detectarColunas(rows)
    const erros: Array<{ linha: number; campo: string; erro: string }> = []
    const linhas = rows.map((row, idx) => {
      const linha = idx + 2
      const out: AnyRecord = {
        produto: pick(row, map.produto) ?? row.produto ?? row.nome,
        codigo_barras: pick(row, map.codigo_barras) ?? row.codigo_barras ?? row.codigo,
        sku: pick(row, map.sku) ?? row.sku,
        categoria: pick(row, map.categoria) ?? row.categoria ?? 'produto',
        quantidade: pick(row, map.quantidade) ?? row.quantidade ?? row.quantidade_atual,
        valor_custo: pick(row, map.valor_custo) ?? row.valor_custo ?? row.custo,
        valor_venda: pick(row, map.valor_venda) ?? row.valor_venda ?? row.preco_venda,
        estoque_minimo: pick(row, map.estoque_minimo) ?? row.estoque_minimo,
        fornecedor: pick(row, map.fornecedor) ?? row.fornecedor,
        observacao: pick(row, map.observacao) ?? row.observacao ?? row.observacoes,
      }
      if (!out.produto && !out.codigo_barras && !out.sku) erros.push({ linha, campo: 'produto', erro: 'Informe produto, SKU ou código de barras.' })
      if (out.quantidade === undefined || out.quantidade === '' || Number.isNaN(num(out.quantidade))) erros.push({ linha, campo: 'quantidade', erro: 'Quantidade inválida.' })
      if (out.valor_venda !== undefined && out.valor_venda !== '' && Number.isNaN(money(out.valor_venda))) erros.push({ linha, campo: 'valor_venda', erro: 'Valor de venda inválido.' })
      return out
    })
    const linhasComErro = new Set(erros.map(e => e.linha))
    return { linhas, erros, linhasValidas: linhas.length - linhasComErro.size, linhasComErro: linhasComErro.size, total: linhas.length }
  },
  async importarProdutosEstoque(rows: AnyRecord[], mapping?: Record<string, string>) {
    await assertPermission('estoque', 'editar')
    const empresaId = await getEmpresaId()
    const usuarioId = await getCurrentUserId()
    const validacao = this.validarLinhas(rows, mapping)
    if (!validacao.linhasValidas) throw new Error('Nenhuma linha válida para importar.')
    const resultados: AnyRecord[] = []
    const erros: AnyRecord[] = [...validacao.erros]
    for (const [idx, row] of validacao.linhas.entries()) {
      if (validacao.erros.some(e => e.linha === idx + 2)) continue
      try {
        const codigo = String(row.codigo_barras || '').trim() || null
        const sku = String(row.sku || '').trim() || null
        let query = db().from('produtos').select('id,nome').eq('empresa_id', empresaId).limit(1)
        if (codigo) query = query.eq('codigo_barras', codigo)
        else if (sku) query = query.eq('sku', sku)
        else query = query.ilike('nome', String(row.produto))
        const { data: existente } = await query.maybeSingle()
        let produtoId = existente?.id
        const produtoPayload: AnyRecord = { empresa_id: empresaId, nome: row.produto || existente?.nome || sku || codigo, categoria: row.categoria || 'produto', sku, codigo_barras: codigo, custo_total: money(row.valor_custo), preco_venda: money(row.valor_venda), estoque_minimo: num(row.estoque_minimo), ativo: true, disponivel: true, destaque: false, tempo_preparo_min: 0, rendimento: 1, unidade_rendimento: 'unidade', margem_aplicada: 0, updated_at: new Date().toISOString() }
        if (!produtoId) {
          const { data, error } = await db().from('produtos').insert(produtoPayload).select('id').single()
          if (error) throw error
          produtoId = data.id
        } else {
          const { error } = await db().from('produtos').update(produtoPayload).eq('empresa_id', empresaId).eq('id', produtoId)
          if (error) throw error
        }
        const estoquePayload = { empresa_id: empresaId, produto_id: produtoId, quantidade_atual: num(row.quantidade), estoque_minimo: num(row.estoque_minimo), custo_medio: money(row.valor_custo), updated_at: new Date().toISOString() }
        const { error: estoqueError } = await db().from('produto_estoque').upsert(estoquePayload, { onConflict: 'empresa_id,produto_id' })
        if (estoqueError) throw estoqueError
        await db().from('movimentacoes_produto_estoque').insert({ empresa_id: empresaId, produto_id: produtoId, tipo: 'ajuste', quantidade: num(row.quantidade), custo_unitario: money(row.valor_custo), custo_total: num(row.quantidade) * money(row.valor_custo), motivo: 'Importação de estoque por arquivo', documento: `IMPORT-${Date.now()}`, usuario_id: usuarioId })
        resultados.push({ produto_id: produtoId, nome: row.produto, quantidade: num(row.quantidade) })
      } catch (error) {
        erros.push({ linha: idx + 2, campo: 'importacao', erro: error instanceof Error ? error.message : String(error) })
      }
    }
    const { data: historico } = await db().from('importacoes_estoque').insert({ empresa_id: empresaId, usuario_id: usuarioId, tipo_arquivo: 'xlsx_csv_pdf', nome_arquivo: 'importacao_estoque', status: erros.length ? 'processada_com_erros' : 'processada', total_linhas: validacao.total, linhas_validas: resultados.length, linhas_com_erro: erros.length, erros, resumo: { importados: resultados.length }, processed_at: new Date().toISOString() }).select('*').single()
    await AuditoriaService.registrar('importacao.estoque', 'importacoes_estoque', historico?.id, { importados: resultados.length, erros: erros.length }).catch(() => null)
    return { historico, resultados, erros }
  },
}
