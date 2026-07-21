import type { AnyRecord } from '@/services/_base'

export const V15_SECURITY_VERSION = 'VF Nexus V15 Produção 10/10'

export type V15Role = 'super_admin' | 'empresa_admin' | 'gerente' | 'funcionario' | 'driver'

export type V15TenantCheck = {
  empresaId?: string | null
  role?: V15Role | string | null
  resourceEmpresaId?: string | null
}

export function normalizeV15Role(role?: string | null, isMaster?: boolean): V15Role {
  const value = String(role || '').toLowerCase()
  if (isMaster || ['super_admin', 'master_admin'].includes(value)) return 'super_admin'
  if (['empresa_admin', 'admin_empresa', 'administrador', 'dono'].includes(value)) return 'empresa_admin'
  if (value === 'gerente') return 'gerente'
  if (['driver', 'entregador'].includes(value)) return 'driver'
  return 'funcionario'
}

export function v15RoleLabel(role?: string | null): string {
  const normalized = normalizeV15Role(role)
  return {
    super_admin: 'Admin Master NexLabs',
    empresa_admin: 'Admin da Empresa',
    gerente: 'Gerente',
    funcionario: 'Funcionário',
    driver: 'Entregador',
  }[normalized]
}

export function assertSameEmpresa({ empresaId, role, resourceEmpresaId }: V15TenantCheck): void {
  if (normalizeV15Role(role) === 'super_admin') return
  if (!empresaId || !resourceEmpresaId || empresaId !== resourceEmpresaId) {
    throw new Error('Acesso bloqueado por segurança multiempresa: o registro pertence a outra empresa.')
  }
}

export function stripUnsafeTenantFields<T extends AnyRecord>(payload: T): T {
  const clone = { ...payload }
  delete clone.company_id
  delete clone.empresa_id
  return clone as T
}

export function assertPayloadEmpresa(payload: AnyRecord, empresaId: string): void {
  const informado = payload?.empresa_id ?? payload?.company_id
  if (informado && informado !== empresaId) {
    throw new Error('Payload recusado: empresa_id/company_id divergente do usuário autenticado.')
  }
}

export const V15_SECURITY_MATRIX = {
  super_admin: ['master', 'auditoria_global', 'empresas', 'planos', 'suporte'],
  empresa_admin: ['dashboard', 'pdv', 'produtos', 'estoque', 'financeiro', 'relatorios', 'etiquetas', 'scanner', 'entregas', 'administracao'],
  gerente: ['dashboard', 'pdv', 'produtos', 'estoque', 'relatorios', 'etiquetas', 'scanner', 'entregas'],
  funcionario: ['pdv', 'scanner', 'estoque_operacional'],
  driver: ['portal_entregador'],
} as const
