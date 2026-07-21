import type { Produto } from '@/types'
import { barcodeDataUrl, detectBarcodeKind, generateInternalBarcode, isValidEAN13 } from '@/lib/barcode'
import { db, getEmpresaId, normalizeError, assertPermission } from './_base'
import { AuditoriaService } from './auditoria'

export type CodigoBarrasProduto = {
  id: string
  empresa_id: string
  produto_id: string
  codigo: string
  tipo_codigo: string
  principal: boolean
  origem: string
  created_at: string
  updated_at: string
}

export const CodigoBarrasService = {
  gerarCodigoInterno(empresaId?: string | null, produtoId?: string | null) {
    return generateInternalBarcode(empresaId, produtoId)
  },
  validarEAN13(value: string) { return isValidEAN13(value) },
  imagem(codigo: string, width = 260, height = 72) { return barcodeDataUrl(codigo, { width, height, text: true, kind: detectBarcodeKind(codigo) }) },
  async validarDuplicidade(codigo: string, produtoId?: string): Promise<void> {
    const empresaId = await getEmpresaId()
    const clean = codigo.trim()
    if (!clean) throw new Error('Informe um código válido.')
    const { data, error } = await db().from('codigos_barras_produtos').select('id, produto_id').eq('empresa_id', empresaId).eq('codigo', clean).maybeSingle()
    if (error) throw normalizeError(error, 'Erro ao validar código de barras.')
    if (data && (!produtoId || data.produto_id !== produtoId)) throw new Error('Este código já está vinculado a outro produto desta empresa.')
  },
  async listarPorProduto(produtoId: string): Promise<CodigoBarrasProduto[]> {
    const empresaId = await getEmpresaId()
    const { data, error } = await db().from('codigos_barras_produtos').select('*').eq('empresa_id', empresaId).eq('produto_id', produtoId).order('principal', { ascending: false })
    if (error) throw normalizeError(error, 'Erro ao listar códigos do produto.')
    return (data ?? []) as CodigoBarrasProduto[]
  },
  async vincularCodigo(produtoId: string, codigo: string, origem: 'manual' | 'gerado' | 'scanner' | 'importacao' = 'manual'): Promise<CodigoBarrasProduto> {
    await assertPermission('produtos', 'editar')
    const empresaId = await getEmpresaId()
    const clean = codigo.trim()
    await this.validarDuplicidade(clean, produtoId)
    const payload = { empresa_id: empresaId, produto_id: produtoId, codigo: clean, tipo_codigo: detectBarcodeKind(clean), principal: true, origem, updated_at: new Date().toISOString() }
    const { data, error } = await db().from('codigos_barras_produtos').upsert(payload, { onConflict: 'empresa_id,codigo' }).select('*').single()
    if (error) throw normalizeError(error, 'Erro ao vincular código de barras.')
    await db().from('produtos').update({ codigo_barras: clean, codigo_interno: clean, updated_at: new Date().toISOString() }).eq('empresa_id', empresaId).eq('id', produtoId)
    await AuditoriaService.registrar('codigo_barras.vincular', 'produtos', produtoId, { codigo: clean, origem }).catch(() => null)
    return data as CodigoBarrasProduto
  },
  async buscarProdutoPorCodigo(codigo: string): Promise<(Produto & { estoque?: any[]; codigos?: CodigoBarrasProduto[]; movimentacoes?: any[] }) | null> {
    const empresaId = await getEmpresaId()
    const clean = codigo.trim()
    if (!clean) return null
    const columns = '*, estoque:produto_estoque(*), codigos:codigos_barras_produtos(*), movimentacoes:movimentacoes_produto_estoque(*)'
    const { data: direto, error: erroDireto } = await db()
      .from('produtos')
      .select(columns)
      .eq('empresa_id', empresaId)
      .or(`codigo_barras.eq.${clean},sku.eq.${clean},codigo_interno.eq.${clean}`)
      .maybeSingle()
    if (erroDireto) throw normalizeError(erroDireto, 'Erro ao consultar produto por código.')
    if (direto) return direto as any
    const { data: vinculo, error } = await db().from('codigos_barras_produtos').select('produto_id').eq('empresa_id', empresaId).eq('codigo', clean).maybeSingle()
    if (error) throw normalizeError(error, 'Erro ao consultar vínculo de código.')
    if (!vinculo?.produto_id) return null
    const { data: produto, error: produtoError } = await db().from('produtos').select(columns).eq('empresa_id', empresaId).eq('id', vinculo.produto_id).maybeSingle()
    if (produtoError) throw normalizeError(produtoError, 'Erro ao carregar produto vinculado.')
    return produto as any
  },
}
