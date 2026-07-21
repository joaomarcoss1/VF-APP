import { db, getCurrentUserId, getEmpresaId, getPerfilAtual, normalizeError, type AnyRecord } from './_base'
import type { AcaoPermissao } from '@/lib/rbac'
import type { FeatureKey } from '@/lib/modules'

export type PapelUsuario = 'super_admin' | 'empresa_admin' | 'gerente' | 'funcionario' | 'driver'

export type EmpresaSelecionadaMaster = {
  id: string
  nome?: string | null
  codigo_empresa?: string | null
  matricula_empresa?: string | null
  ramo_atividade?: string | null
}

export function normalizarPapel(cargo?: string | null, isMaster?: boolean): PapelUsuario {
  if (isMaster || cargo === 'master_admin' || cargo === 'super_admin') return 'super_admin'
  if (cargo === 'dono' || cargo === 'administrador' || cargo === 'empresa_admin') return 'empresa_admin'
  if (cargo === 'gerente') return 'gerente'
  if (cargo === 'driver' || cargo === 'entregador') return 'driver'
  return 'funcionario'
}

export function labelPapel(papel?: string | null): string {
  const labels: Record<string, string> = {
    super_admin: 'Admin Master NexLabs',
    master_admin: 'Admin Master NexLabs',
    empresa_admin: 'Admin da Empresa',
    administrador: 'Admin da Empresa',
    dono: 'Admin da Empresa',
    gerente: 'Gerente',
    funcionario: 'Funcionário',
    driver: 'Entregador',
    entregador: 'Entregador',
    vendedor: 'Funcionário',
    atendente: 'Funcionário',
    operacional: 'Funcionário',
    financeiro: 'Funcionário',
  }
  return labels[String(papel || '').toLowerCase()] || 'Funcionário'
}


function storageGet(key: string): string | null {
  if (typeof window === 'undefined') return null
  try { return window.localStorage.getItem(key) } catch { return null }
}

function storageSet(key: string, value: string | null) {
  if (typeof window === 'undefined') return
  try {
    if (value) window.localStorage.setItem(key, value)
    else window.localStorage.removeItem(key)
  } catch {}
}

export function getEmpresaSelecionadaMaster(): string | null {
  const detalhes = getEmpresaSelecionadaMasterDetalhes()
  return detalhes?.id || storageGet('vf_nexus_empresa_operacional') || storageGet('vf_nexus_empresa_id') || storageGet('vf_nexus_operational_empresa_id')
}

export function getEmpresaSelecionadaMasterDetalhes(): EmpresaSelecionadaMaster | null {
  const raw = storageGet('vf_nexus_empresa_operacional_detalhes')
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as EmpresaSelecionadaMaster
      if (parsed?.id) return parsed
    } catch {}
  }
  const id = storageGet('vf_nexus_empresa_operacional') || storageGet('vf_nexus_empresa_id') || storageGet('vf_nexus_operational_empresa_id')
  return id ? { id } : null
}

export function setEmpresaSelecionadaMaster(empresa: string | EmpresaSelecionadaMaster) {
  const detalhes: EmpresaSelecionadaMaster = typeof empresa === 'string' ? { id: empresa } : empresa
  if (!detalhes?.id) return
  storageSet('vf_nexus_empresa_operacional', detalhes.id)
  storageSet('vf_nexus_empresa_id', detalhes.id)
  storageSet('vf_nexus_operational_empresa_id', detalhes.id)
  if (detalhes.codigo_empresa || detalhes.matricula_empresa) storageSet('vf_nexus_empresa_codigo', detalhes.codigo_empresa || detalhes.matricula_empresa || null)
  storageSet('vf_nexus_empresa_operacional_detalhes', JSON.stringify(detalhes))
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('vf-nexus-empresa-operacional-change'))
}

export function clearEmpresaSelecionadaMaster() {
  storageSet('vf_nexus_empresa_operacional', null)
  storageSet('vf_nexus_empresa_id', null)
  storageSet('vf_nexus_operational_empresa_id', null)
  storageSet('vf_nexus_empresa_codigo', null)
  storageSet('vf_nexus_empresa_operacional_detalhes', null)
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('vf-nexus-empresa-operacional-change'))
}

export async function isMasterContext(): Promise<boolean> {
  const perfil = await getPerfilAtual().catch(() => null)
  return Boolean(perfil?.is_master || perfil?.cargo === 'master_admin' || perfil?.cargo === 'super_admin')
}

export async function isOperandoComoEmpresa(): Promise<boolean> {
  if (!(await isMasterContext())) return true
  return Boolean(await getEmpresaId().catch(() => null))
}

export async function getEmpresaContext() {
  const ctx = await getTenantContext()
  return ctx
}

export async function getEmpresaIdObrigatoria(): Promise<string> {
  const empresaId = await getEmpresaId()
  if (!empresaId) throw new Error('Usuário sem empresa vinculada. Faça login novamente ou peça ao Admin Master para vincular a empresa.')
  return empresaId
}

export async function getTenantContext() {
  const perfil = await getPerfilAtual()
  const usuarioId = await getCurrentUserId()
  const papel = normalizarPapel(perfil?.cargo, Boolean(perfil?.is_master))
  const isSuperAdmin = papel === 'super_admin'
  let empresaId: string | null = perfil?.empresa_id ?? null
  if (isSuperAdmin) empresaId = await getEmpresaId().catch(() => perfil?.empresa_id ?? null)
  return {
    usuarioId,
    empresaId,
    papel,
    papelLabel: labelPapel(papel),
    perfil,
    isSuperAdmin,
    isEmpresaAdmin: papel === 'empresa_admin',
    empresaSelecionadaMaster: isSuperAdmin ? empresaId : null,
  }
}

export async function assertEmpresaAccess(empresaId?: string | null): Promise<void> {
  const ctx = await getTenantContext()
  if (ctx.isSuperAdmin) return
  if (!empresaId || !ctx.empresaId || empresaId !== ctx.empresaId) {
    throw new Error('Acesso bloqueado: este registro pertence a outra empresa ou o usuário não está vinculado corretamente.')
  }
}

export async function assertRole(roles: PapelUsuario[]): Promise<void> {
  const ctx = await getTenantContext()
  if (!roles.includes(ctx.papel)) throw new Error(`Acesso negado para ${ctx.papelLabel}.`)
}

export async function assertTenantPermission(modulo: FeatureKey | string, acao: AcaoPermissao): Promise<void> {
  try {
    const { data, error } = await db().rpc('vf_can', { p_modulo: modulo, p_acao: acao })
    if (!error && data === false) throw new Error(`Permissão negada para ${acao} em ${modulo}.`)
  } catch (error) {
    if (error instanceof Error && error.message.includes('Permissão negada')) throw error
  }
}

export async function injectEmpresaId<T extends AnyRecord>(payload: T): Promise<T & { empresa_id: string }> {
  return { ...payload, empresa_id: await getEmpresaIdObrigatoria() }
}

export async function selectEmpresaAtual(table: string, columns = '*') {
  const empresaId = await getEmpresaIdObrigatoria()
  return db().from(table).select(columns).eq('empresa_id', empresaId)
}

export async function safeTenantUpdate(table: string, id: string, payload: AnyRecord, columns = '*') {
  const empresaId = await getEmpresaIdObrigatoria()
  const { data, error } = await db().from(table).update({ ...payload, updated_at: new Date().toISOString() }).eq('empresa_id', empresaId).eq('id', id).select(columns).single()
  if (error) throw normalizeError(error, `Erro ao atualizar ${table}.`)
  return data
}

export async function safeTenantSoftDelete(table: string, id: string, payload: AnyRecord = { ativo: false }) {
  const empresaId = await getEmpresaIdObrigatoria()
  const { error } = await db().from(table).update({ ...payload, updated_at: new Date().toISOString() }).eq('empresa_id', empresaId).eq('id', id)
  if (error) throw normalizeError(error, `Erro ao remover ${table}.`)
}

export async function requireV15TenantAction(action: string, resourceEmpresaId?: string | null): Promise<void> {
  const ctx = await getTenantContext()
  if (ctx.isSuperAdmin) return
  if (!ctx.empresaId) throw new Error(`Ação ${action} bloqueada: usuário sem empresa vinculada.`)
  if (resourceEmpresaId && resourceEmpresaId !== ctx.empresaId) throw new Error(`Ação ${action} bloqueada: registro de outra empresa.`)
}

export async function buildTenantInsert<T extends AnyRecord>(payload: T): Promise<T & { empresa_id: string }> {
  const empresaId = await getEmpresaIdObrigatoria()
  const clean = { ...payload }
  delete clean.company_id
  delete clean.empresa_id
  return { ...clean, empresa_id: empresaId } as T & { empresa_id: string }
}

export async function buildCompanyInsert<T extends AnyRecord>(payload: T): Promise<T & { company_id: string }> {
  const empresaId = await getEmpresaIdObrigatoria()
  const clean = { ...payload }
  delete clean.company_id
  delete clean.empresa_id
  return { ...clean, company_id: empresaId } as T & { company_id: string }
}
