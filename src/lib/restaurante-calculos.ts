export type RestaurantPaymentInput = {
  forma_pagamento: string
  valor: number
  valor_recebido?: number
}

export type RestaurantItemInput = {
  quantidade: number
  valor_unitario: number
  desconto?: number
}

export function money(value: number | string | null | undefined): number {
  const n = Number(value ?? 0)
  if (!Number.isFinite(n)) return 0
  return Number(n.toFixed(2))
}

export function formatCurrency(value: number | string | null | undefined): string {
  return money(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function calcularSubtotalComanda(items: RestaurantItemInput[]): number {
  return money(items.reduce((sum, item) => sum + money(item.quantidade) * money(item.valor_unitario) - money(item.desconto), 0))
}

export function calcularTaxaServico(subtotal: number, percentual = 0, ativa = false): number {
  if (!ativa || percentual <= 0) return 0
  return money(money(subtotal) * (money(percentual) / 100))
}

export function calcularTotalComanda(input: { items: RestaurantItemInput[]; desconto?: number; taxaPercentual?: number; cobrarTaxa?: boolean }) {
  const subtotal = calcularSubtotalComanda(input.items)
  const taxa_servico = calcularTaxaServico(subtotal, input.taxaPercentual, input.cobrarTaxa)
  const desconto = Math.min(money(input.desconto), subtotal + taxa_servico)
  const total = money(subtotal + taxa_servico - desconto)
  return { subtotal, taxa_servico, desconto, total }
}

export function calcularTroco(total: number, valorRecebido: number): number {
  return money(Math.max(0, money(valorRecebido) - money(total)))
}

export function calcularPagamentoMisto(total: number, pagamentos: RestaurantPaymentInput[]) {
  const totalPago = money(pagamentos.reduce((sum, p) => sum + money(p.valor), 0))
  const restante = money(Math.max(0, money(total) - totalPago))
  const dinheiroRecebido = pagamentos
    .filter((p) => p.forma_pagamento === 'dinheiro')
    .reduce((sum, p) => sum + money(p.valor_recebido ?? p.valor), 0)
  const dinheiroUsado = pagamentos
    .filter((p) => p.forma_pagamento === 'dinheiro')
    .reduce((sum, p) => sum + money(p.valor), 0)
  const troco = calcularTroco(dinheiroUsado, dinheiroRecebido)
  return { totalPago, restante, troco, quitado: totalPago >= money(total) }
}

export function calcularResumoCaixa(input: {
  valorAbertura: number
  pagamentos: RestaurantPaymentInput[]
  sangrias?: number
  reforcos?: number
  dinheiroInformado?: number
}) {
  const porForma = input.pagamentos.reduce<Record<string, number>>((acc, p) => {
    acc[p.forma_pagamento] = money((acc[p.forma_pagamento] ?? 0) + money(p.valor))
    return acc
  }, {})
  const dinheiroVendas = porForma.dinheiro ?? 0
  const totalVendido = money(Object.values(porForma).reduce((sum, v) => sum + v, 0))
  const valorEsperadoDinheiro = money(input.valorAbertura + dinheiroVendas - money(input.sangrias) + money(input.reforcos))
  const diferenca = input.dinheiroInformado == null ? 0 : money(input.dinheiroInformado - valorEsperadoDinheiro)
  return { porForma, totalVendido, valorEsperadoDinheiro, diferenca }
}
