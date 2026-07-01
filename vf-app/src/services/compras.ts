import type { Compra, CompraItem } from '@/types'
import { calcularCompra } from '@/lib/business-rules'
import { db, getEmpresaId, hojeISO, normalizeEmptyValues, normalizeError, assertPermission, type AnyRecord } from './_base'
import { AuditoriaService } from './auditoria'

export const ComprasService = {
  async listar(limit = 100): Promise<Compra[]> {
    const { data, error } = await db().from('compras').select('*, itens:compra_itens(*)').order('data_compra', { ascending: false }).limit(limit)
    if (error) throw normalizeError(error, 'Erro ao listar compras.')
    return (data ?? []) as Compra[]
  },
  async criar(form: Partial<Compra> & { data_compra?: string; valor_total?: number; itens?: Partial<CompraItem>[] }): Promise<Compra> {
    await assertPermission('notas-fiscais', 'criar')
    const empresaId = await getEmpresaId()
    const itensInput = (form.itens ?? []).map((i: any) => ({ tipo_item: i.tipo_item || (i.insumo_id ? 'insumo' : 'produto'), nome: i.nome || i.produto_nome || i.insumo_nome || 'Item', quantidade: Number(i.quantidade || 0), custo_unitario: Number(i.custo_unitario || 0), frete_rateado: Number(i.frete_rateado || 0), taxas_rateadas: Number(i.taxas_rateadas || 0) }))
    const calculo = calcularCompra(itensInput, { frete: Number(form.valor_frete || 0), taxas: Number(form.valor_taxas || 0), desconto: Number(form.desconto || 0) })
    const body = normalizeEmptyValues({ ...form, empresa_id: empresaId, data_compra: form.data_compra || hojeISO(), valor_produtos: calculo.valor_produtos, valor_total: form.valor_total ?? calculo.valor_total, status: form.status || 'recebida' } as AnyRecord)
    delete body.itens
    const { data, error } = await db().from('compras').insert(body).select().single()
    if (error) throw normalizeError(error, 'Erro ao criar compra.')
    const rows = (form.itens ?? []).map((i: any, index) => normalizeEmptyValues({ ...i, empresa_id: empresaId, compra_id: data.id, tipo_item: i.tipo_item || (i.insumo_id ? 'insumo' : 'produto'), nome: i.nome || i.produto_nome || i.insumo_nome || 'Item', quantidade: Number(i.quantidade || 0), custo_unitario: Number(i.custo_unitario || 0), custo_total: calculo.itens[index]?.custo_total ?? Number(i.quantidade || 0) * Number(i.custo_unitario || 0) } as AnyRecord))
    if (rows.length) {
      const { error: itensError } = await db().from('compra_itens').insert(rows)
      if (itensError) throw normalizeError(itensError, 'Compra criada, mas houve erro ao salvar itens.')
    }
    // Estoque e contas a pagar são gerados por triggers SQL idempotentes.
    await AuditoriaService.registrar('compras.criar', 'compras', data.id, { valor_total: data.valor_total, itens: rows.length }).catch(() => null)
    return data as Compra
  },
}
