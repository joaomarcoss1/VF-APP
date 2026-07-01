import type { FechamentoDiario } from '@/types'
import { db, getEmpresaId, normalizeEmptyValues, normalizeError, assertPermission, type AnyRecord } from './_base'
import { VendasService } from './vendas'
import { FinanceiroService } from './financeiro'
import { AuditoriaService } from './auditoria'

export const FechamentoService = {
  async listar(limit = 30): Promise<FechamentoDiario[]> {
    const { data, error } = await db().from('fechamentos_diarios').select('*').order('data_fechamento', { ascending: false }).limit(limit)
    if (error) throw normalizeError(error, 'Erro ao listar fechamentos.')
    return (data ?? []) as FechamentoDiario[]
  },
  async gerarResumo(dataFechamento: string): Promise<Omit<FechamentoDiario, 'id'|'empresa_id'|'created_at'|'updated_at'>> {
    const vendas = await VendasService.listarPorPeriodo(dataFechamento, dataFechamento)
    const lancamentos = await FinanceiroService.listar(dataFechamento, dataFechamento)
    const vendasValidas = vendas.filter(v => v.status !== 'cancelada' && v.status !== 'estornada')
    const totalVendas = vendasValidas.reduce((a, v) => a + Number(v.total || 0), 0)
    const receitas = lancamentos.filter(l => l.tipo === 'receita' && l.status !== 'cancelado').reduce((a, l) => a + Number(l.valor || 0), 0)
    const despesas = lancamentos.filter(l => l.tipo === 'despesa' && l.status !== 'cancelado').reduce((a, l) => a + Number(l.valor || 0), 0)
    const porPagamento = (forma: string) => vendasValidas.filter(v => v.forma_pagamento === forma).reduce((a, v) => a + Number(v.total || 0), 0)
    const outros = vendasValidas.filter(v => !['dinheiro','pix','cartao_credito','cartao_debito'].includes(String(v.forma_pagamento))).reduce((a, v) => a + Number(v.total || 0), 0)
    return { data_fechamento: dataFechamento, total_vendas: Number(totalVendas.toFixed(2)), total_receitas: Number((totalVendas + receitas).toFixed(2)), total_despesas: Number(despesas.toFixed(2)), saldo_final: Number((totalVendas + receitas - despesas).toFixed(2)), dinheiro: Number(porPagamento('dinheiro').toFixed(2)), pix: Number(porPagamento('pix').toFixed(2)), cartao_credito: Number(porPagamento('cartao_credito').toFixed(2)), cartao_debito: Number(porPagamento('cartao_debito').toFixed(2)), outros: Number(outros.toFixed(2)), observacoes: '', status: 'aberto' }
  },
  async salvar(payload: Partial<FechamentoDiario> & { data_fechamento: string }): Promise<FechamentoDiario> {
    await assertPermission('fechamento', 'criar')
    const empresaId = await getEmpresaId()
    const body = normalizeEmptyValues({ ...payload, empresa_id: empresaId, updated_at: new Date().toISOString() } as AnyRecord)
    const { data, error } = await db().from('fechamentos_diarios').upsert(body, { onConflict: 'empresa_id,data_fechamento' }).select().single()
    if (error) throw normalizeError(error, 'Erro ao salvar fechamento diário.')
    await AuditoriaService.registrar('fechamento.salvar', 'fechamentos_diarios', data.id, { data_fechamento: data.data_fechamento, saldo_final: data.saldo_final }).catch(() => null)
    return data as FechamentoDiario
  },
}
