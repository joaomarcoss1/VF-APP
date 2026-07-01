import { createBrowserClient } from '@/lib/supabase'
import { can, type AcaoPermissao, type UsuarioPermissao } from '@/lib/rbac'
import type { FeatureKey } from '@/lib/modules'

export type AnyRecord = Record<string, any>
export const db = () => createBrowserClient()

export function normalizeEmptyValues<T extends AnyRecord>(payload: T): T {
  const out: AnyRecord = { ...payload }
  for (const key of Object.keys(out)) if (out[key] === '') out[key] = null
  return out as T
}

export function normalizeError(error: any, fallback = 'Não foi possível concluir a operação.'): Error {
  if (!error) return new Error(fallback)
  if (error instanceof Error) return error
  return new Error(error.message ?? error.details ?? fallback)
}

export async function getCurrentUserId(): Promise<string | null> {
  const { data, error } = await db().auth.getUser()
  if (error) return null
  return data.user?.id ?? null
}

export async function getPerfilAtual(): Promise<(UsuarioPermissao & { id: string; empresa_id?: string | null; nome?: string | null }) | null> {
  const userId = await getCurrentUserId()
  if (!userId) return null
  const { data, error } = await db().from('perfis').select('id, empresa_id, nome, is_master, cargo, permissoes, plano, bloqueado').eq('id', userId).maybeSingle()
  if (error) throw normalizeError(error, 'Não foi possível carregar o perfil do usuário.')
  return (data as any) ?? null
}

export async function getEmpresaId(): Promise<string> {
  const perfil = await getPerfilAtual()
  if (!perfil?.empresa_id) throw new Error('Perfil sem empresa vinculada. Confirme se as migrations iniciais foram executadas e se o usuário está vinculado a uma empresa.')
  return perfil.empresa_id
}

export async function withEmpresa<T extends AnyRecord>(payload: T): Promise<T & { empresa_id: string }> {
  return { ...normalizeEmptyValues(payload), empresa_id: await getEmpresaId() }
}

export async function assertPermission(modulo: FeatureKey, acao: AcaoPermissao): Promise<void> {
  const perfil = await getPerfilAtual()
  if (!can(perfil, modulo, acao)) throw new Error(`Usuário sem permissão para ${acao} em ${modulo}.`)

  // Segurança em duas camadas: a matriz local melhora UX, mas a fonte final é o banco/RLS.
  // Caso a função ainda não exista em ambientes antigos, o erro é ignorado e a operação segue protegida pelas policies.
  try {
    const { data, error } = await db().rpc('vf_can', { p_modulo: modulo, p_acao: acao })
    if (!error && data === false) throw new Error(`Permissão negada pelo banco para ${acao} em ${modulo}.`)
  } catch (error) {
    if (error instanceof Error && error.message.includes('Permissão negada pelo banco')) throw error
  }
}

export async function insertAudit(acao: string, entidade?: string, entidadeId?: string | null, detalhes?: AnyRecord): Promise<void> {
  const empresaId = await getEmpresaId().catch(() => null)
  const usuarioId = await getCurrentUserId().catch(() => null)
  if (!empresaId) return
  await db().from('logs_auditoria').insert({ empresa_id: empresaId, usuario_id: usuarioId, acao, entidade: entidade ?? null, entidade_id: entidadeId ?? null, detalhes: detalhes ?? {} }).throwOnError()
}

export function hojeISO(): string {
  return new Date().toISOString().split('T')[0]
}
