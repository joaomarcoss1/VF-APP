import { db, getEmpresaId, normalizeError } from './_base'
import { FinanceiroService } from './financeiro'
import { ProdutosEstoqueService } from './estoque'
import { FoodService } from './food'
import { VarejoService } from './varejo'

export const RelatoriosService = {
  async vendasPorPeriodo(inicio: string, fim: string) {
    const empresaId = await getEmpresaId()
    const { data, error } = await db().from('vendas').select('*, itens:venda_itens(*), pagamentos:venda_pagamentos(*)').eq('empresa_id', empresaId).gte('data_venda', inicio).lte('data_venda', fim).order('data_venda', { ascending: false })
    if (error) throw normalizeError(error, 'Erro ao gerar relatório de vendas.')
    return data ?? []
  },
  async formasPagamento(inicio: string, fim: string) {
    const empresaId = await getEmpresaId()
    const { data, error } = await db().from('venda_pagamentos').select('forma_pagamento,valor,status,data_recebimento').eq('empresa_id', empresaId).gte('data_recebimento', inicio).lte('data_recebimento', fim)
    if (error) throw normalizeError(error, 'Erro ao gerar relatório por forma de pagamento.')
    const map = new Map<string, number>()
    for (const p of data ?? []) if ((p as any).status !== 'cancelado' && (p as any).status !== 'estornado') map.set((p as any).forma_pagamento, (map.get((p as any).forma_pagamento) || 0) + Number((p as any).valor || 0))
    return Array.from(map.entries()).map(([forma_pagamento, valor]) => ({ forma_pagamento, valor }))
  },
  async produtosMaisVendidos(inicio: string, fim: string) {
    const empresaId = await getEmpresaId()
    const { data, error } = await db().from('venda_itens').select('produto_id,produto_nome,quantidade,total,vendas!inner(data_venda,status)').eq('empresa_id', empresaId).gte('vendas.data_venda', inicio).lte('vendas.data_venda', fim)
    if (error) throw normalizeError(error, 'Erro ao gerar ranking de produtos.')
    const map = new Map<string, any>()
    for (const item of data ?? []) {
      if ((item as any).vendas?.status === 'cancelada' || (item as any).vendas?.status === 'estornada') continue
      const key = (item as any).produto_id || (item as any).produto_nome
      const acc = map.get(key) ?? { produto_id: (item as any).produto_id, produto_nome: (item as any).produto_nome, quantidade: 0, faturamento: 0 }
      acc.quantidade += Number((item as any).quantidade || 0)
      acc.faturamento += Number((item as any).total || 0)
      map.set(key, acc)
    }
    return Array.from(map.values()).sort((a, b) => b.faturamento - a.faturamento)
  },

  async vendasPorCanal(inicio: string, fim: string) {
    const vendas = await this.vendasPorPeriodo(inicio, fim)
    const map = new Map<string, { canal: string; quantidade: number; total: number }>()
    for (const venda of vendas as any[]) {
      if (['cancelada','estornada'].includes(String(venda.status))) continue
      const canal = venda.canal_venda || 'balcao'
      const acc = map.get(canal) ?? { canal, quantidade: 0, total: 0 }
      acc.quantidade += 1
      acc.total += Number(venda.total || 0)
      map.set(canal, acc)
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total)
  },
  async margemPorProduto(inicio: string, fim: string) {
    const produtos = await this.produtosMaisVendidos(inicio, fim)
    return (produtos as any[]).map((p) => ({ ...p, margem_estimada: Number(p.faturamento || 0) > 0 ? Number((((Number(p.faturamento || 0) - Number(p.custo || 0)) / Number(p.faturamento || 1)) * 100).toFixed(2)) : 0 }))
  },
  async cmvFood(inicio: string, fim: string) { return FoodService.relatorioCMV(inicio, fim) },
  async varejoSemGiro(dias = 90) { return VarejoService.produtosSemGiro(dias) },
  async osPorStatus(inicio?: string, fim?: string) {
    const empresaId = await getEmpresaId()
    let q = db().from('ordens_servico').select('status,valor_orcado,valor_final,data_abertura').eq('empresa_id', empresaId)
    if (inicio) q = q.gte('data_abertura', inicio)
    if (fim) q = q.lte('data_abertura', fim)
    const { data, error } = await q
    if (error) throw normalizeError(error, 'Erro ao gerar relatório de OS.')
    const map = new Map<string, { status: string; quantidade: number; valor: number }>()
    for (const os of data ?? []) {
      const row = os as any
      const status = row.status || 'aberta'
      const acc = map.get(status) ?? { status, quantidade: 0, valor: 0 }
      acc.quantidade += 1
      acc.valor += Number(row.valor_final || row.valor_orcado || 0)
      map.set(status, acc)
    }
    return Array.from(map.values()).sort((a, b) => b.quantidade - a.quantidade)
  },
  async estoqueBaixo() { return ProdutosEstoqueService.alertasRuptura() },
  async dre(inicio: string, fim: string) { return FinanceiroService.dre(inicio, fim) },
  async inadimplencia() {
    const empresaId = await getEmpresaId()
    const hoje = new Date().toISOString().split('T')[0]
    const { data, error } = await db().from('contas_receber').select('*').eq('empresa_id', empresaId).lt('data_vencimento', hoje).in('status', ['pendente','vencido']).order('data_vencimento')
    if (error) throw normalizeError(error, 'Erro ao carregar inadimplência.')
    return data ?? []
  },
  async diagnostico(inicio: string, fim: string) {
    const [vendas, formas, produtos, dre, estoqueBaixo, inadimplencia] = await Promise.all([this.vendasPorPeriodo(inicio, fim), this.formasPagamento(inicio, fim), this.produtosMaisVendidos(inicio, fim), this.dre(inicio, fim), this.estoqueBaixo(), this.inadimplencia()])
    return { vendas, formas_pagamento: formas, produtos_mais_vendidos: produtos, dre, estoque_baixo: estoqueBaixo, inadimplencia }
  },
}
