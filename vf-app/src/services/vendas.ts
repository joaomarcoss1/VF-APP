import type { Venda, VendaForm, VendaItem, VendaItemForm } from '@/types'
import { calcularVenda, validarMotivoObrigatorio } from '@/lib/business-rules'
import { db, getCurrentUserId, getEmpresaId, hojeISO, normalizeEmptyValues, normalizeError, assertPermission, type AnyRecord } from './_base'
import { ClientesService } from './clientes'
import { AuditoriaService } from './auditoria'

export type VendaPagamentoForm = { forma_pagamento: string; valor: number; valor_recebido?: number; troco?: number }
export type RegistrarVendaForm = VendaForm & { itens?: VendaItemForm[]; desconto_geral?: number; pagamentos?: VendaPagamentoForm[]; valor_recebido?: number; status_entrega?: string }

export const VendasService = {
  async registrar(form: RegistrarVendaForm): Promise<Venda> {
    await assertPermission('vendas', 'criar')
    const empresaId = await getEmpresaId()
    const itensForm: VendaItemForm[] = (form.itens?.length ? form.itens : [{
      produto_id: form.produto_id || undefined,
      produto_nome: form.produto_nome || 'Venda avulsa',
      quantidade: Number(form.quantidade || 1),
      preco_unitario: Number(form.preco_unitario || 0),
      custo_unitario: Number(form.custo_unitario || 0),
      desconto: Number(form.desconto || 0),
    }])

    const calculo = calcularVenda({
      itens: itensForm,
      desconto_geral: form.desconto_geral ?? form.desconto,
      taxa_entrega: (form as AnyRecord).taxa_entrega,
      taxa_servico: (form as AnyRecord).taxa_servico,
      pagamentos: form.pagamentos,
      forma_pagamento: (form as AnyRecord).forma_pagamento,
      valor_recebido: form.valor_recebido,
    })

    let clienteId = (form as AnyRecord).cliente_id || null
    if (!clienteId && (form.cliente_nome || form.cliente_whatsapp)) {
      await ClientesService.upsertFromContact({ nome: form.cliente_nome, whatsapp: form.cliente_whatsapp, origem: 'venda' }).catch(() => undefined)
      if (form.cliente_whatsapp) {
        const digits = String(form.cliente_whatsapp).replace(/\D/g, '')
        const whats = digits.startsWith('55') ? digits : `55${digits}`
        const { data: cliente } = await db().from('clientes').select('id').eq('empresa_id', empresaId).eq('whatsapp', whats).maybeSingle()
        clienteId = cliente?.id ?? null
      }
    }

    const produtoNome = calculo.itens.length === 1 ? calculo.itens[0].produto_nome : `${calculo.itens.length} itens vendidos`
    const payload = normalizeEmptyValues({
      empresa_id: empresaId,
      cliente_id: clienteId,
      produto_id: calculo.itens.length === 1 ? calculo.itens[0].produto_id || null : null,
      produto_nome: produtoNome,
      quantidade: calculo.quantidade_total || 1,
      preco_unitario: calculo.itens.length === 1 ? Number(calculo.itens[0].preco_unitario || 0) : calculo.total,
      custo_unitario: calculo.quantidade_total > 0 ? Number((calculo.custo_total / calculo.quantidade_total).toFixed(2)) : 0,
      subtotal: calculo.subtotal,
      desconto: calculo.desconto_itens + calculo.desconto_geral,
      desconto_geral: calculo.desconto_geral,
      taxa_entrega: calculo.taxa_entrega,
      taxa_servico: calculo.taxa_servico,
      total: calculo.total,
      lucro: calculo.lucro,
      canal: form.canal || 'local',
      forma_pagamento: calculo.pagamentos[0]?.forma_pagamento || 'pix',
      cliente_nome: form.cliente_nome || null,
      cliente_whatsapp: form.cliente_whatsapp || null,
      observacoes: form.observacoes || null,
      status: 'realizada',
      status_entrega: form.status_entrega || 'pendente',
      valor_recebido: calculo.pagamentos.reduce((a, p) => a + Number(p.valor_recebido || p.valor || 0), 0),
      troco: calculo.troco,
      data_venda: form.data_venda || hojeISO(),
    } as AnyRecord)

    const { data, error } = await db().from('vendas').insert(payload).select().single()
    if (error) throw normalizeError(error, 'Erro ao registrar venda.')
    const venda = data as Venda

    const itensPayload = calculo.itens.map((item) => ({ empresa_id: empresaId, venda_id: venda.id, produto_id: item.produto_id || null, produto_nome: item.produto_nome, quantidade: item.quantidade, preco_unitario: item.preco_unitario, custo_unitario: item.custo_unitario || 0, desconto: item.desconto || 0, subtotal: item.subtotal, total: item.total, lucro: item.lucro }))
    const { data: itensData, error: itensError } = await db().from('venda_itens').insert(itensPayload).select()
    if (itensError) throw normalizeError(itensError, 'Venda criada, mas houve erro ao salvar os itens.')

    const pagamentosPayload = calculo.pagamentos.map((pagamento) => ({ empresa_id: empresaId, venda_id: venda.id, forma_pagamento: pagamento.forma_pagamento, valor: pagamento.valor, valor_recebido: pagamento.valor_recebido ?? pagamento.valor, troco: pagamento.troco || 0, data_recebimento: venda.data_venda, status: 'confirmado' }))
    try { await db().from('venda_pagamentos').insert(pagamentosPayload) } catch {}
    try { await db().from('venda_status_historico').insert({ empresa_id: empresaId, venda_id: venda.id, status_anterior: null, status_novo: 'realizada', motivo: 'Venda registrada', usuario_id: await getCurrentUserId() }) } catch {}
    await AuditoriaService.registrar('vendas.criar', 'vendas', venda.id, { total: venda.total, pagamentos: pagamentosPayload.length, itens: itensPayload.length }).catch(() => null)

    return { ...venda, itens: (itensData ?? []) as VendaItem[] }
  },

  async listarPorPeriodo(inicio?: string, fim?: string): Promise<Venda[]> {
    return this.listar(inicio, fim)
  },

  async listar(inicio?: string, fim?: string): Promise<Venda[]> {
    let q = db().from('vendas').select('*, itens:venda_itens(*), pagamentos:venda_pagamentos(*)').order('data_venda', { ascending: false }).limit(250)
    if (inicio) q = q.gte('data_venda', inicio)
    if (fim) q = q.lte('data_venda', fim)
    const { data, error } = await q
    if (error) throw normalizeError(error, 'Erro ao listar vendas.')
    return (data ?? []) as Venda[]
  },

  async buscarPorId(id: string): Promise<Venda | null> {
    const { data, error } = await db().from('vendas').select('*, itens:venda_itens(*), pagamentos:venda_pagamentos(*), historico:venda_status_historico(*)').eq('id', id).maybeSingle()
    if (error) throw normalizeError(error, 'Erro ao buscar venda.')
    return data as Venda | null
  },

  async cancelar(id: string, motivo: string): Promise<void> {
    await assertPermission('vendas', 'cancelar')
    const cleanMotivo = validarMotivoObrigatorio(motivo, 'cancelar a venda')
    const venda = await this.buscarPorId(id)
    if (!venda) throw new Error('Venda não localizada.')
    if (venda.status === 'cancelada' || venda.status === 'estornada') throw new Error('Esta venda já foi cancelada/estornada.')
    const { error } = await db().rpc('vf_cancelar_venda', { p_venda_id: id, p_motivo: cleanMotivo, p_estornar: false })
    if (error) throw normalizeError(error, 'Erro ao cancelar venda.')
    await AuditoriaService.registrar('vendas.cancelar.frontend', 'vendas', id, { motivo: cleanMotivo, total: venda.total }).catch(() => null)
  },

  async estornar(id: string, motivo = 'Estorno solicitado pelo operador'): Promise<void> {
    await assertPermission('vendas', 'estornar')
    const cleanMotivo = validarMotivoObrigatorio(motivo, 'estornar a venda')
    const venda = await this.buscarPorId(id)
    if (!venda) throw new Error('Venda não localizada.')
    const { error } = await db().rpc('vf_cancelar_venda', { p_venda_id: id, p_motivo: cleanMotivo, p_estornar: true })
    if (error) throw normalizeError(error, 'Erro ao estornar venda.')
    await AuditoriaService.registrar('vendas.estornar.frontend', 'vendas', id, { motivo: cleanMotivo, total: venda.total }).catch(() => null)
  },

  async atualizarStatusEntrega(id: string, status: 'pendente' | 'em_preparo' | 'saiu_entrega' | 'entregue' | 'cancelado'): Promise<void> {
    await assertPermission('vendas', 'editar')
    const { error } = await db().from('vendas').update({ status_entrega: status, updated_at: new Date().toISOString() }).eq('id', id)
    if (error) throw normalizeError(error, 'Erro ao atualizar entrega.')
    await AuditoriaService.registrar('vendas.status_entrega', 'vendas', id, { status }).catch(() => null)
  },

  async historico(id: string) {
    const { data, error } = await db().from('venda_status_historico').select('*').eq('venda_id', id).order('created_at', { ascending: true })
    if (error) throw normalizeError(error, 'Erro ao carregar histórico da venda.')
    return data ?? []
  },

  async resumoMensal(): Promise<Array<{ mes: string; faturamento: number; lucro: number; custo: number }>> {
    const inicio = new Date(new Date().getFullYear(), new Date().getMonth() - 5, 1).toISOString().split('T')[0]
    const { data, error } = await db().from('vendas').select('data_venda,total,lucro,custo_unitario,quantidade,status').gte('data_venda', inicio).order('data_venda')
    if (error) throw normalizeError(error, 'Erro ao carregar resumo mensal.')
    const map = new Map<string, { faturamento: number; lucro: number; custo: number }>()
    for (const v of data ?? []) {
      if ((v as any).status === 'cancelada' || (v as any).status === 'estornada') continue
      const mes = String((v as any).data_venda).slice(0, 7)
      const acc = map.get(mes) ?? { faturamento: 0, lucro: 0, custo: 0 }
      acc.faturamento += Number((v as any).total ?? 0)
      acc.lucro += Number((v as any).lucro ?? 0)
      acc.custo += Number((v as any).custo_unitario ?? 0) * Number((v as any).quantidade ?? 0)
      map.set(mes, acc)
    }
    return Array.from(map.entries()).map(([mes, vals]) => ({ mes, ...vals }))
  },
}
