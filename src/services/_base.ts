import { createBrowserClient } from '@/lib/supabase'
import { can, type AcaoPermissao, type UsuarioPermissao } from '@/lib/rbac'
import type { FeatureKey } from '@/lib/modules'
import {
  AuthorizationUnavailableError,
  PermissionError,
  SessionExpiredError,
  TenantNotResolvedError,
  toAppError,
} from '@/core/errors/app-error'
import { logger } from '@/core/logging/logger'

export type AnyRecord = Record<string, any>
export const db = () => createBrowserClient()

export function normalizeEmptyValues<T extends AnyRecord>(payload: T): T {
  const out: AnyRecord = { ...payload }
  for (const key of Object.keys(out)) if (out[key] === '') out[key] = null
  return out as T
}

export function normalizeError(error: unknown, fallback = 'Não foi possível concluir a operação.'): Error {
  return toAppError(error, fallback)
}

export async function getCurrentUserId(): Promise<string | null> {
  const { data, error } = await db().auth.getUser()
  if (error) return null
  return data.user?.id ?? null
}

export async function getPerfilAtual(): Promise<(UsuarioPermissao & { id: string; empresa_id?: string | null; nome?: string | null }) | null> {
  const userId = await getCurrentUserId()
  if (!userId) return null
  const { data, error } = await db()
    .from('perfis')
    .select('id, empresa_id, nome, email, telefone, is_master, cargo, permissoes, plano, bloqueado, ultimo_login')
    .eq('id', userId)
    .maybeSingle()
  if (error) throw normalizeError(error, 'Não foi possível carregar o perfil do usuário.')
  return (data as any) ?? null
}

export async function getEmpresaId(): Promise<string> {
  const { data, error } = await db().rpc('vf_effective_empresa_id')
  if (error) {
    logger.error('Falha ao resolver tenant efetivo.', { code: 'TENANT_RPC_FAILED', details: error })
    throw new AuthorizationUnavailableError('Não foi possível validar a empresa da sessão. Confirme a migration V9.4 e tente novamente.', error)
  }
  if (typeof data === 'string' && data) return data

  const perfil = await getPerfilAtual()
  if (!perfil) throw new SessionExpiredError()
  const isMaster = Boolean(perfil.is_master) || perfil.cargo === 'master_admin' || perfil.cargo === 'super_admin'
  if (isMaster) throw new TenantNotResolvedError('Admin Master sem empresa operacional selecionada. Escolha uma empresa no painel Master.')
  throw new TenantNotResolvedError('Perfil sem empresa vinculada. Solicite a correção do vínculo ao administrador.')
}

export async function withEmpresa<T extends AnyRecord>(payload: T): Promise<T & { empresa_id: string }> {
  const clean = normalizeEmptyValues({ ...payload }) as AnyRecord
  delete clean.empresa_id
  delete clean.company_id
  return { ...clean, empresa_id: await getEmpresaId() } as T & { empresa_id: string }
}

export async function assertPermission(modulo: FeatureKey, acao: AcaoPermissao): Promise<void> {
  const perfil = await getPerfilAtual()
  if (!perfil) throw new SessionExpiredError()
  if (!can(perfil, modulo, acao)) throw new PermissionError(`Usuário sem permissão para ${acao} em ${modulo}.`)

  const { data, error } = await db().rpc('vf_can', { p_modulo: modulo, p_acao: acao })
  if (error) {
    logger.error('RPC de autorização indisponível.', { code: 'VF_CAN_FAILED', module: modulo, details: error })
    throw new AuthorizationUnavailableError('Não foi possível validar sua permissão no banco. A ação foi bloqueada.', error)
  }
  if (data !== true) throw new PermissionError(`Permissão negada para ${acao} em ${modulo}.`)
}

export async function insertAudit(acao: string, entidade?: string, entidadeId?: string | null, detalhes?: AnyRecord): Promise<void> {
  try {
    const empresaId = await getEmpresaId()
    const usuarioId = await getCurrentUserId()
    const { error } = await db().from('logs_auditoria').insert({
      empresa_id: empresaId,
      usuario_id: usuarioId,
      acao,
      entidade: entidade ?? null,
      entidade_id: entidadeId ?? null,
      detalhes: detalhes ?? {},
    })
    if (error) throw error
  } catch (error) {
    logger.warn('Não foi possível registrar auditoria.', { code: acao, entity: entidade, entityId: entidadeId, details: error })
  }
}

export function hojeISO(): string {
  return new Date().toISOString().split('T')[0]
}
