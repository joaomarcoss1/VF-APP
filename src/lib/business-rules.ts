// ============================================================
// VF Nexus — Regras de negócio puras e testáveis
// Sem dependência de React/Supabase. Usado por services e testes.
// ============================================================

export type FormaPagamentoOperacional = 'dinheiro' | 'pix' | 'cartao_credito' | 'cartao_debito' | 'boleto' | 'transferencia' | 'outro'
export type AcaoOperacional = 'ver' | 'criar' | 'editar' | 'excluir' | 'cancelar' | 'estornar' | 'aprovar' | 'exportar' | 'administrar' | 'impersonar'

export type VendaItemOperacional = {
  produto_id?: string | null
  produto_nome: string
  quantidade: number
  preco_unitario: number
  custo_unitario?: number
  desconto?: number
}

export type VendaPagamentoOperacional = {
  forma_pagamento: FormaPagamentoOperacional | string
  valor: number
  valor_recebido?: number
  troco?: number
  status?: 'pendente' | 'confirmado' | 'cancelado' | 'estornado'
}

export type VendaCalculoInput = {
  itens: VendaItemOperacional[]
  desconto_geral?: number
  taxa_entrega?: number
  taxa_servico?: number
  pagamentos?: VendaPagamentoOperacional[]
  forma_pagamento?: FormaPagamentoOperacional | string
  valor_recebido?: number
}

export type VendaCalculoResultado = {
  itens: Array<VendaItemOperacional & { subtotal: number; total: number; lucro: number }>
  subtotal: number
  desconto_itens: number
  desconto_geral: number
  taxa_entrega: number
  taxa_servico: number
  total: number
  custo_total: number
  lucro: number
  quantidade_total: number
  pagamentos: VendaPagamentoOperacional[]
  total_pago: number
  troco: number
}

export function roundMoney(value: number): number {
  return Number((Number(value || 0) + Number.EPSILON).toFixed(2))
}

export function calcularVenda(input: VendaCalculoInput): VendaCalculoResultado {
  const itensBase = Array.isArray(input.itens) ? input.itens : []
  if (itensBase.length === 0) throw new Error('Adicione pelo menos um item à venda.')

  const itens = itensBase.map((item) => {
    const quantidade = Number(item.quantidade || 0)
    const precoUnitario = Number(item.preco_unitario || 0)
    const custoUnitario = Number(item.custo_unitario || 0)
    const desconto = Number(item.desconto || 0)
    if (!item.produto_nome?.trim()) throw new Error('Todo item da venda precisa ter nome.')
    if (quantidade <= 0) throw new Error(`Quantidade inválida para ${item.produto_nome}.`)
    if (precoUnitario < 0 || custoUnitario < 0 || desconto < 0) throw new Error(`Valores negativos não são permitidos em ${item.produto_nome}.`)
    const subtotal = roundMoney(quantidade * precoUnitario)
    const total = roundMoney(Math.max(0, subtotal - desconto))
    const lucro = roundMoney(total - quantidade * custoUnitario)
    return { ...item, quantidade, preco_unitario: precoUnitario, custo_unitario: custoUnitario, desconto, subtotal, total, lucro }
  })

  const subtotal = roundMoney(itens.reduce((acc, item) => acc + item.subtotal, 0))
  const descontoItens = roundMoney(itens.reduce((acc, item) => acc + Number(item.desconto || 0), 0))
  const descontoGeral = roundMoney(Number(input.desconto_geral || 0))
  const taxaEntrega = roundMoney(Number(input.taxa_entrega || 0))
  const taxaServico = roundMoney(Number(input.taxa_servico || 0))
  const totalItens = roundMoney(itens.reduce((acc, item) => acc + item.total, 0))
  const total = roundMoney(Math.max(0, totalItens + taxaEntrega + taxaServico - descontoGeral))
  const custoTotal = roundMoney(itens.reduce((acc, item) => acc + Number(item.custo_unitario || 0) * Number(item.quantidade || 0), 0))
  const lucro = roundMoney(total - custoTotal)
  const quantidadeTotal = roundMoney(itens.reduce((acc, item) => acc + Number(item.quantidade || 0), 0))

  const pagamentosInformados = input.pagamentos?.length
    ? input.pagamentos
    : [{ forma_pagamento: input.forma_pagamento || 'pix', valor: total, valor_recebido: input.valor_recebido }]

  const pagamentos = pagamentosInformados.map((pagamento) => {
    const valor = roundMoney(Number(pagamento.valor || 0))
    const valorRecebido = pagamento.forma_pagamento === 'dinheiro'
      ? roundMoney(Number(pagamento.valor_recebido ?? valor))
      : undefined
    const troco = pagamento.forma_pagamento === 'dinheiro'
      ? roundMoney(Math.max(0, Number(valorRecebido || 0) - valor))
      : 0
    if (valor <= 0) throw new Error('Toda forma de pagamento precisa ter valor maior que zero.')
    if (pagamento.forma_pagamento === 'dinheiro' && Number(valorRecebido || 0) < valor) {
      throw new Error('Valor recebido em dinheiro não pode ser menor que o valor pago nessa forma.')
    }
    return { ...pagamento, valor, valor_recebido: valorRecebido, troco, status: pagamento.status || 'confirmado' }
  })

  const totalPago = roundMoney(pagamentos.reduce((acc, pagamento) => acc + Number(pagamento.valor || 0), 0))
  if (Math.abs(totalPago - total) > 0.01) throw new Error(`A soma dos pagamentos (${roundMoney(totalPago)}) precisa ser igual ao total da venda (${roundMoney(total)}).`)
  const troco = roundMoney(pagamentos.reduce((acc, pagamento) => acc + Number(pagamento.troco || 0), 0))

  return { itens, subtotal, desconto_itens: descontoItens, desconto_geral: descontoGeral, taxa_entrega: taxaEntrega, taxa_servico: taxaServico, total, custo_total: custoTotal, lucro, quantidade_total: quantidadeTotal, pagamentos, total_pago: totalPago, troco }
}

export function validarMotivoObrigatorio(motivo: string | null | undefined, contexto = 'operação'): string {
  const clean = String(motivo || '').trim()
  if (clean.length < 5) throw new Error(`Informe um motivo obrigatório para ${contexto} com pelo menos 5 caracteres.`)
  return clean
}

export type MovimentoEstoqueInput = {
  saldo_atual: number
  quantidade: number
  tipo: 'entrada' | 'saida' | 'ajuste' | 'perda' | 'transferencia'
  custo_medio_atual?: number
  custo_unitario?: number
}

export function calcularMovimentoEstoque(input: MovimentoEstoqueInput): { novo_saldo: number; custo_medio: number } {
  const saldoAtual = Number(input.saldo_atual || 0)
  const quantidade = Number(input.quantidade || 0)
  if (quantidade <= 0) throw new Error('A quantidade da movimentação precisa ser maior que zero.')
  const custoMedioAtual = Number(input.custo_medio_atual || 0)
  const custoUnitario = Number(input.custo_unitario ?? custoMedioAtual)

  if (input.tipo === 'entrada') {
    const totalAtual = saldoAtual * custoMedioAtual
    const totalEntrada = quantidade * custoUnitario
    const novoSaldo = roundMoney(saldoAtual + quantidade)
    const custoMedio = novoSaldo > 0 ? roundMoney((totalAtual + totalEntrada) / novoSaldo) : roundMoney(custoUnitario)
    return { novo_saldo: novoSaldo, custo_medio: custoMedio }
  }

  if (input.tipo === 'ajuste') {
    return { novo_saldo: roundMoney(quantidade), custo_medio: roundMoney(custoUnitario) }
  }

  const novoSaldo = roundMoney(Math.max(0, saldoAtual - quantidade))
  return { novo_saldo: novoSaldo, custo_medio: roundMoney(custoMedioAtual) }
}

export type DreInput = {
  receitas: number
  deducoes?: number
  cmv?: number
  despesas_variaveis?: number
  despesas_fixas?: number
  impostos?: number
}

export function calcularDRE(input: DreInput) {
  const receitas = roundMoney(input.receitas)
  const deducoes = roundMoney(input.deducoes || 0)
  const receitaLiquida = roundMoney(receitas - deducoes)
  const cmv = roundMoney(input.cmv || 0)
  const lucroBruto = roundMoney(receitaLiquida - cmv)
  const despesasVariaveis = roundMoney(input.despesas_variaveis || 0)
  const despesasFixas = roundMoney(input.despesas_fixas || 0)
  const impostos = roundMoney(input.impostos || 0)
  const resultadoOperacional = roundMoney(lucroBruto - despesasVariaveis - despesasFixas - impostos)
  const margemBruta = receitaLiquida > 0 ? roundMoney((lucroBruto / receitaLiquida) * 100) : 0
  const margemLiquida = receitaLiquida > 0 ? roundMoney((resultadoOperacional / receitaLiquida) * 100) : 0
  return { receitas, deducoes, receita_liquida: receitaLiquida, cmv, lucro_bruto: lucroBruto, despesas_variaveis: despesasVariaveis, despesas_fixas: despesasFixas, impostos, resultado_operacional: resultadoOperacional, margem_bruta: margemBruta, margem_liquida: margemLiquida }
}

export type CompraItemOperacional = {
  tipo_item: 'produto' | 'insumo'
  nome: string
  quantidade: number
  custo_unitario: number
  frete_rateado?: number
  taxas_rateadas?: number
}

export function calcularCompra(itens: CompraItemOperacional[], acrescimos = { frete: 0, taxas: 0, desconto: 0 }) {
  if (!itens.length) throw new Error('Adicione pelo menos um item à compra.')
  const itensCalculados = itens.map((item) => {
    if (!item.nome?.trim()) throw new Error('Todo item de compra precisa ter nome.')
    if (Number(item.quantidade || 0) <= 0) throw new Error(`Quantidade inválida para ${item.nome}.`)
    const custoTotal = roundMoney(Number(item.quantidade || 0) * Number(item.custo_unitario || 0) + Number(item.frete_rateado || 0) + Number(item.taxas_rateadas || 0))
    return { ...item, custo_total: custoTotal }
  })
  const valorProdutos = roundMoney(itensCalculados.reduce((acc, item) => acc + item.custo_total, 0))
  const valorTotal = roundMoney(valorProdutos + Number(acrescimos.frete || 0) + Number(acrescimos.taxas || 0) - Number(acrescimos.desconto || 0))
  return { itens: itensCalculados, valor_produtos: valorProdutos, valor_total: valorTotal }
}

export function usuarioPodePorMatriz(role: string | null | undefined, acao: AcaoOperacional, modulo: string): boolean {
  const cargo = String(role || '').toLowerCase()
  if (cargo === 'dono' || cargo === 'administrador' || cargo === 'master_admin') return true
  const matrix: Record<string, Record<string, AcaoOperacional[]>> = {
    gerente: { '*': ['ver','criar','editar','cancelar','estornar','aprovar','exportar'] },
    financeiro: { financeiro: ['ver','criar','editar','estornar','aprovar','exportar'], relatorios: ['ver','exportar'], vendas: ['ver'], despesas: ['ver','criar','editar'] },
    vendedor: { vendas: ['ver','criar'], clientes: ['ver','criar','editar'], produtos: ['ver'], comprovantes: ['ver','criar'] },
    atendente: { vendas: ['ver','criar'], clientes: ['ver','criar'], agendamentos: ['ver','criar','editar'], comprovantes: ['ver','criar'] },
    operacional: { estoque: ['ver','criar','editar'], produtos: ['ver'], compras: ['ver','criar'], 'ordens-servico': ['ver','criar','editar'] },
    contador: { financeiro: ['ver','exportar'], relatorios: ['ver','exportar'], vendas: ['ver'], despesas: ['ver'], 'notas-fiscais': ['ver'] },
  }
  const rules = matrix[cargo]
  return Boolean(rules?.['*']?.includes(acao) || rules?.[modulo]?.includes(acao))
}

// ============================================================
// V8 — Regras adicionais para Food, Varejo, Serviços e Inventário
// ============================================================

export type FichaTecnicaItemOperacional = {
  nome: string
  quantidade: number
  custo_unitario: number
  perda_percentual?: number
}

export function calcularFichaTecnicaFood(itens: FichaTecnicaItemOperacional[], opcoes: { rendimento: number; margem_desejada?: number; perdas_percentual?: number } = { rendimento: 1 }) {
  if (!itens.length) throw new Error('Adicione pelo menos um insumo à ficha técnica.')
  const rendimento = Number(opcoes.rendimento || 0)
  if (rendimento <= 0) throw new Error('O rendimento da ficha técnica precisa ser maior que zero.')
  const perdasGerais = Number(opcoes.perdas_percentual || 0)
  const itensCalculados = itens.map((item) => {
    if (!item.nome?.trim()) throw new Error('Todo insumo da ficha técnica precisa ter nome.')
    const quantidade = Number(item.quantidade || 0)
    const custoUnitario = Number(item.custo_unitario || 0)
    const perdaPercentual = Number(item.perda_percentual ?? perdasGerais)
    if (quantidade <= 0) throw new Error(`Quantidade inválida para ${item.nome}.`)
    if (custoUnitario < 0 || perdaPercentual < 0) throw new Error(`Valores negativos não são permitidos em ${item.nome}.`)
    const quantidadeComPerda = roundMoney(quantidade * (1 + perdaPercentual / 100))
    const custo_total = roundMoney(quantidadeComPerda * custoUnitario)
    return { ...item, quantidade, custo_unitario: custoUnitario, perda_percentual: perdaPercentual, quantidade_com_perda: quantidadeComPerda, custo_total }
  })
  const custoTotal = roundMoney(itensCalculados.reduce((acc, item) => acc + item.custo_total, 0))
  const custoPorPorcao = roundMoney(custoTotal / rendimento)
  const margem = Number(opcoes.margem_desejada || 0)
  const precoSugerido = margem > 0 ? sugerirPrecoPorMargem(custoPorPorcao, margem).preco_sugerido : custoPorPorcao
  const cmvPercentual = precoSugerido > 0 ? roundMoney((custoPorPorcao / precoSugerido) * 100) : 0
  return { itens: itensCalculados, rendimento, custo_total: custoTotal, custo_por_porcao: custoPorPorcao, margem_desejada: margem, preco_sugerido: precoSugerido, cmv_percentual: cmvPercentual }
}

export function sugerirPrecoPorMargem(custo: number, margemPercentual: number) {
  const custoTotal = roundMoney(custo)
  const margem = Number(margemPercentual || 0)
  if (custoTotal < 0) throw new Error('Custo não pode ser negativo.')
  if (margem <= 0 || margem >= 100) throw new Error('Margem desejada precisa ser maior que 0 e menor que 100%.')
  const precoSugerido = roundMoney(custoTotal / (1 - margem / 100))
  const lucro = roundMoney(precoSugerido - custoTotal)
  return { custo: custoTotal, margem_percentual: margem, preco_sugerido: precoSugerido, lucro_bruto: lucro, cmv_percentual: roundMoney((custoTotal / precoSugerido) * 100) }
}

export type InventarioItemOperacional = {
  item_id: string
  nome: string
  saldo_sistema: number
  saldo_contado: number
  custo_medio?: number
}

export function calcularDivergenciaInventario(itens: InventarioItemOperacional[]) {
  if (!itens.length) throw new Error('Adicione pelo menos um item ao inventário.')
  const linhas = itens.map((item) => {
    if (!item.item_id) throw new Error('Todo item do inventário precisa ter identificador.')
    const saldoSistema = Number(item.saldo_sistema || 0)
    const saldoContado = Number(item.saldo_contado || 0)
    const custoMedio = Number(item.custo_medio || 0)
    const divergencia = roundMoney(saldoContado - saldoSistema)
    return { ...item, saldo_sistema: saldoSistema, saldo_contado: saldoContado, custo_medio: custoMedio, divergencia, valor_divergencia: roundMoney(divergencia * custoMedio), precisa_ajuste: Math.abs(divergencia) > 0.0001 }
  })
  return { itens: linhas, total_itens: linhas.length, itens_com_divergencia: linhas.filter((i) => i.precisa_ajuste).length, valor_divergencia_total: roundMoney(linhas.reduce((acc, item) => acc + item.valor_divergencia, 0)) }
}

export type OrdemServicoOperacional = {
  valor_servico?: number
  valor_materiais?: number
  desconto?: number
  taxa_deslocamento?: number
  checklist?: Array<{ titulo: string; concluido: boolean }>
}

export function calcularOrdemServico(input: OrdemServicoOperacional) {
  const valorServico = roundMoney(Number(input.valor_servico || 0))
  const valorMateriais = roundMoney(Number(input.valor_materiais || 0))
  const desconto = roundMoney(Number(input.desconto || 0))
  const taxaDeslocamento = roundMoney(Number(input.taxa_deslocamento || 0))
  if ([valorServico, valorMateriais, desconto, taxaDeslocamento].some((v) => v < 0)) throw new Error('Valores negativos não são permitidos na OS.')
  const total = roundMoney(Math.max(0, valorServico + valorMateriais + taxaDeslocamento - desconto))
  const lucroEstimado = roundMoney(total - valorMateriais)
  const checklist = input.checklist ?? []
  const concluidos = checklist.filter((item) => item.concluido).length
  const progresso = checklist.length ? roundMoney((concluidos / checklist.length) * 100) : 0
  return { valor_servico: valorServico, valor_materiais: valorMateriais, desconto, taxa_deslocamento: taxaDeslocamento, total, lucro_estimado: lucroEstimado, checklist_total: checklist.length, checklist_concluido: concluidos, progresso_percentual: progresso }
}

export function classificarSaudeOperacional(metricas: { caixa?: number; margem_liquida?: number; estoque_ruptura?: number; inadimplencia?: number; crescimento_vendas?: number }) {
  const alertas: string[] = []
  const caixa = Number(metricas.caixa || 0)
  const margem = Number(metricas.margem_liquida || 0)
  const ruptura = Number(metricas.estoque_ruptura || 0)
  const inadimplencia = Number(metricas.inadimplencia || 0)
  const crescimento = Number(metricas.crescimento_vendas || 0)
  if (caixa < 0) alertas.push('Caixa negativo no período.')
  if (margem < 10) alertas.push('Margem líquida abaixo de 10%.')
  if (ruptura > 0) alertas.push(`${ruptura} item(ns) em ruptura ou abaixo do mínimo.`)
  if (inadimplencia > 0) alertas.push(`Existem R$ ${roundMoney(inadimplencia)} em recebíveis vencidos.`)
  if (crescimento < -10) alertas.push('Queda de vendas superior a 10% no período.')
  const score = Math.max(0, 100 - alertas.length * 18 - (margem < 0 ? 20 : 0) - (caixa < 0 ? 20 : 0))
  const status = score >= 80 ? 'saudavel' : score >= 55 ? 'atencao' : 'critico'
  return { score, status, alertas, recomendacoes: alertas.length ? alertas.map((a) => `Ação recomendada: ${a}`) : ['Operação sem alerta crítico. Continue acompanhando caixa, margem, estoque e inadimplência.'] }
}
