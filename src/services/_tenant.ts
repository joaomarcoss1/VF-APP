import { db, getCurrentUserId, getEmpresaId, getPerfilAtual, normalizeError, type AnyRecord } from './_base'
import type { AcaoPermissao } from '@/lib/rbac'
import type { FeatureKey } from '@/lib/modules'
import {
  AuthorizationUnavailableError,
  PermissionError,
  TenantNotResolvedError,
} from '@/core/errors/app-error'
import { logger } from '@/core/logging/logger'

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
    super_admin: 'Admin Master NexLabs', master_admin: 'Admin Master NexLabs', empresa_admin: 'Admin da Empresa',
    administrador: 'Admin da Empresa', dono: 'Admin da Empresa', gerente: 'Gerente', funcionario: 'Funcionário',
    driver: 'Entregador', entregador: 'Entregador', vendedor: 'Funcionário', atendente: 'Funcionário',
    operacional: 'Funcionário', financeiro: 'Funcionário',
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
  } catch (error) {
    logger.warn('Não foi possível atualizar cache local do tenant.', { code: key, details: error })
  }
}

function emitTenantChange() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('vf-nexus-empresa-operacional-change'))
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
    } catch (error) {
      logger.warn('Cache local de empresa operacional inválido.', { details: error })
    }
  }
  const id = storageGet('vf_nexus_empresa_operacional') || storageGet('vf_nexus_empresa_id') || storageGet('vf_nexus_operational_empresa_id')
  return id ? { id } : null
}

function cacheEmpresaSelecionadaMaster(detalhes: EmpresaSelecionadaMaster | null) {
  if (!detalhes?.id) {
    for (const key of ['vf_nexus_empresa_operacional', 'vf_nexus_empresa_id', 'vf_nexus_operational_empresa_id', 'vf_nexus_empresa_codigo', 'vf_nexus_empresa_operacional_detalhes']) storageSet(key, null)
    emitTenantChange()
    return
  }
  storageSet('vf_nexus_empresa_operacional', detalhes.id)
  storageSet('vf_nexus_empresa_id', detalhes.id)
  storageSet('vf_nexus_operational_empresa_id', detalhes.id)
  storageSet('vf_nexus_empresa_codigo', detalhes.codigo_empresa || detalhes.matricula_empresa || null)
  storageSet('vf_nexus_empresa_operacional_detalhes', JSON.stringify(detalhes))
  emitTenantChange()
}

export async function setEmpresaSelecionadaMaster(empresa: string | EmpresaSelecionadaMaster): Promise<EmpresaSelecionadaMaster> {
  const detalhes: EmpresaSelecionadaMaster = typeof empresa === 'string' ? { id: empresa } : empresa
  if (!detalhes?.id) throw new TenantNotResolvedError('Empresa inválida para operação Master.')
  const { data, error } = await db().rpc('vf_master_select_empresa', { p_empresa_id: detalhes.id })
  if (error) throw new AuthorizationUnavailableError('Não foi possível ativar o contexto operacional no banco.', error)
  if (String(data || '') !== detalhes.id) throw new TenantNotResolvedError('O banco não confirmou a empresa operacional.')
  cacheEmpresaSelecionadaMaster(detalhes)
  return detalhes
}

export async function clearEmpresaSelecionadaMaster(): Promise<void> {
  const { error } = await db().rpc('vf_master_clear_operational_empresa')
  cacheEmpresaSelecionadaMaster(null)
  if (error) throw new AuthorizationUnavailableError('O contexto local foi limpo, mas o banco não confirmou o encerramento.', error)
}

export async function syncEmpresaSelecionadaMasterFromServer(): Promise<EmpresaSelecionadaMaster | null> {
  const perfil = await getPerfilAtual().catch(() => null)
  if (!perfil || !(perfil.is_master || perfil.cargo === 'master_admin' || perfil.cargo === 'super_admin')) return null
  const { data: empresaId, error } = await db().rpc('vf_master_current_operational_empresa_id')
  if (error) throw new AuthorizationUnavailableError('Não foi possível consultar o contexto operacional Master.', error)
  if (!empresaId) { cacheEmpresaSelecionadaMaster(null); return null }
  const { data: empresa, error: empresaError } = await db().from('empresas').select('id,nome,nome_fantasia,codigo_empresa,matricula_empresa,ramo_atividade,tipo').eq('id', empresaId).maybeSingle()
  if (empresaError || !empresa) throw new TenantNotResolvedError('Empresa operacional não encontrada.', empresaError)
  const detalhes: EmpresaSelecionadaMaster = {
    id: empresa.id,
    nome: empresa.nome_fantasia || empresa.nome,
    codigo_empresa: empresa.codigo_empresa,
    matricula_empresa: empresa.matricula_empresa,
    ramo_atividade: empresa.ramo_atividade || empresa.tipo,
  }
  cacheEmpresaSelecionadaMaster(detalhes)
  return detalhes
}

export async function isMasterContext(): Promise<boolean> {
  const perfil = await getPerfilAtual().catch(() => null)
  return Boolean(perfil?.is_master || perfil?.cargo === 'master_admin' || perfil?.cargo === 'super_admin')
}

export async function isOperandoComoEmpresa(): Promise<boolean> {
  if (!(await isMasterContext())) return true
  return Boolean(await getEmpresaId().catch(() => null))
}

export async function getEmpresaContext() { return getTenantContext() }

export async function getEmpresaIdObrigatoria(): Promise<string> {
  const empresaId = await getEmpresaId()
  if (!empresaId) throw new TenantNotResolvedError()
  return empresaId
}

export async function getTenantContext() {
  const perfil = await getPerfilAtual()
  const usuarioId = await getCurrentUserId()
  const papel = normalizarPapel(perfil?.cargo, Boolean(perfil?.is_master))
  const isSuperAdmin = papel === 'super_admin'
  let empresaId: string | null = null
  try { empresaId = await getEmpresaId() } catch (error) {
    if (!isSuperAdmin) throw error
  }
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
  if (!empresaId || !ctx.empresaId || empresaId !== ctx.empresaId) {
    throw new PermissionError('Acesso bloqueado: o registro não pertence à empresa operacional atual.')
  }
}

export async function assertRole(roles: PapelUsuario[]): Promise<void> {
  const ctx = await getTenantContext()
  if (!roles.includes(ctx.papel)) throw new PermissionError(`Acesso negado para ${ctx.papelLabel}.`)
}

export async function assertTenantPermission(modulo: FeatureKey | string, acao: AcaoPermissao): Promise<void> {
  const { data, error } = await db().rpc('vf_can', { p_modulo: modulo, p_acao: acao })
  if (error) throw new AuthorizationUnavailableError('Não foi possível validar a permissão no banco. A ação foi bloqueada.', error)
  if (data !== true) throw new PermissionError(`Permissão negada para ${acao} em ${modulo}.`)
}

export async function injectEmpresaId<T extends AnyRecord>(payload: T): Promise<T & { empresa_id: string }> {
  const clean = { ...payload }
  delete clean.empresa_id
  delete clean.company_id
  return { ...clean, empresa_id: await getEmpresaIdObrigatoria() } as T & { empresa_id: string }
}

export async function selectEmpresaAtual(table: string, columns = '*') {
  const empresaId = await getEmpresaIdObrigatoria()
  return db().from(table).select(columns).eq('empresa_id', empresaId)
}

export async function safeTenantUpdate(table: string, id: string, payload: AnyRecord, columns = '*') {
  const empresaId = await getEmpresaIdObrigatoria()
  const { data, error } = await db().from(table).update({ ...payload, updated_at: new Date().toISOString() }).eq('empresa_id', empresaId).eq('id', id).select(columns).maybeSingle()
  if (error) throw normalizeError(error, `Erro ao atualizar ${table}.`)
  if (!data) throw new PermissionError(`Registro não encontrado na empresa atual em ${table}.`)
  return data
}

export async function safeTenantSoftDelete(table: string, id: string, payload: AnyRecord = { ativo: false }) {
  const empresaId = await getEmpresaIdObrigatoria()
  const { data, error } = await db().from(table).update({ ...payload, updated_at: new Date().toISOString() }).eq('empresa_id', empresaId).eq('id', id).select('id').maybeSingle()
  if (error) throw normalizeError(error, `Erro ao remover ${table}.`)
  if (!data) throw new PermissionError(`Registro não encontrado na empresa atual em ${table}.`)
}

export async function requireV15TenantAction(action: string, resourceEmpresaId?: string | null): Promise<void> {
  const ctx = await getTenantContext()
  if (!ctx.empresaId) throw new TenantNotResolvedError(`Ação ${action} bloqueada: empresa não resolvida.`)
  if (resourceEmpresaId && resourceEmpresaId !== ctx.empresaId) throw new PermissionError(`Ação ${action} bloqueada: registro de outra empresa.`)
}

export async function buildTenantInsert<T extends AnyRecord>(payload: T): Promise<T & { empresa_id: string }> {
  return injectEmpresaId(payload)
}

export async function buildCompanyInsert<T extends AnyRecord>(payload: T): Promise<T & { company_id: string }> {
  const empresaId = await getEmpresaIdObrigatoria()
  const clean = { ...payload }
  delete clean.company_id
  delete clean.empresa_id
  return { ...clean, company_id: empresaId } as T & { company_id: string }
}
