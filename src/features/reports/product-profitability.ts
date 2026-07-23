import type { Venda, VendaItem } from '@/types'

export interface ProductProfitabilityRow {
  produto_id: string
  nome: string
  quantidade: number
  receita: number
  custo_total: number
  lucro_bruto: number
  margem_percentual: number
  cmv_percentual: number
}

const roundMoney = (value: number) => Math.round((Number(value) + Number.EPSILON) * 100) / 100

function itemCost(item: Pick<VendaItem, 'custo_unitario' | 'quantidade' | 'total' | 'lucro'>): number {
  const explicit = Number(item.custo_unitario || 0) * Number(item.quantidade || 0)
  if (explicit > 0) return explicit
  return Math.max(0, Number(item.total || 0) - Number(item.lucro || 0))
}

export function aggregateProductProfitability(vendas: Venda[]): ProductProfitabilityRow[] {
  const rows = new Map<string, ProductProfitabilityRow>()

  for (const venda of vendas) {
    const itens = venda.itens?.length
      ? venda.itens
      : [{
          id: `${venda.id}:resumo`,
          empresa_id: venda.empresa_id,
          venda_id: venda.id,
          produto_id: venda.produto_id,
          produto_nome: venda.produto_nome,
          quantidade: Number(venda.quantidade || 0),
          preco_unitario: Number(venda.preco_unitario || 0),
          custo_unitario: Number(venda.custo_unitario || 0),
          subtotal: Number(venda.subtotal || venda.total || 0),
          total: Number(venda.total || 0),
          lucro: Number(venda.lucro || 0),
          created_at: venda.created_at,
        } satisfies VendaItem]

    for (const item of itens) {
      const key = String(item.produto_id || `avulso:${item.produto_nome.trim().toLowerCase()}`)
      const receita = Number(item.total || 0)
      const custo = itemCost(item)
      const lucro = receita - custo
      const current = rows.get(key) ?? {
        produto_id: key,
        nome: item.produto_nome || 'Produto sem nome',
        quantidade: 0,
        receita: 0,
        custo_total: 0,
        lucro_bruto: 0,
        margem_percentual: 0,
        cmv_percentual: 0,
      }

      current.quantidade += Number(item.quantidade || 0)
      current.receita += receita
      current.custo_total += custo
      current.lucro_bruto += lucro
      rows.set(key, current)
    }
  }

  return Array.from(rows.values()).map((row) => {
    const receita = roundMoney(row.receita)
    const custo = roundMoney(row.custo_total)
    const lucro = roundMoney(receita - custo)
    return {
      ...row,
      quantidade: roundMoney(row.quantidade),
      receita,
      custo_total: custo,
      lucro_bruto: lucro,
      margem_percentual: receita > 0 ? roundMoney((lucro / receita) * 100) : 0,
      cmv_percentual: receita > 0 ? roundMoney((custo / receita) * 100) : 0,
    }
  })
}
