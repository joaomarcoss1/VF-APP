import type { Cliente, ClienteForm } from '@/types'
import { db, getEmpresaId, normalizeEmptyValues, normalizeError, withEmpresa } from './_base'
import { AuditoriaService } from './auditoria'

export function normalizarTelefoneBR(valor?: string | null): string {
  const digits = String(valor ?? '').replace(/\D/g, '')
  if (!digits) return ''
  return digits.startsWith('55') ? digits : `55${digits}`
}

export const ClientesService = {
  async listar(search?: string): Promise<Cliente[]> {
    let q = db().from('clientes').select('*').eq('ativo', true).order('nome')
    if (search?.trim()) q = q.or(`nome.ilike.%${search.trim()}%,telefone.ilike.%${search.trim()}%,whatsapp.ilike.%${search.trim()}%,email.ilike.%${search.trim()}%`)
    const { data, error } = await q
    if (error) throw normalizeError(error, 'Erro ao listar clientes.')
    return (data ?? []) as Cliente[]
  },
  async criar(form: ClienteForm): Promise<Cliente> {
    const payload = await withEmpresa({ ...form, whatsapp: normalizarTelefoneBR(form.whatsapp), ativo: form.ativo ?? true, tipo: form.tipo || 'cliente' } as any)
    const { data, error } = await db().from('clientes').insert(payload).select().single()
    if (error) throw normalizeError(error, 'Erro ao cadastrar cliente.')
    await AuditoriaService.registrar('clientes.criar', 'clientes', data.id, { nome: data.nome }).catch(() => null)
    return data as Cliente
  },
  async atualizar(id: string, form: Partial<ClienteForm>): Promise<Cliente> {
    const payload = normalizeEmptyValues({ ...form, whatsapp: form.whatsapp ? normalizarTelefoneBR(form.whatsapp) : form.whatsapp, updated_at: new Date().toISOString() } as any)
    const { data, error } = await db().from('clientes').update(payload).eq('id', id).select().single()
    if (error) throw normalizeError(error, 'Erro ao atualizar cliente.')
    await AuditoriaService.registrar('clientes.editar', 'clientes', id, { campos: Object.keys(form) }).catch(() => null)
    return data as Cliente
  },
  async excluir(id: string): Promise<void> {
    const { error } = await db().from('clientes').update({ ativo: false, updated_at: new Date().toISOString() }).eq('id', id)
    if (error) throw normalizeError(error, 'Erro ao remover cliente.')
    await AuditoriaService.registrar('clientes.excluir', 'clientes', id).catch(() => null)
  },
  async upsertFromContact(contato: { nome?: string | null; whatsapp?: string | null; email?: string | null; origem?: string }): Promise<void> {
    if (!contato.nome && !contato.whatsapp && !contato.email) return
    const empresaId = await getEmpresaId()
    const whatsapp = normalizarTelefoneBR(contato.whatsapp)
    const { data: existente } = whatsapp
      ? await db().from('clientes').select('id,total_compras').eq('empresa_id', empresaId).eq('whatsapp', whatsapp).maybeSingle()
      : { data: null } as any
    const payload = normalizeEmptyValues({ empresa_id: empresaId, nome: contato.nome || contato.whatsapp || contato.email || 'Cliente sem nome', whatsapp: whatsapp || null, email: contato.email || null, origem: contato.origem || 'app', tipo: 'cliente', ativo: true, ultima_interacao: new Date().toISOString(), updated_at: new Date().toISOString() })
    if ((existente as any)?.id) await db().from('clientes').update(payload).eq('id', (existente as any).id)
    else await db().from('clientes').insert(payload)
  },
}
