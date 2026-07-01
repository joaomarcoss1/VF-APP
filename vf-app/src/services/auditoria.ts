import { db, getEmpresaId, getCurrentUserId, normalizeError, type AnyRecord } from './_base'

export const AuditoriaService = {
  async listar(limit = 150) {
    const { data, error } = await db().from('logs_auditoria').select('*').order('created_at', { ascending: false }).limit(limit)
    if (error) throw normalizeError(error, 'Erro ao listar auditoria.')
    return data ?? []
  },
  async registrar(acao: string, entidade?: string, entidadeId?: string | null, detalhes?: AnyRecord) {
    const empresaId = await getEmpresaId()
    const usuarioId = await getCurrentUserId()
    const { error } = await db().from('logs_auditoria').insert({ empresa_id: empresaId, usuario_id: usuarioId, acao, entidade: entidade ?? null, entidade_id: entidadeId ?? null, detalhes: detalhes ?? {} })
    if (error) throw normalizeError(error, 'Erro ao registrar auditoria.')
  },
}
