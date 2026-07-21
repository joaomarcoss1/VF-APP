import type { DocumentoFiscal, DocumentoFiscalTipo, IntegracaoFiscalConfig, IntegracaoFiscalConfigForm } from '@/types'
import { db, getEmpresaId, normalizeEmptyValues, normalizeError, assertPermission } from './_base'
import { AuditoriaService } from './auditoria'

const DEFAULT_FISCAL: IntegracaoFiscalConfigForm = {
  provedor: 'outro',
  ambiente: 'homologacao',
  certificado_configurado: false,
  status: 'nao_configurada',
  serie_nfe: '1',
  serie_nfce: '1',
  serie_nfse: '1',
}

export const FiscalService = {
  async obterConfig(): Promise<IntegracaoFiscalConfig | null> {
    const empresaId = await getEmpresaId()
    const { data, error } = await db().from('integracoes_fiscais_config').select('*').eq('empresa_id', empresaId).maybeSingle()
    if (error && !/does not exist|schema cache|relation/i.test(error.message || '')) throw normalizeError(error, 'Erro ao carregar configuração fiscal.')
    return (data as IntegracaoFiscalConfig | null) ?? null
  },

  async salvarConfig(form: IntegracaoFiscalConfigForm): Promise<IntegracaoFiscalConfig> {
    await assertPermission('configuracoes', 'editar')
    const empresaId = await getEmpresaId()
    const payload = normalizeEmptyValues({ ...DEFAULT_FISCAL, ...form, empresa_id: empresaId, updated_at: new Date().toISOString() } as any)
    const { data, error } = await db().from('integracoes_fiscais_config').upsert(payload, { onConflict: 'empresa_id' }).select('*').single()
    if (error) throw normalizeError(error, 'Erro ao salvar configuração fiscal. Aplique a migration 022 da V11 no Supabase.')
    await AuditoriaService.registrar('fiscal.config.salvar', 'integracoes_fiscais_config', data.id, { provedor: data.provedor, ambiente: data.ambiente, status: data.status }).catch(() => null)
    return data as IntegracaoFiscalConfig
  },

  async listarDocumentos(limit = 60): Promise<DocumentoFiscal[]> {
    const empresaId = await getEmpresaId()
    const { data, error } = await db().from('documentos_fiscais').select('*').eq('empresa_id', empresaId).order('created_at', { ascending: false }).limit(limit)
    if (error && !/does not exist|schema cache|relation/i.test(error.message || '')) throw normalizeError(error, 'Erro ao listar documentos fiscais.')
    return (data ?? []) as DocumentoFiscal[]
  },

  async criarRascunho(input: { tipo: DocumentoFiscalTipo; venda_id?: string; cliente_id?: string; payload_envio?: Record<string, any> }): Promise<DocumentoFiscal> {
    await assertPermission('notas-fiscais', 'criar')
    const empresaId = await getEmpresaId()
    const payload = normalizeEmptyValues({ empresa_id: empresaId, tipo: input.tipo, venda_id: input.venda_id, cliente_id: input.cliente_id, status: 'rascunho', payload_envio: input.payload_envio ?? {} } as any)
    const { data, error } = await db().from('documentos_fiscais').insert(payload).select('*').single()
    if (error) throw normalizeError(error, 'Erro ao criar rascunho fiscal. Aplique a migration 022 da V11 no Supabase.')
    await AuditoriaService.registrar('fiscal.documento.rascunho', 'documentos_fiscais', data.id, { tipo: input.tipo }).catch(() => null)
    return data as DocumentoFiscal
  },

  async diagnostico(): Promise<{ pronto: boolean; mensagens: string[]; config: IntegracaoFiscalConfig | null }> {
    const config = await this.obterConfig().catch(() => null)
    const mensagens: string[] = []
    if (!config) mensagens.push('Configuração fiscal ainda não criada. Aplique a migration 022 e preencha a aba fiscal em Configurações.')
    if (config && !config.cnpj) mensagens.push('Informe o CNPJ da empresa para futura emissão fiscal.')
    if (config && !config.certificado_configurado) mensagens.push('Certificado digital A1 ainda não configurado.')
    if (config && config.status !== 'ativa' && config.status !== 'homologacao') mensagens.push('Integração fiscal ainda não está ativa nem em homologação.')
    return { pronto: mensagens.length === 0, mensagens, config }
  },
}
