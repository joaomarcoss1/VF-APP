import type { FeatureKey } from '@/lib/modules'
import { pathToFeature } from '@/lib/modules'

export type CargoEquipe = 'dono' | 'administrador' | 'gerente' | 'financeiro' | 'vendedor' | 'atendente' | 'operacional' | 'contador' | 'master_admin'
export type AcaoPermissao = 'ver' | 'criar' | 'editar' | 'excluir' | 'cancelar' | 'estornar' | 'aprovar' | 'exportar' | 'administrar' | 'impersonar'
export type PermissaoChave = `${FeatureKey}:${AcaoPermissao}` | `${string}:${AcaoPermissao}` | '*'

export type UsuarioPermissao = {
  is_master?: boolean
  cargo?: CargoEquipe | string | null
  permissoes?: string[] | Record<string, boolean> | null
}

const leituraGeral: PermissaoChave[] = [
  'dashboard:ver','atendimento:ver','cozinha:ver','bar-drinks:ver','caixa:ver','produtos:ver','vendas:ver','clientes:ver','agendamentos:ver','ordens-servico:ver','estoque:ver','notas-fiscais:ver','fornecedores:ver','promocoes:ver','relatorios:ver','financeiro:ver','fechamento:ver','despesas:ver','comprovantes:ver','cardapio:ver','insumos:ver','fichas:ver','eventos:ver','simulador:ver','diagnostico:ver','ia:ver','configuracoes:ver'
]

export const ROLE_PERMISSIONS: Record<CargoEquipe, PermissaoChave[]> = {
  dono: ['*'],
  administrador: ['*'],
  master_admin: ['*','master-admin:administrar','master-admin:impersonar'],
  gerente: [
    ...leituraGeral,
    'atendimento:criar','atendimento:editar','cozinha:editar','bar-drinks:editar','caixa:criar','caixa:editar','produtos:criar','produtos:editar','vendas:criar','vendas:editar','vendas:cancelar','vendas:estornar','clientes:criar','clientes:editar','estoque:criar','estoque:editar','financeiro:criar','financeiro:editar','relatorios:exportar','agendamentos:criar','agendamentos:editar','ordens-servico:criar','ordens-servico:editar','ordens-servico:aprovar','comprovantes:criar','fechamento:criar','despesas:criar','despesas:editar','equipe:ver','auditoria:ver'
  ],
  financeiro: [
    'dashboard:ver','financeiro:ver','financeiro:criar','financeiro:editar','financeiro:estornar','financeiro:aprovar','financeiro:exportar','despesas:ver','despesas:criar','despesas:editar','relatorios:ver','relatorios:exportar','vendas:ver','comprovantes:ver','fechamento:ver','fechamento:criar','clientes:ver','notas-fiscais:ver'
  ],
  vendedor: [
    'dashboard:ver','atendimento:ver','cozinha:ver','bar-drinks:ver','caixa:ver','produtos:ver','vendas:ver','vendas:criar','clientes:ver','clientes:criar','clientes:editar','comprovantes:ver','comprovantes:criar','cardapio:ver','promocoes:ver'
  ],
  atendente: [
    'dashboard:ver','atendimento:ver','atendimento:criar','clientes:ver','clientes:criar','clientes:editar','agendamentos:ver','agendamentos:criar','agendamentos:editar','vendas:ver','vendas:criar','comprovantes:ver','comprovantes:criar','produtos:ver','cardapio:ver'
  ],
  operacional: [
    'dashboard:ver','atendimento:ver','cozinha:ver','bar-drinks:ver','caixa:ver','produtos:ver','estoque:ver','estoque:criar','estoque:editar','notas-fiscais:ver','notas-fiscais:criar','fornecedores:ver','fornecedores:criar','agendamentos:ver','ordens-servico:ver','ordens-servico:criar','ordens-servico:editar','insumos:ver','insumos:criar','insumos:editar','fichas:ver'
  ],
  contador: [
    'dashboard:ver','financeiro:ver','financeiro:exportar','relatorios:ver','relatorios:exportar','despesas:ver','vendas:ver','notas-fiscais:ver','comprovantes:ver','fechamento:ver'
  ],
}

function hasExplicitPermission(permissoes: UsuarioPermissao['permissoes'], chave: PermissaoChave): boolean {
  if (!permissoes) return false
  if (Array.isArray(permissoes)) return permissoes.includes('*') || permissoes.includes(chave)
  return Boolean(permissoes['*'] || permissoes[chave])
}

export function can(usuario: UsuarioPermissao | null | undefined, modulo: FeatureKey | string, acao: AcaoPermissao = 'ver'): boolean {
  if (!usuario) return false
  if (usuario.is_master) return true
  const chave = `${modulo}:${acao}` as PermissaoChave
  if (hasExplicitPermission(usuario.permissoes, chave)) return true
  const cargo = String(usuario.cargo || '').toLowerCase() as CargoEquipe
  const defaults = ROLE_PERMISSIONS[cargo]
  return Boolean(defaults?.includes('*') || defaults?.includes(chave) || (acao === 'ver' && defaults?.some(p => typeof p === 'string' && p.startsWith(`${modulo}:`))))
}

export function cannot(usuario: UsuarioPermissao | null | undefined, modulo: FeatureKey | string, acao: AcaoPermissao = 'ver'): boolean {
  return !can(usuario, modulo, acao)
}

export function canAccessModule(usuario: UsuarioPermissao | null | undefined, modulo: FeatureKey, modulosAtivos?: string[] | null): boolean {
  if (usuario?.is_master) return true
  if (modulosAtivos && !(modulosAtivos.includes('*') || modulosAtivos.includes(modulo))) return false
  return can(usuario, modulo, 'ver') || !usuario?.cargo
}

export function canAccessPath(usuario: UsuarioPermissao | null | undefined, pathname: string, modulosAtivos?: string[] | null): boolean {
  const feature = pathToFeature(pathname)
  if (!feature) return true
  return canAccessModule(usuario, feature, modulosAtivos)
}

export function requirePermission(usuario: UsuarioPermissao | null | undefined, modulo: FeatureKey | string, acao: AcaoPermissao = 'ver'): void {
  if (!can(usuario, modulo, acao)) throw new Error(`Permissão negada para ${acao} em ${modulo}.`)
}

export function getRoleLabel(cargo?: string | null): string {
  const labels: Record<string, string> = { dono: 'Dono', administrador: 'Administrador', gerente: 'Gerente', financeiro: 'Financeiro', vendedor: 'Vendedor', atendente: 'Atendente', operacional: 'Operacional', contador: 'Contador', master_admin: 'Master Admin' }
  return labels[String(cargo || '').toLowerCase()] || 'Colaborador'
}

export const CRITICAL_ACTIONS: Array<{ modulo: FeatureKey | string; acao: AcaoPermissao; descricao: string }> = [
  { modulo: 'vendas', acao: 'cancelar', descricao: 'Cancelar venda' },
  { modulo: 'vendas', acao: 'estornar', descricao: 'Estornar venda' },
  { modulo: 'financeiro', acao: 'exportar', descricao: 'Exportar financeiro' },
  { modulo: 'financeiro', acao: 'aprovar', descricao: 'Aprovar financeiro' },
  { modulo: 'estoque', acao: 'editar', descricao: 'Ajustar estoque' },
  { modulo: 'equipe', acao: 'administrar', descricao: 'Administrar equipe' },
  { modulo: 'master-admin', acao: 'impersonar', descricao: 'Impersonar cliente' },
]
