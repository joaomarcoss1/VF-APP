import { FEATURE_DEFINITIONS } from '@/lib/modules'
import { db, getEmpresaId, normalizeError } from './_base'
import { assertRole } from './_tenant'
import { AuditoriaService } from './auditoria'

export const CARGOS_PERMISSOES_V15 = ['gerente', 'funcionario', 'vendedor', 'atendente', 'operacional', 'financeiro', 'driver'] as const
export const ACOES_PERMISSOES_V15 = ['ver', 'criar', 'editar', 'excluir', 'cancelar', 'estornar', 'aprovar', 'exportar', 'administrar'] as const

export const PermissoesV15Service = {
  async matriz() {
    const empresaId = await getEmpresaId()
    const { data, error } = await db().from('permissoes_empresa').select('*').eq('empresa_id', empresaId)
    if (error) throw normalizeError(error, 'Erro ao carregar permissões.')
    return data ?? []
  },

  modulos() {
    return FEATURE_DEFINITIONS.filter(f => !f.masterOnly).map(f => ({ key: f.key, label: f.label }))
  },

  async salvar(rows: Array<{ cargo: string; modulo: string; acao: string; permitido: boolean }>) {
    await assertRole(['super_admin','empresa_admin','gerente'])
    const empresaId = await getEmpresaId()
    const payload = rows.map(row => ({ ...row, empresa_id: empresaId, updated_at: new Date().toISOString() }))
    const { error } = await db().from('permissoes_empresa').upsert(payload, { onConflict: 'empresa_id,cargo,modulo,acao' })
    if (error) throw normalizeError(error, 'Erro ao salvar matriz de permissões.')
    await AuditoriaService.registrar('permissoes.matriz.salvar', 'permissoes_empresa', empresaId, { total: rows.length }).catch(() => null)
  },
}
