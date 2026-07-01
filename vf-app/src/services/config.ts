import type { Configuracoes } from '@/types'
import type { FeatureKey, SectorModuleConfig } from '@/lib/modules'
import { buildDefaultSectorModuleRows, FEATURE_DEFINITIONS } from '@/lib/modules'
import { db, getEmpresaId, normalizeEmptyValues, normalizeError } from './_base'

export const ConfigService = {
  async listar(): Promise<Configuracoes | null> { return this.obter() },
  async obter(): Promise<Configuracoes | null> {
    const empresaId = await getEmpresaId()
    const { data, error } = await db().from('configuracoes').select('*').eq('empresa_id', empresaId).maybeSingle()
    if (error) throw normalizeError(error, 'Erro ao carregar configurações.')
    return (data as Configuracoes | null) ?? null
  },
  async salvar(config: Partial<Configuracoes>): Promise<void> {
    const empresaId = await getEmpresaId()
    const payload = normalizeEmptyValues({ ...config, empresa_id: empresaId, updated_at: new Date().toISOString() } as any)
    const { error } = await db().from('configuracoes').upsert(payload, { onConflict: 'empresa_id' })
    if (error) throw normalizeError(error, 'Erro ao salvar configurações.')
  },
  async empresa(): Promise<{ id: string; nome: string; tipo: string } | null> {
    const empresaId = await getEmpresaId()
    const { data, error } = await db().from('empresas').select('id,nome,tipo').eq('id', empresaId).maybeSingle()
    if (error) throw normalizeError(error, 'Erro ao carregar empresa.')
    return (data as { id: string; nome: string; tipo: string } | null) ?? null
  },
  async salvarEmpresa(empresa: { nome?: string; tipo?: string }): Promise<void> {
    const empresaId = await getEmpresaId()
    const { error } = await db().from('empresas').update({ ...normalizeEmptyValues(empresa as any), updated_at: new Date().toISOString() }).eq('id', empresaId)
    if (error) throw normalizeError(error, 'Erro ao salvar empresa.')
  },
}

export const FeatureConfigService = {
  async listar(): Promise<SectorModuleConfig[]> {
    const baseDefaults = buildDefaultSectorModuleRows()
    const { data, error } = await db().from('setor_modulos').select('tipo_empresa,modulo,ativo,ordem,updated_at').order('tipo_empresa').order('ordem')
    let rows = (!error && data?.length ? data : baseDefaults) as SectorModuleConfig[]
    try {
      const empresaId = await getEmpresaId()
      const { data: empresa } = await db().from('empresas').select('tipo').eq('id', empresaId).maybeSingle()
      const tipoEmpresa = (empresa as any)?.tipo
      if (!tipoEmpresa) return rows
      const { data: overrides, error: overrideError } = await db().from('empresa_modulos').select('modulo,ativo,ordem,updated_at').eq('empresa_id', empresaId)
      if (overrideError || !overrides?.length) return rows
      rows = rows.map(r => {
        if (r.tipo_empresa !== tipoEmpresa) return r
        const override = overrides.find((o: any) => o.modulo === r.modulo)
        return override ? { ...r, ativo: Boolean(override.ativo), ordem: Number(override.ordem ?? r.ordem), updated_at: override.updated_at ?? r.updated_at } : r
      })
    } catch {}
    return rows
  },
  async listarPorSetor(tipoEmpresa: string): Promise<SectorModuleConfig[]> { return (await this.listar()).filter(r => r.tipo_empresa === tipoEmpresa) },
  async modulosAtivos(tipoEmpresa: string): Promise<FeatureKey[]> { return (await this.listarPorSetor(tipoEmpresa)).filter(r => r.ativo).map(r => r.modulo) },
  async definicoes() { return FEATURE_DEFINITIONS },
}
