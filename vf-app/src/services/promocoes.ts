import type { Promocao, PromocaoForm, StatusPromocao } from '@/types'
import { db, normalizeEmptyValues, normalizeError, withEmpresa, assertPermission, type AnyRecord } from './_base'
import { AuditoriaService } from './auditoria'

export const PromocoesService = {
  statusCalculado(p: Promocao): StatusPromocao {
    const hoje = new Date().toISOString().split('T')[0]
    if (p.status === 'pausada') return 'pausada'
    if (p.data_inicio && p.data_inicio > hoje) return 'agendada'
    if (p.data_fim && p.data_fim < hoje) return 'expirada'
    return 'ativa'
  },
  async listar(): Promise<Promocao[]> {
    const { data, error } = await db().from('promocoes').select('*, produto:produtos(*)').order('created_at', { ascending: false })
    if (error) throw normalizeError(error, 'Erro ao listar promoções.')
    return (data ?? []) as Promocao[]
  },
  async listarAtivas(): Promise<Promocao[]> {
    const rows = await this.listar()
    return rows.filter(p => this.statusCalculado(p) === 'ativa')
  },
  async criar(form: PromocaoForm): Promise<Promocao> {
    await assertPermission('promocoes', 'criar')
    const payload = await withEmpresa({ ...form, preco_promocional: Number(form.preco_promocional || 0), desconto_percentual: form.desconto_percentual ? Number(form.desconto_percentual) : null, status: form.status || 'ativa' } as AnyRecord)
    const { data, error } = await db().from('promocoes').insert(payload).select('*, produto:produtos(*)').single()
    if (error) throw normalizeError(error, 'Erro ao criar promoção.')
    await AuditoriaService.registrar('promocoes.criar', 'promocoes', data.id, { nome: data.nome, produto_id: data.produto_id }).catch(() => null)
    return data as Promocao
  },
  async atualizar(id: string, form: Partial<PromocaoForm>): Promise<Promocao> {
    await assertPermission('promocoes', 'editar')
    const payload = normalizeEmptyValues({ ...form, updated_at: new Date().toISOString() } as AnyRecord)
    if (payload.preco_promocional !== undefined) payload.preco_promocional = Number(payload.preco_promocional || 0)
    if (payload.desconto_percentual !== undefined && payload.desconto_percentual !== null) payload.desconto_percentual = Number(payload.desconto_percentual || 0)
    const { data, error } = await db().from('promocoes').update(payload).eq('id', id).select('*, produto:produtos(*)').single()
    if (error) throw normalizeError(error, 'Erro ao atualizar promoção.')
    await AuditoriaService.registrar('promocoes.editar', 'promocoes', id, { campos: Object.keys(form) }).catch(() => null)
    return data as Promocao
  },
  async ativar(id: string): Promise<Promocao> { return this.atualizar(id, { status: 'ativa' } as Partial<PromocaoForm>) },
  async pausar(id: string): Promise<Promocao> { return this.atualizar(id, { status: 'pausada' } as Partial<PromocaoForm>) },
  async excluir(id: string): Promise<void> {
    await assertPermission('promocoes', 'excluir')
    const { error } = await db().from('promocoes').delete().eq('id', id)
    if (error) throw normalizeError(error, 'Erro ao excluir promoção.')
    await AuditoriaService.registrar('promocoes.excluir', 'promocoes', id).catch(() => null)
  },
}
