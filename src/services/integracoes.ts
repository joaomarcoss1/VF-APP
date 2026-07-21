import { db, normalizeError, assertPermission, type AnyRecord } from './_base'
import { getEmpresaIdObrigatoria } from './_tenant'
import { AuditoriaService } from './auditoria'

export const IntegracoesService = {
  async listar() {
    await assertPermission('configuracoes', 'ver')
    const empresaId = await getEmpresaIdObrigatoria()
    const { data, error } = await db()
      .from('integracoes_configuracoes')
      .select('*')
      .eq('empresa_id', empresaId)
      .order('provedor')
    if (error) throw normalizeError(error, 'Erro ao listar integrações.')
    return data ?? []
  },

  async salvar(form: { id?: string; provedor: string; nome: string; status?: string; ambiente?: string; public_config?: AnyRecord; secret_ref?: string | null }) {
    await assertPermission('configuracoes', 'editar')
    const empresaId = await getEmpresaIdObrigatoria()
    const payload = {
      empresa_id: empresaId,
      provedor: form.provedor,
      nome: form.nome,
      status: form.status || 'pendente',
      ambiente: form.ambiente || 'sandbox',
      public_config: form.public_config || {},
      secret_ref: form.secret_ref ?? null,
      updated_at: new Date().toISOString(),
    }
    let result
    if (form.id) {
      result = await db()
        .from('integracoes_configuracoes')
        .update(payload)
        .eq('id', form.id)
        .eq('empresa_id', empresaId)
        .select()
        .single()
    } else {
      result = await db()
        .from('integracoes_configuracoes')
        .upsert(payload, { onConflict: 'empresa_id,provedor,nome' })
        .select()
        .single()
    }
    const { data, error } = result
    if (error) throw normalizeError(error, 'Erro ao salvar integração.')
    await AuditoriaService.registrar('integracao.salvar', 'integracoes_configuracoes', data.id, { provedor: form.provedor, nome: form.nome, status: data.status }).catch(() => null)
    return data
  },

  async registrarErro(id: string, erro: string) {
    await assertPermission('configuracoes', 'editar')
    const empresaId = await getEmpresaIdObrigatoria()
    const { error } = await db()
      .from('integracoes_configuracoes')
      .update({ status: 'erro', ultimo_erro: erro, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('empresa_id', empresaId)
    if (error) throw normalizeError(error, 'Erro ao atualizar integração.')
  },

  async remover(id: string) {
    await assertPermission('configuracoes', 'editar')
    const empresaId = await getEmpresaIdObrigatoria()
    const { error } = await db().from('integracoes_configuracoes').delete().eq('id', id).eq('empresa_id', empresaId)
    if (error) throw normalizeError(error, 'Erro ao remover integração.')
  },
}
