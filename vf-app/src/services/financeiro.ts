import type { ContaPagar, ContaReceber, LancamentoFinanceiro, LancamentoFinanceiroForm } from '@/types'
import { calcularDRE } from '@/lib/business-rules'
import { db, hojeISO, normalizeEmptyValues, normalizeError, withEmpresa, assertPermission, getEmpresaId, type AnyRecord } from './_base'
import { AuditoriaService } from './auditoria'

export const FinanceiroService = {
  async listar(inicio?: string, fim?: string): Promise<LancamentoFinanceiro[]> {
    let q = db().from('lancamentos_financeiros').select('*').order('data_vencimento', { ascending: false })
    if (inicio) q = q.gte('data_vencimento', inicio)
    if (fim) q = q.lte('data_vencimento', fim)
    const { data, error } = await q
    if (error) throw normalizeError(error, 'Erro ao listar lançamentos financeiros.')
    return (data ?? []) as LancamentoFinanceiro[]
  },
  async criar(form: LancamentoFinanceiroForm): Promise<LancamentoFinanceiro> {
    await assertPermission('financeiro', 'criar')
    const payload = await withEmpresa({ ...form, valor: Number(form.valor || 0), status: form.status || 'pendente' } as AnyRecord)
    const { data, error } = await db().from('lancamentos_financeiros').insert(payload).select().single()
    if (error) throw normalizeError(error, 'Erro ao criar lançamento financeiro.')
    await AuditoriaService.registrar('financeiro.lancamento.criar', 'lancamentos_financeiros', data.id, { tipo: data.tipo, valor: data.valor }).catch(() => null)
    return data as LancamentoFinanceiro
  },
  async atualizar(id: string, form: Partial<LancamentoFinanceiroForm>): Promise<LancamentoFinanceiro> {
    await assertPermission('financeiro', 'editar')
    const payload = normalizeEmptyValues({ ...form, updated_at: new Date().toISOString() } as AnyRecord)
    if (payload.valor !== undefined) payload.valor = Number(payload.valor || 0)
    const { data, error } = await db().from('lancamentos_financeiros').update(payload).eq('id', id).select().single()
    if (error) throw normalizeError(error, 'Erro ao atualizar lançamento financeiro.')
    await AuditoriaService.registrar('financeiro.lancamento.editar', 'lancamentos_financeiros', id, { campos: Object.keys(form) }).catch(() => null)
    return data as LancamentoFinanceiro
  },
  async excluir(id: string): Promise<void> {
    await assertPermission('financeiro', 'excluir')
    const { error } = await db().from('lancamentos_financeiros').update({ status: 'cancelado', updated_at: new Date().toISOString() }).eq('id', id)
    if (error) throw normalizeError(error, 'Erro ao cancelar lançamento financeiro.')
    await AuditoriaService.registrar('financeiro.lancamento.cancelar', 'lancamentos_financeiros', id).catch(() => null)
  },
  async marcarPago(id: string): Promise<void> {
    await assertPermission('financeiro', 'editar')
    const { error } = await db().from('lancamentos_financeiros').update({ status: 'pago', data_pagamento: hojeISO(), updated_at: new Date().toISOString() }).eq('id', id)
    if (error) throw normalizeError(error, 'Erro ao marcar lançamento como pago.')
    await AuditoriaService.registrar('financeiro.lancamento.pagar', 'lancamentos_financeiros', id).catch(() => null)
  },
  async caixaDiario(data = hojeISO()) {
    const empresaId = await getEmpresaId()
    const { data: lancamentos, error } = await db().from('lancamentos_financeiros').select('*').eq('empresa_id', empresaId).eq('data_pagamento', data).eq('status', 'pago')
    if (error) throw normalizeError(error, 'Erro ao montar caixa diário.')
    const entradas = (lancamentos ?? []).filter((l: any) => l.tipo === 'receita').reduce((a: number, l: any) => a + Number(l.valor || 0), 0)
    const saidas = (lancamentos ?? []).filter((l: any) => l.tipo === 'despesa').reduce((a: number, l: any) => a + Number(l.valor || 0), 0)
    const porForma = (lancamentos ?? []).reduce((acc: Record<string, number>, l: any) => {
      const key = l.forma_pagamento || 'outro'
      acc[key] = Number((acc[key] || 0) + Number(l.valor || 0))
      return acc
    }, {})
    return { data, entradas, saidas, saldo: entradas - saidas, por_forma_pagamento: porForma }
  },
  async dre(inicio: string, fim: string) {
    const empresaId = await getEmpresaId()
    const [{ data: vendas, error: vendasError }, { data: lancamentos, error: finError }] = await Promise.all([
      db().from('vendas').select('total,lucro,custo_unitario,quantidade,status,data_venda').eq('empresa_id', empresaId).gte('data_venda', inicio).lte('data_venda', fim),
      db().from('lancamentos_financeiros').select('tipo,categoria,valor,status,data_vencimento').eq('empresa_id', empresaId).gte('data_vencimento', inicio).lte('data_vencimento', fim).neq('status', 'cancelado'),
    ])
    if (vendasError) throw normalizeError(vendasError, 'Erro ao carregar vendas para DRE.')
    if (finError) throw normalizeError(finError, 'Erro ao carregar financeiro para DRE.')
    const vendasValidas = (vendas ?? []).filter((v: any) => v.status !== 'cancelada' && v.status !== 'estornada')
    const receitas = vendasValidas.reduce((a: number, v: any) => a + Number(v.total || 0), 0)
    const cmv = vendasValidas.reduce((a: number, v: any) => a + Number(v.total || 0) - Number(v.lucro || 0), 0)
    const despesas = (lancamentos ?? []).filter((l: any) => l.tipo === 'despesa')
    const despesasFixas = despesas.filter((d: any) => String(d.categoria || '').toLowerCase().includes('fix')).reduce((a: number, d: any) => a + Number(d.valor || 0), 0)
    const despesasVariaveis = despesas.reduce((a: number, d: any) => a + Number(d.valor || 0), 0) - despesasFixas
    return calcularDRE({ receitas, cmv, despesas_fixas: despesasFixas, despesas_variaveis: despesasVariaveis })
  },
  async conciliacao(inicio: string, fim: string) {
    const empresaId = await getEmpresaId()
    const [{ data: pagamentos }, { data: lancamentos }] = await Promise.all([
      db().from('venda_pagamentos').select('*').eq('empresa_id', empresaId).gte('data_recebimento', inicio).lte('data_recebimento', fim),
      db().from('lancamentos_financeiros').select('*').eq('empresa_id', empresaId).gte('data_pagamento', inicio).lte('data_pagamento', fim),
    ])
    const totalPagamentos = (pagamentos ?? []).reduce((a: number, p: any) => a + Number(p.valor || 0), 0)
    const totalReceitas = (lancamentos ?? []).filter((l: any) => l.tipo === 'receita' && l.status === 'pago').reduce((a: number, l: any) => a + Number(l.valor || 0), 0)
    return { periodo: { inicio, fim }, total_pagamentos: totalPagamentos, total_receitas: totalReceitas, diferenca: totalPagamentos - totalReceitas, conciliado: Math.abs(totalPagamentos - totalReceitas) <= 0.01 }
  },
  async exportarContador(inicio: string, fim: string) {
    const [lancamentos, pagar, receber] = await Promise.all([this.listar(inicio, fim), ContasPagarService.listar(inicio, fim), ContasReceberService.listar(inicio, fim)])
    return { gerado_em: new Date().toISOString(), periodo: { inicio, fim }, lancamentos, contas_pagar: pagar, contas_receber: receber }
  },
}

export const ContasPagarService = {
  async listar(inicio?: string, fim?: string): Promise<ContaPagar[]> {
    let q = db().from('contas_pagar').select('*').order('data_vencimento', { ascending: true })
    if (inicio) q = q.gte('data_vencimento', inicio)
    if (fim) q = q.lte('data_vencimento', fim)
    const { data, error } = await q
    if (error) throw normalizeError(error, 'Erro ao listar contas a pagar.')
    return (data ?? []) as ContaPagar[]
  },
  async salvar(form: Partial<ContaPagar> & { descricao: string; valor: number; data_vencimento: string }): Promise<ContaPagar> {
    await assertPermission('financeiro', 'criar')
    const payload = await withEmpresa({ ...form, valor: Number(form.valor || 0), status: form.status || 'pendente' } as AnyRecord)
    const { data, error } = await db().from('contas_pagar').insert(payload).select().single()
    if (error) throw normalizeError(error, 'Erro ao salvar conta a pagar.')
    await AuditoriaService.registrar('financeiro.conta_pagar.criar', 'contas_pagar', data.id, { descricao: data.descricao, valor: data.valor }).catch(() => null)
    return data as ContaPagar
  },
  async marcarPago(id: string): Promise<void> {
    await assertPermission('financeiro', 'editar')
    const { error } = await db().from('contas_pagar').update({ status: 'pago', data_pagamento: hojeISO(), updated_at: new Date().toISOString() }).eq('id', id)
    if (error) throw normalizeError(error, 'Erro ao marcar conta como paga.')
    await AuditoriaService.registrar('financeiro.conta_pagar.pagar', 'contas_pagar', id).catch(() => null)
  },
}

export const ContasReceberService = {
  async listar(inicio?: string, fim?: string): Promise<ContaReceber[]> {
    let q = db().from('contas_receber').select('*').order('data_vencimento', { ascending: true })
    if (inicio) q = q.gte('data_vencimento', inicio)
    if (fim) q = q.lte('data_vencimento', fim)
    const { data, error } = await q
    if (error) throw normalizeError(error, 'Erro ao listar contas a receber.')
    return (data ?? []) as ContaReceber[]
  },
  async salvar(form: Partial<ContaReceber> & { descricao: string; valor: number; data_vencimento: string }): Promise<ContaReceber> {
    await assertPermission('financeiro', 'criar')
    const payload = await withEmpresa({ ...form, valor: Number(form.valor || 0), status: form.status || 'pendente' } as AnyRecord)
    const { data, error } = await db().from('contas_receber').insert(payload).select().single()
    if (error) throw normalizeError(error, 'Erro ao salvar conta a receber.')
    await AuditoriaService.registrar('financeiro.conta_receber.criar', 'contas_receber', data.id, { descricao: data.descricao, valor: data.valor }).catch(() => null)
    return data as ContaReceber
  },
  async marcarRecebido(id: string): Promise<void> {
    await assertPermission('financeiro', 'editar')
    const { error } = await db().from('contas_receber').update({ status: 'recebido', data_recebimento: hojeISO(), updated_at: new Date().toISOString() }).eq('id', id)
    if (error) throw normalizeError(error, 'Erro ao marcar conta como recebida.')
    await AuditoriaService.registrar('financeiro.conta_receber.receber', 'contas_receber', id).catch(() => null)
  },
}
