import type { EquipeUsuario, EquipeUsuarioForm } from '@/types'
import { db, getEmpresaId, normalizeError, withEmpresa, assertPermission, getCurrentUserId, type AnyRecord } from './_base'
import { AuditoriaService } from './auditoria'

export const EquipeService = {

  async convidar(form: { email: string; nome?: string; cargo: string; permissoes?: string[] }): Promise<any> {
    await assertPermission('equipe', 'criar')
    if (!form.email || !form.email.includes('@')) throw new Error('Informe um e-mail válido para o convite.')
    const payload = await withEmpresa({ ...form, status: 'pendente', convidado_por: await getCurrentUserId() } as AnyRecord)
    const { data, error } = await db().from('equipe_convites').insert(payload).select().single()
    if (error) throw normalizeError(error, 'Erro ao criar convite de equipe.')
    await AuditoriaService.registrar('equipe.convite.criar', 'equipe_convites', data.id, { email: form.email, cargo: form.cargo }).catch(() => null)
    return data
  },
  async listarConvites(): Promise<any[]> {
    await assertPermission('equipe', 'ver')
    const empresaId = await getEmpresaId()
    const { data, error } = await db().from('equipe_convites').select('*').eq('empresa_id', empresaId).order('created_at', { ascending: false })
    if (error) throw normalizeError(error, 'Erro ao listar convites de equipe.')
    return data ?? []
  },
  async cancelarConvite(id: string): Promise<void> {
    await assertPermission('equipe', 'editar')
    const empresaId = await getEmpresaId()
    const { error } = await db().from('equipe_convites').update({ status: 'cancelado', updated_at: new Date().toISOString() }).eq('empresa_id', empresaId).eq('id', id)
    if (error) throw normalizeError(error, 'Erro ao cancelar convite.')
    await AuditoriaService.registrar('equipe.convite.cancelar', 'equipe_convites', id).catch(() => null)
  },
  async listar(): Promise<EquipeUsuario[]> {
    const empresaId = await getEmpresaId()
    const { data, error } = await db().from('equipe_usuarios').select('*').eq('empresa_id', empresaId).order('nome')
    if (error) throw normalizeError(error, 'Erro ao listar equipe.')
    return (data ?? []) as EquipeUsuario[]
  },
  async criar(form: EquipeUsuarioForm): Promise<EquipeUsuario> {
    await assertPermission('equipe', 'criar')
    const payload = await withEmpresa({ ...form, status: (form as any).status || 'ativo' } as any)
    const { data, error } = await db().from('equipe_usuarios').insert(payload).select().single()
    if (error) throw normalizeError(error, 'Erro ao criar usuário da equipe.')
    await AuditoriaService.registrar('equipe.criar', 'equipe_usuarios', data.id, { cargo: data.cargo, email: data.email }).catch(() => null)
    return data as EquipeUsuario
  },
  async atualizar(id: string, form: Partial<EquipeUsuarioForm>): Promise<EquipeUsuario> {
    await assertPermission('equipe', 'editar')
    const empresaId = await getEmpresaId()
    const { data, error } = await db().from('equipe_usuarios').update({ ...form, updated_at: new Date().toISOString() }).eq('empresa_id', empresaId).eq('id', id).select().single()
    if (error) throw normalizeError(error, 'Erro ao atualizar usuário da equipe.')
    await AuditoriaService.registrar('equipe.editar', 'equipe_usuarios', id, { campos: Object.keys(form) }).catch(() => null)
    return data as EquipeUsuario
  },
  async excluir(id: string): Promise<void> {
    return this.desativar(id)
  },
  async desativar(id: string): Promise<void> {
    await assertPermission('equipe', 'excluir')
    const empresaId = await getEmpresaId()
    const { error } = await db().from('equipe_usuarios').update({ status: 'inativo', updated_at: new Date().toISOString() }).eq('empresa_id', empresaId).eq('id', id)
    if (error) throw normalizeError(error, 'Erro ao desativar usuário da equipe.')
    await AuditoriaService.registrar('equipe.desativar', 'equipe_usuarios', id).catch(() => null)
  },
}
