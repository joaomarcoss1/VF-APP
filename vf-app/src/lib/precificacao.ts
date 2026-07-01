// ============================================================
// VF Nexus — Motor de Precificação (corrigido)
// ============================================================
import type { Insumo, UnidadeFicha, ResultadoPrecificacao, EventoItemForm, ResultadoPrecificacaoEvento } from '@/types'

export function getCustoUnitario(insumo: Insumo, unidade: UnidadeFicha): number {
  switch (unidade) {
    case 'kg':      return insumo.custo_por_kg      ?? 0
    case 'g':       return insumo.custo_por_grama   ?? 0
    case 'litro':   return insumo.custo_por_litro   ?? 0
    case 'ml':      return insumo.custo_por_ml      ?? 0
    case 'unidade': return insumo.custo_por_unidade ?? 0
    default:        return 0
  }
}

export function calcularCustoItem(insumo: Insumo, quantidade: number, unidade: UnidadeFicha): number {
  return getCustoUnitario(insumo, unidade) * quantidade
}

export function calcularCustoTotalFicha(
  ficha: Array<{ insumo: Insumo; quantidade: number; unidade: UnidadeFicha }>
): number {
  return ficha.reduce((acc, item) => acc + calcularCustoItem(item.insumo, item.quantidade, item.unidade), 0)
}

export function calcularPrecificacao(
  custoTotal: number,
  margemAplicada: number,
  margemMinima = 200,
  margemPremium = 400,
  taxaOperacional = 0,
  margemIdeal = 300
): ResultadoPrecificacao {
  if (custoTotal <= 0) return {
    custo_total: 0, preco_minimo: 0, preco_ideal: 0, preco_premium: 0,
    preco_customizado: 0, cmv_percentual: 0, margem_bruta: 0,
    lucro_bruto: 0, lucro_liquido_estimado: 0
  }

  const precoCustomizado = round2(custoTotal * (1 + margemAplicada / 100))
  const precoMinimo      = round2(custoTotal * (1 + margemMinima  / 100))
  const precoIdeal       = round2(custoTotal * (1 + margemIdeal / 100))
  const precoPremium     = round2(custoTotal * (1 + margemPremium / 100))
  const lucro_bruto      = round2(precoCustomizado - custoTotal)
  const lucro_liquido_estimado = round2(lucro_bruto * (1 - taxaOperacional / 100))
  const cmv_percentual   = round2((custoTotal / precoCustomizado) * 100)
  const margem_bruta     = round2((lucro_bruto   / precoCustomizado) * 100)

  return {
    custo_total: round2(custoTotal),
    preco_minimo: precoMinimo, preco_ideal: precoIdeal, preco_premium: precoPremium, preco_customizado: precoCustomizado,
    cmv_percentual, margem_bruta, lucro_bruto, lucro_liquido_estimado,
  }
}

// Fix: simularCenario corrigido — substituição de ingrediente via delta de custo
export function simularCenario(params: {
  custoAtual: number
  precoAtual: number
  variacaoCusto?: number    // % ex: 10 = +10%
  variacaoPreco?: number    // % ex: 5  = +5%
  deltaCustoIngrediente?: number  // valor absoluto: positivo = aumentou, negativo = reduziu
}): { custo: number; preco: number; lucro: number; cmv: number; margem: number } {
  const novoCusto  = round2(
    params.custoAtual * (1 + (params.variacaoCusto ?? 0) / 100)
    + (params.deltaCustoIngrediente ?? 0)
  )
  const novoPreco  = round2(params.precoAtual * (1 + (params.variacaoPreco ?? 0) / 100))
  const lucro      = round2(novoPreco - novoCusto)
  const cmv        = novoPreco > 0 ? round2((novoCusto / novoPreco) * 100) : 0
  const margem     = novoPreco > 0 ? round2((lucro     / novoPreco) * 100) : 0
  return { custo: novoCusto, preco: novoPreco, lucro, cmv, margem }
}

export function avaliarCMV(cmv: number): { status: 'excelente'|'bom'|'atencao'|'critico'; label: string; cor: string } {
  if (cmv <= 25) return { status: 'excelente', label: 'Excelente',      cor: '#3DAA6B' }
  if (cmv <= 32) return { status: 'bom',       label: 'Dentro da meta', cor: '#3DAA6B' }
  if (cmv <= 38) return { status: 'atencao',   label: 'Atenção',        cor: '#E8B84B' }
  return           { status: 'critico',         label: 'Crítico',        cor: '#D45050' }
}

export function calcularCustosInsumo(valorCompra: number, qtd: number, unidade: string) {
  const base = qtd > 0 ? valorCompra / qtd : 0
  const r = { custo_por_kg: null as number|null, custo_por_grama: null as number|null,
               custo_por_litro: null as number|null, custo_por_ml: null as number|null,
               custo_por_unidade: null as number|null }
  if (unidade === 'kg')    { r.custo_por_kg = base; r.custo_por_grama = base / 1000 }
  else if (unidade === 'g') { r.custo_por_grama = base; r.custo_por_kg = base * 1000 }
  else if (unidade === 'litro') { r.custo_por_litro = base; r.custo_por_ml = base / 1000 }
  else if (unidade === 'ml')    { r.custo_por_ml = base; r.custo_por_litro = base * 1000 }
  else r.custo_por_unidade = base
  return r
}

export function formatarCustoUnitario(insumo: Insumo): string {
  if (insumo.custo_por_kg)      return `R$ ${fmtBRL(insumo.custo_por_kg)}/kg`
  if (insumo.custo_por_litro)   return `R$ ${fmtBRL(insumo.custo_por_litro)}/L`
  if (insumo.custo_por_unidade) return `R$ ${fmtBRL(insumo.custo_por_unidade)}/un`
  if (insumo.custo_por_grama)   return `R$ ${fmtBRL(insumo.custo_por_grama * 1000)}/kg`
  if (insumo.custo_por_ml)      return `R$ ${fmtBRL(insumo.custo_por_ml * 1000)}/L`
  return '—'
}

export const round2    = (n: number) => Math.round(n * 100) / 100
export const fmtBRL    = (n: number) => n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
export const fmtCurrency = (n: number) => `R$ ${fmtBRL(n)}`
export const fmtPct    = (n: number) => `${round2(n).toLocaleString('pt-BR', { minimumFractionDigits: 1 })}%`

// ============================================================
// EVENTOS — Precificação profissional para buffets, drinks e combos
// ============================================================
export function calcularPrecificacaoEvento(params: {
  pessoas: number
  margem_lucro: number
  taxa_operacional_percentual?: number
  custo_operacional_extra?: number
  desconto?: number
  itens: EventoItemForm[]
}): ResultadoPrecificacaoEvento {
  const pessoas = Math.max(1, Number(params.pessoas || 1))
  const margem = Math.max(0, Number(params.margem_lucro || 0))
  const taxaOperacional = Math.max(0, Number(params.taxa_operacional_percentual || 0))
  const custoExtra = Math.max(0, Number(params.custo_operacional_extra || 0))
  const desconto = Math.max(0, Number(params.desconto || 0))

  const itens = params.itens
    .filter(item => item.produto_id && item.produto_nome)
    .map(item => {
      const rendimentoUnitario = Math.max(1, Number(item.rendimento_unitario || 1))
      const consumoPorPessoa = Math.max(0, Number(item.consumo_por_pessoa || 0))
      const demanda = pessoas * consumoPorPessoa
      const quantidadeAuto = demanda > 0 ? Math.ceil(demanda / rendimentoUnitario) : 0
      const quantidadeProdutos = Math.max(0, Number(item.quantidade_produtos || quantidadeAuto))
      const rendimentoTotal = round2(quantidadeProdutos * rendimentoUnitario)
      const sobraEstimada = round2(Math.max(0, rendimentoTotal - demanda))
      const custoUnitario = Math.max(0, Number(item.custo_unitario || 0))
      const precoUnitarioBase = Math.max(0, Number(item.preco_unitario_base || 0))
      const custoTotal = round2(quantidadeProdutos * custoUnitario)
      const receitaSugerida = round2(quantidadeProdutos * precoUnitarioBase)

      return {
        produto_id: item.produto_id,
        produto_nome: item.produto_nome,
        categoria: item.categoria,
        rendimento_unitario: rendimentoUnitario,
        unidade_rendimento: item.unidade_rendimento || 'porções',
        consumo_por_pessoa: consumoPorPessoa,
        quantidade_produtos: quantidadeProdutos,
        rendimento_total: rendimentoTotal,
        sobra_estimada: sobraEstimada,
        custo_unitario: custoUnitario,
        preco_unitario_base: precoUnitarioBase,
        custo_total: custoTotal,
        receita_sugerida: receitaSugerida,
        observacoes: item.observacoes,
      }
    })

  const custoProdutos = round2(itens.reduce((acc, item) => acc + item.custo_total, 0))
  const custoOperacionalCalculado = round2(custoProdutos * (taxaOperacional / 100))
  const custoTotal = round2(custoProdutos + custoOperacionalCalculado + custoExtra)
  const precoBruto = round2(custoTotal * (1 + margem / 100))
  const precoSugerido = round2(Math.max(0, precoBruto - desconto))
  const lucroEstimado = round2(precoSugerido - custoTotal)
  const cmvPercentual = precoSugerido > 0 ? round2((custoTotal / precoSugerido) * 100) : 0
  const margemBruta = precoSugerido > 0 ? round2((lucroEstimado / precoSugerido) * 100) : 0
  const markup = custoTotal > 0 ? round2(precoSugerido / custoTotal) : 0
  const totalProdutos = itens.reduce((acc, item) => acc + item.quantidade_produtos, 0)
  const totalRendimento = round2(itens.reduce((acc, item) => acc + item.rendimento_total, 0))
  const coberturaPessoas = pessoas > 0 ? round2(totalRendimento / pessoas) : 0

  const cenarios = [100, 150, 200, 250, 300, 400].map(m => {
    const preco = round2(Math.max(0, custoTotal * (1 + m / 100) - desconto))
    const lucro = round2(preco - custoTotal)
    return {
      margem: m,
      preco_sugerido: preco,
      preco_por_pessoa: pessoas > 0 ? round2(preco / pessoas) : 0,
      lucro_estimado: lucro,
      cmv_percentual: preco > 0 ? round2((custoTotal / preco) * 100) : 0,
    }
  })

  return {
    pessoas,
    margem_lucro: margem,
    taxa_operacional_percentual: taxaOperacional,
    custo_operacional_extra: custoExtra,
    desconto,
    custo_produtos: custoProdutos,
    custo_operacional_calculado: custoOperacionalCalculado,
    custo_total: custoTotal,
    preco_sugerido: precoSugerido,
    preco_por_pessoa: pessoas > 0 ? round2(precoSugerido / pessoas) : 0,
    lucro_estimado: lucroEstimado,
    cmv_percentual: cmvPercentual,
    margem_bruta: margemBruta,
    markup,
    total_produtos: totalProdutos,
    total_rendimento: totalRendimento,
    cobertura_pessoas: coberturaPessoas,
    itens,
    cenarios,
  }
}

export function sugerirQuantidadeEvento(params: {
  pessoas: number
  consumo_por_pessoa: number
  rendimento_unitario: number
}): number {
  const pessoas = Math.max(1, Number(params.pessoas || 1))
  const consumo = Math.max(0, Number(params.consumo_por_pessoa || 0))
  const rendimento = Math.max(1, Number(params.rendimento_unitario || 1))
  return Math.ceil((pessoas * consumo) / rendimento)
}
