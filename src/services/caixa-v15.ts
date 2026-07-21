import { db, getCurrentUserId, getEmpresaId, normalizeError } from './_base'
import { AuditoriaService } from './auditoria'

export type CaixaV15 = {
  id: string
  empresa_id: string
  status: string
  data_caixa: string
  saldo_inicial: number
  dinheiro_informado?: number | null
  dinheiro_esperado?: number | null
  pix_esperado?: number | null
  credito_esperado?: number | null
  debito_esperado?: number | null
  outros_esperado?: number | null
  diferenca?: number | null
  observacoes?: string | null
  opened_at?: string | null
  closed_at?: string | null
}

export const CaixaV15Service = {
  async caixaAberto(): Promise<CaixaV15 | null> {
    const empresaId = await getEmpresaId()
    const { data, error } = await db().from('caixas').select('*').eq('empresa_id', empresaId).eq('status', 'aberto').maybeSingle()
    if (error) throw normalizeError(error, 'Erro ao buscar caixa aberto.')
    return data as CaixaV15 | null
  },

  async historico(): Promise<CaixaV15[]> {
    const empresaId = await getEmpresaId()
    const { data, error } = await db().from('caixas').select('*').eq('empresa_id', empresaId).order('created_at', { ascending: false }).limit(60)
    if (error) throw normalizeError(error, 'Erro ao listar caixas.')
    return (data ?? []) as CaixaV15[]
  },

  async abrir(saldoInicial: number) {
    const empresaId = await getEmpresaId()
    const userId = await getCurrentUserId()
    const { data, error } = await db().from('caixas').insert({ empresa_id: empresaId, aberto_por: userId, saldo_inicial: saldoInicial, status: 'aberto' }).select().single()
    if (error) throw normalizeError(error, 'Erro ao abrir caixa. Verifique se já existe caixa aberto.')
    await AuditoriaService.registrar('caixa.abrir', 'caixas', data.id, { saldoInicial }).catch(() => null)
    return data as CaixaV15
  },

  async registrarMovimento(form: { tipo: 'entrada' | 'saida'; descricao: string; valor: number; forma_pagamento?: string }) {
    const empresaId = await getEmpresaId()
    const userId = await getCurrentUserId()
    const caixa = await this.caixaAberto()
    if (!caixa) throw new Error('Abra um caixa antes de registrar movimentações.')
    const { data, error } = await db().from('caixa_movimentos').insert({ empresa_id: empresaId, caixa_id: caixa.id, usuario_id: userId, tipo: form.tipo, descricao: form.descricao, valor: form.valor, forma_pagamento: form.forma_pagamento || 'dinheiro', origem: 'manual' }).select().single()
    if (error) throw normalizeError(error, 'Erro ao registrar movimentação de caixa.')
    await AuditoriaService.registrar('caixa.movimento.registrar', 'caixa_movimentos', data.id, form).catch(() => null)
    return data
  },

  async fechar(form: { dinheiro_informado: number; observacoes?: string }) {
    const caixa = await this.caixaAberto()
    if (!caixa) throw new Error('Nenhum caixa aberto encontrado.')
    const empresaId = await getEmpresaId()
    const userId = await getCurrentUserId()

    const { data: movimentos } = await db().from('caixa_movimentos').select('tipo,valor,forma_pagamento').eq('empresa_id', empresaId).eq('caixa_id', caixa.id)
    const movs = movimentos ?? []
    const entradas = movs.filter((m: any) => m.tipo === 'entrada').reduce((s: number, m: any) => s + Number(m.valor || 0), 0)
    const saidas = movs.filter((m: any) => m.tipo === 'saida').reduce((s: number, m: any) => s + Number(m.valor || 0), 0)
    const dinheiroEsperado = Number(caixa.saldo_inicial || 0) + entradas - saidas
    const diferenca = Number(form.dinheiro_informado || 0) - dinheiroEsperado

    const { data, error } = await db().from('caixas').update({
      status: 'fechado',
      fechado_por: userId,
      dinheiro_informado: form.dinheiro_informado,
      dinheiro_esperado: dinheiroEsperado,
      diferenca,
      observacoes: form.observacoes || null,
      closed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('empresa_id', empresaId).eq('id', caixa.id).select().single()
    if (error) throw normalizeError(error, 'Erro ao fechar caixa.')
    await AuditoriaService.registrar('caixa.fechar', 'caixas', caixa.id, { dinheiroEsperado, dinheiroInformado: form.dinheiro_informado, diferenca }).catch(() => null)
    return data as CaixaV15
  },
}
