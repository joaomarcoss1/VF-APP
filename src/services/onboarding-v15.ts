import { db, getEmpresaId, normalizeError } from './_base'
import { AuditoriaService } from './auditoria'

export const OnboardingV15Service = {
  async progresso() {
    const empresaId = await getEmpresaId()
    const { data, error } = await db().from('empresa_onboarding').select('*').eq('empresa_id', empresaId).maybeSingle()
    if (error) throw normalizeError(error, 'Erro ao carregar onboarding V15.1.')
    return data
  },

  async salvarPasso(chave: string, valor = true) {
    const empresaId = await getEmpresaId()
    const { data, error } = await db().from('empresa_onboarding').upsert({ empresa_id: empresaId, [chave]: valor, updated_at: new Date().toISOString() }, { onConflict: 'empresa_id' }).select().single()
    if (error) throw normalizeError(error, 'Erro ao salvar progresso do onboarding.')
    await AuditoriaService.registrar('onboarding.v15_1.passo', 'empresa_onboarding', empresaId, { chave, valor }).catch(() => null)
    return data
  },
}
