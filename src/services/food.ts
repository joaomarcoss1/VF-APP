import type { ProducaoLote } from '@/types'
import { calcularFichaTecnicaFood, sugerirPrecoPorMargem, validarMotivoObrigatorio, type FichaTecnicaItemOperacional } from '@/lib/business-rules'
import { db, getEmpresaId, normalizeError, assertPermission } from './_base'
import { AuditoriaService } from './auditoria'

export const FoodService = {
  async calcularFicha(itens: FichaTecnicaItemOperacional[], opcoes: { rendimento: number; margem_desejada?: number; perdas_percentual?: number }) {
    return calcularFichaTecnicaFood(itens, opcoes)
  },

  async sugerirPreco(custo: number, margemPercentual: number) {
    return sugerirPrecoPorMargem(custo, margemPercentual)
  },

  async registrarProducaoLote(form: { produto_id: string; quantidade_produzida: number; motivo: string; lote?: string; validade?: string; perdas_percentual?: number }): Promise<string> {
    await assertPermission('fichas', 'criar')
    const motivo = validarMotivoObrigatorio(form.motivo, 'produção em lote')
    const { data, error } = await db().rpc('vf_registrar_producao_lote', {
      p_produto_id: form.produto_id,
      p_quantidade: form.quantidade_produzida,
      p_motivo: motivo,
      p_lote: form.lote ?? null,
      p_validade: form.validade ?? null,
      p_perdas_percentual: form.perdas_percentual ?? 0,
    })
    if (error) throw normalizeError(error, 'Erro ao registrar produção em lote.')
    await AuditoriaService.registrar('food.producao_lote.service', 'producoes_lote', String(data), { produto_id: form.produto_id, quantidade: form.quantidade_produzida }).catch(() => null)
    return String(data)
  },

  async listarProducoes(limit = 100): Promise<ProducaoLote[]> {
    const empresaId = await getEmpresaId()
    const { data, error } = await db().from('producoes_lote').select('*, itens:producao_lote_itens(*)').eq('empresa_id', empresaId).order('data_producao', { ascending: false }).limit(limit)
    if (error) throw normalizeError(error, 'Erro ao listar produções em lote.')
    return (data ?? []) as ProducaoLote[]
  },

  async insumosVencendo(dias = 7) {
    await assertPermission('estoque', 'ver')
    const empresaId = await getEmpresaId()
    const hoje = new Date().toISOString().split('T')[0]
    const limite = new Date(Date.now() + dias * 86400000).toISOString().split('T')[0]
    const { data, error } = await db().from('insumos').select('*').eq('empresa_id', empresaId).eq('ativo', true).gte('data_vencimento', hoje).lte('data_vencimento', limite).order('data_vencimento')
    if (error) throw normalizeError(error, 'Erro ao listar insumos vencendo.')
    return data ?? []
  },

  async relatorioCMV(inicio: string, fim: string) {
    await assertPermission('relatorios', 'ver')
    const empresaId = await getEmpresaId()
    const { data, error } = await db().from('venda_itens').select('produto_id,produto_nome,quantidade,total,custo_unitario,vendas!inner(data_venda,status)').eq('empresa_id', empresaId).gte('vendas.data_venda', inicio).lte('vendas.data_venda', fim)
    if (error) throw normalizeError(error, 'Erro ao gerar relatório de CMV.')
    const map = new Map<string, { produto_id?: string; produto_nome: string; quantidade: number; faturamento: number; cmv: number }>()
    for (const item of data ?? []) {
      const row = item as any
      if (['cancelada','estornada'].includes(String(row.vendas?.status))) continue
      const key = row.produto_id || row.produto_nome
      const acc = map.get(key) ?? { produto_id: row.produto_id, produto_nome: row.produto_nome, quantidade: 0, faturamento: 0, cmv: 0 }
      acc.quantidade += Number(row.quantidade || 0)
      acc.faturamento += Number(row.total || 0)
      acc.cmv += Number(row.custo_unitario || 0) * Number(row.quantidade || 0)
      map.set(key, acc)
    }
    return Array.from(map.values()).map((row) => ({ ...row, cmv_percentual: row.faturamento > 0 ? Number(((row.cmv / row.faturamento) * 100).toFixed(2)) : 0 })).sort((a, b) => b.faturamento - a.faturamento)
  },
}
