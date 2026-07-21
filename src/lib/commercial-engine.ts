import type { Agendamento, Cliente, ContaPagar, ContaReceber, Despesa, Insumo, LancamentoFinanceiro, Produto, ProdutoEstoque, Venda, VendaItem } from '@/types'
import type { FeatureKey } from '@/lib/modules'

export type InsightNivel = 'positivo' | 'info' | 'alerta' | 'critico'

export type DiagnosticoInsight = {
  nivel: InsightNivel
  area: 'financeiro' | 'vendas' | 'estoque' | 'clientes' | 'margem' | 'operacao'
  titulo: string
  descricao: string
  acao: string
  impacto: 'baixo' | 'medio' | 'alto'
}

export type FinancialSummary = {
  entradas: number
  saidas: number
  saldo: number
  vendasTotal: number
  receitasExtras: number
  despesasExtras: number
  despesasFixas: number
  contasPagarPendentes: number
  contasReceberPendentes: number
  vencidasPagar: number
  vencidasReceber: number
  lucroBruto: number
  lucroLiquido: number
  margemLiquidaPct: number
  dre: DreResumo
}

export type DreResumo = {
  receitaBruta: number
  descontos: number
  receitaLiquida: number
  custoProdutosServicos: number
  lucroBruto: number
  despesasOperacionais: number
  lucroOperacional: number
  margemBrutaPct: number
  margemLiquidaPct: number
}

export type CurvaABCItem = {
  id: string
  nome: string
  valor: number
  percentual: number
  acumulado: number
  classe: 'A' | 'B' | 'C'
}

export type PlanoCodigo = 'free' | 'essencial' | 'profissional' | 'premium' | 'enterprise'

export const PLAN_LIMITS: Record<PlanoCodigo, { label: string; produtos: number | null; usuarios: number | null; vendas_mes: number | null; agendamentos_mes: number | null; ia_dia: number | null; modulos: FeatureKey[] | ['*'] }> = {
  free: { label: 'Teste/Free', produtos: 20, usuarios: 1, vendas_mes: 60, agendamentos_mes: 30, ia_dia: 3, modulos: ['dashboard','produtos','vendas','clientes','financeiro','configuracoes'] },
  essencial: { label: 'Essencial', produtos: 100, usuarios: 3, vendas_mes: 800, agendamentos_mes: 200, ia_dia: 10, modulos: ['dashboard','produtos','vendas','clientes','financeiro','comprovantes','relatorios','configuracoes'] },
  profissional: { label: 'Profissional', produtos: 500, usuarios: 8, vendas_mes: 5000, agendamentos_mes: 1000, ia_dia: 25, modulos: ['dashboard','produtos','vendas','clientes','financeiro','comprovantes','relatorios','estoque','notas-fiscais','fornecedores','agendamentos','ordens-servico','equipe','fechamento','despesas','configuracoes','diagnostico'] },
  premium: { label: 'Premium', produtos: null, usuarios: 20, vendas_mes: null, agendamentos_mes: null, ia_dia: 80, modulos: ['*'] },
  enterprise: { label: 'Enterprise', produtos: null, usuarios: null, vendas_mes: null, agendamentos_mes: null, ia_dia: null, modulos: ['*'] },
}

function n(value: unknown): number {
  const num = Number(value ?? 0)
  return Number.isFinite(num) ? num : 0
}

function todayISO(): string {
  return new Date().toISOString().split('T')[0]
}

function isOverdue(date?: string | null): boolean {
  return Boolean(date && date < todayISO())
}

export function calcularDreSimples(input: { vendas?: Venda[]; lancamentos?: LancamentoFinanceiro[]; despesas?: Despesa[]; contasPagar?: ContaPagar[] }): DreResumo {
  const vendas = input.vendas ?? []
  const lancamentos = input.lancamentos ?? []
  const despesas = input.despesas ?? []
  const contasPagar = input.contasPagar ?? []
  const receitaVendas = vendas.filter(v => v.status !== 'cancelada' && v.status !== 'estornada').reduce((acc, v) => acc + n(v.total), 0)
  const descontos = vendas.reduce((acc, v) => acc + n(v.desconto), 0)
  const receitasExtras = lancamentos.filter(l => l.tipo === 'receita' && l.status !== 'cancelado').reduce((acc, l) => acc + n(l.valor), 0)
  const receitaBruta = receitaVendas + receitasExtras
  const custoProdutosServicos = vendas.filter(v => v.status !== 'cancelada' && v.status !== 'estornada').reduce((acc, v) => acc + n(v.custo_unitario) * n(v.quantidade), 0)
  const despesasLancadas = lancamentos.filter(l => l.tipo === 'despesa' && l.status !== 'cancelado').reduce((acc, l) => acc + n(l.valor), 0)
  const despesasFixas = despesas.filter(d => d.ativa).reduce((acc, d) => acc + n(d.valor), 0)
  const contasPendentes = contasPagar.filter(c => c.status !== 'cancelado').reduce((acc, c) => acc + n(c.valor), 0)
  const despesasOperacionais = despesasLancadas + despesasFixas + contasPendentes
  const receitaLiquida = Math.max(0, receitaBruta - descontos)
  const lucroBruto = receitaLiquida - custoProdutosServicos
  const lucroOperacional = lucroBruto - despesasOperacionais
  return {
    receitaBruta,
    descontos,
    receitaLiquida,
    custoProdutosServicos,
    lucroBruto,
    despesasOperacionais,
    lucroOperacional,
    margemBrutaPct: receitaLiquida > 0 ? (lucroBruto / receitaLiquida) * 100 : 0,
    margemLiquidaPct: receitaLiquida > 0 ? (lucroOperacional / receitaLiquida) * 100 : 0,
  }
}

export function calcularResumoFinanceiro(input: { vendas?: Venda[]; lancamentos?: LancamentoFinanceiro[]; despesas?: Despesa[]; contasPagar?: ContaPagar[]; contasReceber?: ContaReceber[] }): FinancialSummary {
  const vendas = input.vendas ?? []
  const lancamentos = input.lancamentos ?? []
  const despesas = input.despesas ?? []
  const contasPagar = input.contasPagar ?? []
  const contasReceber = input.contasReceber ?? []
  const vendasTotal = vendas.filter(v => v.status !== 'cancelada' && v.status !== 'estornada').reduce((a, v) => a + n(v.total), 0)
  const receitasExtras = lancamentos.filter(l => l.tipo === 'receita' && l.status !== 'cancelado').reduce((a, l) => a + n(l.valor), 0)
  const despesasExtras = lancamentos.filter(l => l.tipo === 'despesa' && l.status !== 'cancelado').reduce((a, l) => a + n(l.valor), 0)
  const despesasFixas = despesas.filter(d => d.ativa).reduce((a, d) => a + n(d.valor), 0)
  const contasPagarPendentes = contasPagar.filter(c => c.status === 'pendente' || c.status === 'vencido').reduce((a, c) => a + n(c.valor), 0)
  const contasReceberPendentes = contasReceber.filter(c => c.status === 'pendente' || c.status === 'vencido').reduce((a, c) => a + n(c.valor), 0)
  const entradas = vendasTotal + receitasExtras + contasReceber.filter(c => c.status === 'recebido').reduce((a, c) => a + n(c.valor), 0)
  const saidas = despesasExtras + despesasFixas + contasPagar.filter(c => c.status === 'pago').reduce((a, c) => a + n(c.valor), 0)
  const dre = calcularDreSimples({ vendas, lancamentos, despesas, contasPagar })
  return {
    entradas,
    saidas,
    saldo: entradas - saidas,
    vendasTotal,
    receitasExtras,
    despesasExtras,
    despesasFixas,
    contasPagarPendentes,
    contasReceberPendentes,
    vencidasPagar: contasPagar.filter(c => (c.status === 'pendente' || c.status === 'vencido') && isOverdue(c.data_vencimento)).length,
    vencidasReceber: contasReceber.filter(c => (c.status === 'pendente' || c.status === 'vencido') && isOverdue(c.data_vencimento)).length,
    lucroBruto: dre.lucroBruto,
    lucroLiquido: dre.lucroOperacional,
    margemLiquidaPct: dre.margemLiquidaPct,
    dre,
  }
}

export function calcularCurvaABC<T extends { id?: string; nome?: string }>(items: T[], getValor: (item: T) => number): CurvaABCItem[] {
  const total = items.reduce((acc, item) => acc + Math.max(0, getValor(item)), 0)
  let acumulado = 0
  return [...items]
    .map(item => ({ item, valor: Math.max(0, getValor(item)) }))
    .sort((a, b) => b.valor - a.valor)
    .map(({ item, valor }) => {
      const percentual = total > 0 ? (valor / total) * 100 : 0
      acumulado += percentual
      const classe: 'A' | 'B' | 'C' = acumulado <= 80 ? 'A' : acumulado <= 95 ? 'B' : 'C'
      return { id: String(item.id ?? item.nome ?? Math.random()), nome: String(item.nome ?? 'Item'), valor, percentual, acumulado, classe }
    })
}

export function gerarDiagnosticoEmpresarial(input: {
  vendas?: Venda[]
  produtos?: Produto[]
  estoqueProdutos?: ProdutoEstoque[]
  insumos?: Insumo[]
  clientes?: Cliente[]
  agendamentos?: Agendamento[]
  lancamentos?: LancamentoFinanceiro[]
  despesas?: Despesa[]
  contasPagar?: ContaPagar[]
  contasReceber?: ContaReceber[]
}): { score: number; resumo: FinancialSummary; insights: DiagnosticoInsight[]; abcVendas: CurvaABCItem[] } {
  const vendas = input.vendas ?? []
  const produtos = input.produtos ?? []
  const estoqueProdutos = input.estoqueProdutos ?? []
  const clientes = input.clientes ?? []
  const resumo = calcularResumoFinanceiro(input)
  const insights: DiagnosticoInsight[] = []
  const vendasValidas = vendas.filter(v => v.status !== 'cancelada' && v.status !== 'estornada')
  const abcVendas = calcularCurvaABC(vendasValidas.map(v => ({ id: v.produto_id || v.id, nome: v.produto_nome, valor: n(v.total) })), v => v.valor)
  const produtoTop = abcVendas[0]

  if (resumo.lucroLiquido < 0) insights.push({ nivel: 'critico', area: 'financeiro', titulo: 'Lucro líquido negativo', descricao: `O período analisado está com saldo operacional negativo.`, acao: 'Revise despesas fixas, precificação e produtos com baixa margem.', impacto: 'alto' })
  else if (resumo.margemLiquidaPct >= 20) insights.push({ nivel: 'positivo', area: 'financeiro', titulo: 'Margem líquida saudável', descricao: `A margem líquida estimada está em ${resumo.margemLiquidaPct.toFixed(1)}%.`, acao: 'Mantenha o controle de custos e acompanhe a evolução semanal.', impacto: 'medio' })
  else insights.push({ nivel: 'alerta', area: 'financeiro', titulo: 'Margem líquida apertada', descricao: `A margem líquida estimada está em ${resumo.margemLiquidaPct.toFixed(1)}%.`, acao: 'Recalcule preços e identifique despesas que podem ser reduzidas.', impacto: 'medio' })

  if (produtoTop) insights.push({ nivel: 'positivo', area: 'vendas', titulo: `Produto/serviço destaque: ${produtoTop.nome}`, descricao: `Representa ${produtoTop.percentual.toFixed(1)}% do faturamento analisado.`, acao: 'Crie combos, promoções controladas ou destaque no catálogo.', impacto: 'medio' })
  if (!vendasValidas.length) insights.push({ nivel: 'alerta', area: 'vendas', titulo: 'Sem vendas no período', descricao: 'Não há vendas registradas no intervalo analisado.', acao: 'Registre vendas ou ajuste o filtro de período para obter diagnóstico real.', impacto: 'alto' })

  const produtosMargemBaixa = produtos.filter(p => n(p.preco_venda) > 0 && n(p.custo_total) > 0 && ((n(p.preco_venda) - n(p.custo_total)) / n(p.preco_venda)) * 100 < 25)
  if (produtosMargemBaixa.length) insights.push({ nivel: 'alerta', area: 'margem', titulo: `${produtosMargemBaixa.length} item(ns) com margem baixa`, descricao: 'Há produtos/serviços próximos do custo ou com lucro muito pequeno.', acao: 'Use o simulador de precificação para ajustar preço, frete, taxas e embalagem.', impacto: 'alto' })

  const estoqueCritico = estoqueProdutos.filter(e => n(e.estoque_minimo) > 0 && n(e.quantidade_atual) <= n(e.estoque_minimo))
  if (estoqueCritico.length) insights.push({ nivel: 'critico', area: 'estoque', titulo: `${estoqueCritico.length} produto(s) com estoque crítico`, descricao: 'Existe risco de perder vendas por falta de produto.', acao: 'Abra o módulo de notas/compras e abasteça os itens críticos.', impacto: 'alto' })
  const insumosCriticos = (input.insumos ?? []).filter(i => n(i.estoque_minimo) > 0 && n(i.estoque_atual) <= n(i.estoque_minimo))
  if (insumosCriticos.length) insights.push({ nivel: 'critico', area: 'estoque', titulo: `${insumosCriticos.length} insumo(s) abaixo do mínimo`, descricao: 'Fichas técnicas e produção podem ser afetadas.', acao: 'Lance uma nota de compra ou movimente entrada de estoque.', impacto: 'alto' })

  if (resumo.vencidasPagar > 0) insights.push({ nivel: 'critico', area: 'financeiro', titulo: `${resumo.vencidasPagar} conta(s) a pagar vencida(s)`, descricao: 'Existem compromissos financeiros atrasados.', acao: 'Priorize pagamentos críticos e reprograme despesas recorrentes.', impacto: 'alto' })
  if (resumo.vencidasReceber > 0) insights.push({ nivel: 'alerta', area: 'financeiro', titulo: `${resumo.vencidasReceber} conta(s) a receber vencida(s)`, descricao: 'Há dinheiro em aberto que poderia melhorar o caixa.', acao: 'Entre em contato com os clientes e envie lembretes de cobrança.', impacto: 'medio' })

  const clientesAtivos = clientes.filter(c => c.ativo !== false).length
  if (clientesAtivos > 0 && vendasValidas.length / clientesAtivos < 0.3) insights.push({ nivel: 'info', area: 'clientes', titulo: 'Base de clientes pouco ativada', descricao: 'Poucos clientes cadastrados compraram no período.', acao: 'Crie campanha de retorno via WhatsApp para clientes inativos.', impacto: 'medio' })

  const criticos = insights.filter(i => i.nivel === 'critico').length
  const alertas = insights.filter(i => i.nivel === 'alerta').length
  const score = Math.max(0, Math.min(100, 85 - criticos * 18 - alertas * 8 + (resumo.lucroLiquido > 0 ? 8 : 0) + (vendasValidas.length > 0 ? 5 : 0)))
  return { score, resumo, insights, abcVendas }
}

export function gerarCodigoDocumento(prefixo: string, numero?: number | string): string {
  const year = new Date().getFullYear()
  const seq = String(numero || Date.now().toString().slice(-6)).padStart(6, '0')
  return `${prefixo.toUpperCase()}-${year}-${seq}`
}
