import type { MovimentacaoProdutoEstoque, ProdutoEstoque } from '@/types'
import { calcularMovimentoEstoque, validarMotivoObrigatorio } from '@/lib/business-rules'
import { db, getCurrentUserId, getEmpresaId, normalizeError, withEmpresa, assertPermission, type AnyRecord } from './_base'
import { AuditoriaService } from './auditoria'

export const ProdutosEstoqueService = {
  async listar(): Promise<ProdutoEstoque[]> {
    const empresaId = await getEmpresaId()
    const { data, error } = await db().from('produto_estoque').select('*, produto:produtos(*)').eq('empresa_id', empresaId).order('updated_at', { ascending: false })
    if (error) throw normalizeError(error, 'Erro ao listar estoque de produtos.')
    return (data ?? []) as ProdutoEstoque[]
  },
  async ajustar(produtoId: string, quantidade: number, motivo: string, custoUnitario = 0): Promise<void> {
    await assertPermission('estoque', 'editar')
    const cleanMotivo = validarMotivoObrigatorio(motivo, 'ajuste de estoque')
    const empresaId = await getEmpresaId()
    const usuarioId = await getCurrentUserId()
    const { data: atual } = await db().from('produto_estoque').select('*').eq('empresa_id', empresaId).eq('produto_id', produtoId).maybeSingle()
    calcularMovimentoEstoque({ saldo_atual: Number((atual as any)?.quantidade_atual || 0), quantidade, tipo: 'ajuste', custo_unitario: custoUnitario })
    const { error } = await db().from('movimentacoes_produto_estoque').insert({ empresa_id: empresaId, produto_id: produtoId, tipo: 'ajuste', quantidade, custo_unitario: custoUnitario, custo_total: Number(quantidade || 0) * Number(custoUnitario || 0), motivo: cleanMotivo, documento: `AJUSTE-${Date.now()}`, usuario_id: usuarioId })
    if (error) throw normalizeError(error, 'Erro ao ajustar estoque.')
    await AuditoriaService.registrar('estoque.ajuste', 'produto_estoque', produtoId, { quantidade, motivo: cleanMotivo }).catch(() => null)
  },
  async movimentar(form: { produto_id: string; tipo: 'entrada'|'saida'|'ajuste'|'perda'|'transferencia'; quantidade: number; motivo?: string; custo_unitario?: number; documento?: string }): Promise<MovimentacaoProdutoEstoque> {
    await assertPermission('estoque', form.tipo === 'saida' ? 'editar' : 'criar')
    const cleanMotivo = validarMotivoObrigatorio(form.motivo || 'Movimentação registrada pelo operador', 'movimentação de estoque')
    const payload = await withEmpresa({ ...form, motivo: cleanMotivo, custo_total: Number(form.quantidade || 0) * Number(form.custo_unitario || 0), usuario_id: await getCurrentUserId() } as AnyRecord)
    const { data, error } = await db().from('movimentacoes_produto_estoque').insert(payload).select().single()
    if (error) throw normalizeError(error, 'Erro ao movimentar estoque.')
    await AuditoriaService.registrar(`estoque.${form.tipo}`, 'movimentacoes_produto_estoque', data.id, { produto_id: form.produto_id, quantidade: form.quantidade }).catch(() => null)
    return data as MovimentacaoProdutoEstoque
  },
  async alertasRuptura() {
    const rows = await this.listar()
    return rows.filter((row) => Number((row as any).quantidade_atual || 0) <= Number((row as any).estoque_minimo || 0))
  },
  async produtosParados(dias = 60) {
    const empresaId = await getEmpresaId()
    const desde = new Date(Date.now() - dias * 86400000).toISOString()
    const { data, error } = await db().from('produto_estoque').select('*, produto:produtos(*), movimentacoes:movimentacoes_produto_estoque(created_at)').eq('empresa_id', empresaId).lt('updated_at', desde)
    if (error) throw normalizeError(error, 'Erro ao carregar produtos parados.')
    return data ?? []
  },
  async curvaABC(inicio?: string, fim?: string) {
    const empresaId = await getEmpresaId()
    let q = db().from('venda_itens').select('produto_id,produto_nome,quantidade,total,vendas!inner(data_venda,status)').eq('empresa_id', empresaId)
    if (inicio) q = q.gte('vendas.data_venda', inicio)
    if (fim) q = q.lte('vendas.data_venda', fim)
    const { data, error } = await q
    if (error) throw normalizeError(error, 'Erro ao calcular curva ABC.')
    const map = new Map<string, any>()
    for (const item of data ?? []) {
      const key = (item as any).produto_id || (item as any).produto_nome
      const acc = map.get(key) ?? { produto_id: (item as any).produto_id, produto_nome: (item as any).produto_nome, quantidade: 0, faturamento: 0 }
      acc.quantidade += Number((item as any).quantidade || 0)
      acc.faturamento += Number((item as any).total || 0)
      map.set(key, acc)
    }
    const rows = Array.from(map.values()).sort((a, b) => b.faturamento - a.faturamento)
    const total = rows.reduce((a, r) => a + r.faturamento, 0) || 1
    let acumulado = 0
    return rows.map((r) => {
      acumulado += r.faturamento
      const percentualAcumulado = (acumulado / total) * 100
      return { ...r, percentual: (r.faturamento / total) * 100, percentual_acumulado: percentualAcumulado, classe: percentualAcumulado <= 80 ? 'A' : percentualAcumulado <= 95 ? 'B' : 'C' }
    })
  },
}

export const EstoqueService = {

  async listar() {
    const empresaId = await getEmpresaId()
    const { data, error } = await db().from('movimentacoes_estoque').select('*, insumo:insumos(nome,unidade_compra)').eq('empresa_id', empresaId).order('created_at', { ascending: false }).limit(120)
    if (error) throw normalizeError(error, 'Erro ao listar movimentações de estoque.')
    return data ?? []
  },
  async movimentar(form: { insumo_id: string; tipo: 'entrada'|'saida'|'ajuste'|'perda'|'transferencia'; quantidade: number; unidade?: string; motivo?: string; custo_unitario?: number; documento?: string }) {
    return this.movimentarInsumo({ ...form, unidade: form.unidade || 'unidade', motivo: form.motivo || 'Movimentação registrada pelo operador' })
  },
  async registrarMovimentacao(form: { insumo_id: string; tipo: 'entrada'|'saida'|'ajuste'|'perda'|'transferencia'; quantidade: number; unidade: string; motivo?: string; custo_unitario?: number; documento?: string }) {
    return this.movimentarInsumo({ ...form, motivo: form.motivo || 'Movimentação registrada pelo operador' })
  },
  async movimentarInsumo(form: { insumo_id: string; tipo: 'entrada'|'saida'|'ajuste'|'perda'|'transferencia'; quantidade: number; unidade: string; motivo: string; custo_unitario?: number; documento?: string }) {
    await assertPermission('estoque', 'editar')
    const cleanMotivo = validarMotivoObrigatorio(form.motivo, 'movimentação de insumo')
    const payload = await withEmpresa({ ...form, motivo: cleanMotivo, custo_total: Number(form.quantidade || 0) * Number(form.custo_unitario || 0), usuario_id: await getCurrentUserId() } as AnyRecord)
    const { data, error } = await db().from('movimentacoes_estoque').insert(payload).select().single()
    if (error) throw normalizeError(error, 'Erro ao movimentar insumo.')
    await AuditoriaService.registrar(`estoque.insumo.${form.tipo}`, 'movimentacoes_estoque', data.id, { insumo_id: form.insumo_id, quantidade: form.quantidade }).catch(() => null)
    return data
  },
  async inventario() {
    const empresaId = await getEmpresaId()
    const [produtos, insumos] = await Promise.all([ProdutosEstoqueService.listar(), db().from('insumos').select('*').eq('empresa_id', empresaId).eq('ativo', true)])
    if (insumos.error) throw normalizeError(insumos.error, 'Erro ao carregar inventário de insumos.')
    return { produtos, insumos: insumos.data ?? [] }
  },
  async alertasRuptura() {
    const empresaId = await getEmpresaId()
    const [produtos, insumos] = await Promise.all([ProdutosEstoqueService.alertasRuptura(), db().from('insumos').select('*').eq('empresa_id', empresaId).eq('ativo', true)])
    const insumosBaixos = (insumos.data ?? []).filter((i: any) => Number(i.estoque_atual || 0) <= Number(i.estoque_minimo || 0))
    return { produtos, insumos: insumosBaixos }
  },
}

export const InventariosEstoqueService = {
  async listar() {
    await assertPermission('estoque', 'ver')
    const empresaId = await getEmpresaId()
    const { data, error } = await db().from('inventarios_estoque').select('*, itens:inventario_itens(*)').eq('empresa_id', empresaId).order('iniciado_em', { ascending: false })
    if (error) throw normalizeError(error, 'Erro ao listar inventários.')
    return data ?? []
  },

  async abrir(titulo: string) {
    await assertPermission('estoque', 'criar')
    const payload = await withEmpresa({ titulo, status: 'aberto', usuario_id: await getCurrentUserId() } as AnyRecord)
    const { data, error } = await db().from('inventarios_estoque').insert(payload).select().single()
    if (error) throw normalizeError(error, 'Erro ao abrir inventário.')
    await AuditoriaService.registrar('estoque.inventario.abrir', 'inventarios_estoque', data.id, { titulo }).catch(() => null)
    return data
  },

  async salvarContagem(inventarioId: string, itens: Array<{ item_tipo: 'produto' | 'insumo' | 'variacao'; produto_id?: string; insumo_id?: string; variacao_id?: string; nome: string; saldo_sistema: number; saldo_contado: number; custo_medio?: number; justificativa?: string }>) {
    await assertPermission('estoque', 'editar')
    const rows = await Promise.all(itens.map((item) => withEmpresa({ ...item, inventario_id: inventarioId, custo_medio: Number(item.custo_medio || 0) } as AnyRecord)))
    const empresaId = await getEmpresaId()
    await db().from('inventario_itens').delete().eq('empresa_id', empresaId).eq('inventario_id', inventarioId)
    const { error } = rows.length ? await db().from('inventario_itens').insert(rows) : { error: null }
    if (error) throw normalizeError(error, 'Erro ao salvar contagem do inventário.')
    await db().from('inventarios_estoque').update({ status: 'em_contagem', updated_at: new Date().toISOString() }).eq('empresa_id', empresaId).eq('id', inventarioId)
    await AuditoriaService.registrar('estoque.inventario.contagem', 'inventarios_estoque', inventarioId, { itens: itens.length }).catch(() => null)
  },

  async fechar(inventarioId: string, motivo: string) {
    await assertPermission('estoque', 'editar')
    const cleanMotivo = validarMotivoObrigatorio(motivo, 'fechamento de inventário')
    const { error } = await db().rpc('vf_fechar_inventario', { p_inventario_id: inventarioId, p_motivo: cleanMotivo })
    if (error) throw normalizeError(error, 'Erro ao fechar inventário.')
    await AuditoriaService.registrar('estoque.inventario.fechar.service', 'inventarios_estoque', inventarioId, { motivo: cleanMotivo }).catch(() => null)
  },
}
