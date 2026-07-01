import type { ProdutoVariacao, ProdutoVariacaoEstoque } from '@/types'
import { calcularMovimentoEstoque, validarMotivoObrigatorio } from '@/lib/business-rules'
import { db, getCurrentUserId, getEmpresaId, normalizeEmptyValues, normalizeError, withEmpresa, assertPermission, type AnyRecord } from './_base'
import { AuditoriaService } from './auditoria'

export const VarejoService = {
  async listarVariacoes(produtoId?: string): Promise<ProdutoVariacao[]> {
    let q = db().from('produto_variacoes').select('*').eq('ativo', true).order('created_at', { ascending: false })
    if (produtoId) q = q.eq('produto_id', produtoId)
    const { data, error } = await q
    if (error) throw normalizeError(error, 'Erro ao listar variações de produto.')
    return (data ?? []) as ProdutoVariacao[]
  },

  async salvarVariacao(form: Partial<ProdutoVariacao> & { produto_id: string }): Promise<ProdutoVariacao> {
    await assertPermission('produtos', form.id ? 'editar' : 'criar')
    const payload = await withEmpresa(normalizeEmptyValues({ ...form, ativo: form.ativo ?? true, updated_at: new Date().toISOString() } as AnyRecord))
    const request = form.id
      ? db().from('produto_variacoes').update(payload).eq('id', form.id).select().single()
      : db().from('produto_variacoes').insert(payload).select().single()
    const { data, error } = await request
    if (error) throw normalizeError(error, 'Erro ao salvar variação de produto.')
    await AuditoriaService.registrar(form.id ? 'varejo.variacao.editar' : 'varejo.variacao.criar', 'produto_variacoes', data.id, { produto_id: form.produto_id, sku: form.sku }).catch(() => null)
    return data as ProdutoVariacao
  },

  async desativarVariacao(id: string): Promise<void> {
    await assertPermission('produtos', 'excluir')
    const { error } = await db().from('produto_variacoes').update({ ativo: false, updated_at: new Date().toISOString() }).eq('id', id)
    if (error) throw normalizeError(error, 'Erro ao desativar variação.')
    await AuditoriaService.registrar('varejo.variacao.desativar', 'produto_variacoes', id).catch(() => null)
  },

  async estoqueVariacoes(produtoId?: string): Promise<ProdutoVariacaoEstoque[]> {
    let q = db().from('produto_variacao_estoque').select('*, variacao:produto_variacoes(*)').order('updated_at', { ascending: false })
    if (produtoId) q = q.eq('variacao.produto_id', produtoId)
    const { data, error } = await q
    if (error) throw normalizeError(error, 'Erro ao listar estoque por variação.')
    return (data ?? []) as ProdutoVariacaoEstoque[]
  },

  async movimentarVariacao(form: { variacao_id: string; tipo: 'entrada' | 'saida' | 'ajuste' | 'perda' | 'transferencia'; quantidade: number; motivo: string; custo_unitario?: number; documento?: string }) {
    await assertPermission('estoque', form.tipo === 'saida' ? 'editar' : 'criar')
    const empresaId = await getEmpresaId()
    const usuarioId = await getCurrentUserId()
    const motivo = validarMotivoObrigatorio(form.motivo, 'movimentação de variação')
    const { data: atual } = await db().from('produto_variacao_estoque').select('*').eq('empresa_id', empresaId).eq('variacao_id', form.variacao_id).maybeSingle()
    calcularMovimentoEstoque({ saldo_atual: Number((atual as AnyRecord | null)?.quantidade_atual || 0), quantidade: form.quantidade, tipo: form.tipo, custo_medio_atual: Number((atual as AnyRecord | null)?.custo_medio || 0), custo_unitario: Number(form.custo_unitario || 0) })
    const payload = { empresa_id: empresaId, ...form, motivo, custo_total: Number(form.quantidade || 0) * Number(form.custo_unitario || 0), usuario_id: usuarioId }
    const { data, error } = await db().from('movimentacoes_variacao_estoque').insert(payload).select().single()
    if (error) throw normalizeError(error, 'Erro ao movimentar estoque da variação.')
    await AuditoriaService.registrar(`varejo.variacao_estoque.${form.tipo}`, 'movimentacoes_variacao_estoque', data.id, { variacao_id: form.variacao_id, quantidade: form.quantidade }).catch(() => null)
    return data
  },

  async produtosSemGiro(dias = 90) {
    await assertPermission('relatorios', 'ver')
    const empresaId = await getEmpresaId()
    const desde = new Date(Date.now() - dias * 86400000).toISOString()
    const { data, error } = await db().from('produto_variacao_estoque').select('*, variacao:produto_variacoes(*), movimentos:movimentacoes_variacao_estoque(created_at)').eq('empresa_id', empresaId).lt('updated_at', desde)
    if (error) throw normalizeError(error, 'Erro ao listar variações sem giro.')
    return data ?? []
  },
}
