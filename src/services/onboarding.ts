import type { IdentidadeEmpresa } from '@/types'
import { db, getEmpresaId, normalizeError } from './_base'
import { getDefaultFeatureKeys } from '@/lib/modules'
import { AuditoriaService } from './auditoria'

export const IdentidadeService = {
  async obter(): Promise<IdentidadeEmpresa | null> {
    const empresaId = await getEmpresaId()
    const { data, error } = await db().from('empresas').select('*').eq('id', empresaId).maybeSingle()
    if (error) throw normalizeError(error, 'Erro ao carregar identidade da empresa.')
    if (!data) return null
    return {
      empresa_id: data.id,
      nome: data.nome,
      tipo: data.tipo,
      cnpj: data.cnpj,
      telefone: data.telefone,
      email: data.email,
      endereco: data.endereco,
      logo_url: data.logo_url,
      cor_primaria: data.cor_primaria || '#0A8DFF',
      cor_secundaria: data.cor_secundaria || '#F2B72E',
      cor_fundo: data.cor_fundo || '#04070D',
      cor_texto: data.cor_texto || '#102033',
      cor_superficie: data.cor_superficie || '#FFFFFF',
      cor_superficie2: data.cor_superficie2 || '#EEF4FB',
      cor_borda: data.cor_borda || '#DCE6F0',
      cor_menu: data.cor_menu || '#FFFFFF',
      cor_card: data.cor_card || '#FFFFFF',
      cor_muted: data.cor_muted || '#667085',
      cor_sucesso: data.cor_sucesso || '#16A34A',
      cor_alerta: data.cor_alerta || '#F59E0B',
      cor_erro: data.cor_erro || '#DC2626',
      cor_info: data.cor_info || data.cor_primaria || '#0A8DFF',
      modo_tema: data.modo_tema || 'light',
      onboarding_concluido: data.onboarding_concluido,
      onboarding_respostas: data.onboarding_respostas || {},
    }
  },
  async uploadLogo(file: File): Promise<string> {
    const empresaId = await getEmpresaId()
    const ext = file.name.split('.').pop() || 'png'
    const path = `${empresaId}/logo-${Date.now()}.${ext}`
    const { error } = await db().storage.from('logos').upload(path, file, { upsert: true })
    if (error) throw normalizeError(error, 'Erro ao enviar logo.')
    const { data } = db().storage.from('logos').getPublicUrl(path)
    return data.publicUrl
  },
  async concluirOnboarding(payload: { nome?: string; tipo: string; usaAgendamentos?: boolean; usaEstoque?: boolean; usaInsumos?: boolean; usaCatalogoEventos?: boolean; usaFinanceiro?: boolean }) {
    return OnboardingService.concluir({ nome: payload.nome, tipo: payload.tipo, usa_agendamentos: payload.usaAgendamentos, usa_estoque: payload.usaEstoque, usa_insumos: payload.usaInsumos })
  },
  async salvar(form: Partial<IdentidadeEmpresa> & { nome?: string; tipo?: string }) {
    const empresaId = await getEmpresaId()
    const payload = {
      nome: form.nome,
      tipo: form.tipo,
      cnpj: form.cnpj,
      telefone: form.telefone,
      email: form.email,
      endereco: form.endereco,
      logo_url: form.logo_url,
      cor_primaria: form.cor_primaria,
      cor_secundaria: form.cor_secundaria,
      cor_fundo: form.cor_fundo,
      cor_texto: form.cor_texto,
      cor_superficie: (form as any).cor_superficie,
      cor_superficie2: (form as any).cor_superficie2,
      cor_borda: (form as any).cor_borda,
      cor_menu: (form as any).cor_menu,
      cor_card: (form as any).cor_card,
      cor_muted: (form as any).cor_muted,
      cor_sucesso: (form as any).cor_sucesso,
      cor_alerta: (form as any).cor_alerta,
      cor_erro: (form as any).cor_erro,
      cor_info: (form as any).cor_info,
      modo_tema: (form as any).modo_tema,
      onboarding_concluido: form.onboarding_concluido,
      onboarding_respostas: form.onboarding_respostas,
      updated_at: new Date().toISOString(),
    }
    let { data, error } = await db().from('empresas').update(payload).eq('id', empresaId).select().single()
    if (error && /cor_superficie|cor_borda|cor_menu|cor_card|cor_muted|cor_sucesso|cor_alerta|cor_erro|cor_info|modo_tema|column/i.test(error.message || '')) {
      const fallbackPayload = {
        nome: form.nome, tipo: form.tipo, cnpj: form.cnpj, telefone: form.telefone, email: form.email, endereco: form.endereco,
        logo_url: form.logo_url, cor_primaria: form.cor_primaria, cor_secundaria: form.cor_secundaria, cor_fundo: form.cor_fundo, cor_texto: form.cor_texto,
        onboarding_concluido: form.onboarding_concluido, onboarding_respostas: form.onboarding_respostas, updated_at: new Date().toISOString(),
      }
      const retry = await db().from('empresas').update(fallbackPayload).eq('id', empresaId).select().single()
      data = retry.data
      error = retry.error
    }
    if (error) throw normalizeError(error, 'Erro ao salvar identidade da empresa.')
    await AuditoriaService.registrar('onboarding.identidade.salvar', 'empresas', empresaId, { tipo: form.tipo }).catch(() => null)
    return data
  },
}

export const OnboardingService = {
  async concluir(payload: { nome?: string; tipo: string; objetivo?: string; usa_estoque?: boolean; usa_agendamentos?: boolean; usa_insumos?: boolean }) {
    const empresaId = await getEmpresaId()
    const modulos = getDefaultFeatureKeys(payload.tipo)
    const { error: empresaError } = await db().from('empresas').update({ nome: payload.nome, tipo: payload.tipo, onboarding_concluido: true, onboarding_respostas: payload, updated_at: new Date().toISOString() }).eq('id', empresaId)
    if (empresaError) throw normalizeError(empresaError, 'Erro ao concluir onboarding.')
    const rows = modulos.map((modulo, ordem) => ({ empresa_id: empresaId, modulo, ativo: true, ordem }))
    const { error: moduloError } = await db().from('empresa_modulos').upsert(rows, { onConflict: 'empresa_id,modulo' })
    if (moduloError) throw normalizeError(moduloError, 'Erro ao ativar módulos recomendados.')
    await AuditoriaService.registrar('onboarding.concluir', 'empresas', empresaId, { tipo: payload.tipo, modulos }).catch(() => null)
  },
  async checklist() {
    const empresaId = await getEmpresaId()
    const [produtos, vendas, clientes, financeiro] = await Promise.all([
      db().from('produtos').select('id', { count: 'exact', head: true }).eq('empresa_id', empresaId),
      db().from('vendas').select('id', { count: 'exact', head: true }).eq('empresa_id', empresaId),
      db().from('clientes').select('id', { count: 'exact', head: true }).eq('empresa_id', empresaId),
      db().from('lancamentos_financeiros').select('id', { count: 'exact', head: true }).eq('empresa_id', empresaId),
    ])
    return [
      { chave: 'produto', titulo: 'Cadastrar primeiro produto/serviço', concluido: Number(produtos.count || 0) > 0 },
      { chave: 'cliente', titulo: 'Cadastrar primeiro cliente', concluido: Number(clientes.count || 0) > 0 },
      { chave: 'venda', titulo: 'Registrar primeira venda', concluido: Number(vendas.count || 0) > 0 },
      { chave: 'financeiro', titulo: 'Conferir financeiro inicial', concluido: Number(financeiro.count || 0) > 0 },
    ]
  },
}
