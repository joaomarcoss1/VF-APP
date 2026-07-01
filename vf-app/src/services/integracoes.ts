import { db, normalizeError, withEmpresa, assertPermission, type AnyRecord } from './_base'
import { AuditoriaService } from './auditoria'

export const IntegracoesService = {
  async listar() {
    await assertPermission('configuracoes', 'ver')
    const { data, error } = await db().from('integracoes_configuracoes').select('*').order('provedor')
    if (error) throw normalizeError(error, 'Erro ao listar integrações.')
    return data ?? []
  },

  async salvar(form: { provedor: string; nome: string; status?: string; ambiente?: string; public_config?: AnyRecord; secret_ref?: string | null }) {
    await assertPermission('configuracoes', 'editar')
    const payload = await withEmpresa({ ...form, status: form.status || 'pendente', ambiente: form.ambiente || 'sandbox', public_config: form.public_config || {}, updated_at: new Date().toISOString() })
    const { data, error } = await db().from('integracoes_configuracoes').upsert(payload, { onConflict: 'empresa_id,provedor,nome' }).select().single()
    if (error) throw normalizeError(error, 'Erro ao salvar integração.')
    await AuditoriaService.registrar('integracao.salvar', 'integracoes_configuracoes', data.id, { provedor: form.provedor, nome: form.nome, status: data.status }).catch(() => null)
    return data
  },

  async registrarErro(id: string, erro: string) {
    await assertPermission('configuracoes', 'editar')
    const { error } = await db().from('integracoes_configuracoes').update({ status: 'erro', ultimo_erro: erro, updated_at: new Date().toISOString() }).eq('id', id)
    if (error) throw normalizeError(error, 'Erro ao atualizar integração.')
  },
}
