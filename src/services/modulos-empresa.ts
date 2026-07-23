import { db, getEmpresaId, getPerfilAtual, normalizeError } from './_base'
import { FEATURE_DEFINITIONS, pathToFeature, type FeatureDefinition, type FeatureKey } from '@/lib/modules'
import { getDefaultModulesForRamo, getRamoDefinition, mergeModules, moduleMatchesDefinition, ramoFromEmpresa, type ModuloCodigo, type RamoDefinition } from '@/config/ramos'

export type EmpresaModuloRow = {
  id?: string
  empresa_id: string
  modulo_codigo?: string | null
  modulo?: string | null
  ramo_origem?: string | null
  ativo: boolean
  liberado_por_master?: boolean | null
}

export type ModulosEmpresaContext = {
  empresaId: string | null
  ramo: RamoDefinition
  modules: ModuloCodigo[]
  features: FeatureDefinition[]
  isMaster: boolean
  rawOverrides: EmpresaModuloRow[]
}

function storedRamo() {
  if (typeof window === 'undefined') return getRamoDefinition('bar_restaurante')
  return getRamoDefinition(window.localStorage.getItem('vf_nexus_ramo_inicial'))
}

function moduleToFeature(module: ModuloCodigo): FeatureDefinition | null {
  return FEATURE_DEFINITIONS.find((feature) => moduleMatchesDefinition(module, feature)) ?? null
}


export function normalizeModuloCodigo(value?: string | null): string {
  return String(value || '').trim().replace(/^\/+/, '').replace(/\//g, '-').replace(/_/g, '_')
}

export function getModuloCodigoFromRecord(row: Partial<EmpresaModuloRow> | any): string {
  return normalizeModuloCodigo(row?.modulo_codigo || row?.modulo)
}

export function buildEmpresaModuloPayload(input: { empresa_id: string; modulo_codigo: string; ramo_origem?: string | null; ativo: boolean; liberado_por_master?: boolean | null; created_at?: string; updated_at?: string }) {
  const moduloCodigo = normalizeModuloCodigo(input.modulo_codigo)
  return {
    empresa_id: input.empresa_id,
    modulo: moduloCodigo,
    modulo_codigo: moduloCodigo,
    ramo_origem: input.ramo_origem ?? null,
    ativo: Boolean(input.ativo),
    liberado_por_master: input.liberado_por_master ?? true,
    created_at: input.created_at,
    updated_at: input.updated_at,
  }
}

export const ModulosEmpresaService = {
  async obterContexto(): Promise<ModulosEmpresaContext> {
    const perfil = await getPerfilAtual().catch(() => null)
    const isMaster = Boolean(perfil?.is_master || perfil?.cargo === 'master_admin' || perfil?.cargo === 'super_admin')
    let empresaId: string | null = null
    let empresa: any = null

    try {
      empresaId = await getEmpresaId()
    } catch (error) {
      if (!isMaster) throw error
      empresaId = null
    }
    if (empresaId) {
      const { data, error } = await db().from('empresas').select('id,nome,nome_fantasia,tipo,ramo_atividade,codigo_empresa,matricula_empresa').eq('id', empresaId).maybeSingle()
      if (error) throw normalizeError(error, 'Não foi possível carregar a empresa operacional.')
      if (!data) throw new Error('Empresa operacional não encontrada.')
      empresa = data
    }

    const ramo = empresa ? ramoFromEmpresa(empresa) : storedRamo()
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('vf_nexus_ramo_inicial', ramo.id)
      window.localStorage.setItem('vf_nexus_ramo_nome', ramo.nome)
    }

    let overrides: EmpresaModuloRow[] = []
    if (empresaId) {
      const { data, error } = await db().from('empresa_modulos').select('*').eq('empresa_id', empresaId)
      if (!error) overrides = (data ?? []) as EmpresaModuloRow[]
    }

    const modules = empresaId ? mergeModules(getDefaultModulesForRamo(ramo.id), overrides) : []
    const featureMap = new Map<string, FeatureDefinition>()
    for (const modulo of modules) {
      const feature = moduleToFeature(modulo)
      if (feature && !feature.masterOnly) featureMap.set(feature.key, feature)
    }
    if (isMaster) {
      const master = FEATURE_DEFINITIONS.find((f) => f.key === 'master-admin')
      if (master) featureMap.set(master.key, master)
    }

    const features = Array.from(featureMap.values()).sort((a, b) => FEATURE_DEFINITIONS.findIndex((f) => f.key === a.key) - FEATURE_DEFINITIONS.findIndex((f) => f.key === b.key))
    return { empresaId, ramo, modules, features, isMaster, rawOverrides: overrides }
  },

  async moduloVisivel(modulo: ModuloCodigo | FeatureKey): Promise<boolean> {
    const ctx = await this.obterContexto()
    return ctx.modules.includes(modulo as ModuloCodigo) || ctx.features.some((feature) => feature.key === modulo)
  },

  async rotaLiberada(pathname: string): Promise<boolean> {
    const feature = pathToFeature(pathname)
    if (!feature) return true
    const ctx = await this.obterContexto()
    return ctx.features.some((item) => item.key === feature)
  },

  async listarModulosEmpresa(empresaId: string): Promise<EmpresaModuloRow[]> {
    const perfil = await getPerfilAtual()
    if (!perfil?.is_master && perfil?.cargo !== 'master_admin' && perfil?.cargo !== 'super_admin') throw new Error('Somente o Admin Master pode consultar módulos por empresa.')
    const { data, error } = await db().from('empresa_modulos').select('*').eq('empresa_id', empresaId).order('created_at', { ascending: true })
    if (error) throw normalizeError(error, 'Erro ao carregar módulos salvos da empresa.')
    return (data ?? []).map((row: any) => ({ ...row, modulo_codigo: getModuloCodigoFromRecord(row) })) as EmpresaModuloRow[]
  },

  async atualizarModulosEmpresa(empresaId: string, ramo: string, modules: Array<{ modulo_codigo: string; ativo: boolean }>) {
    const perfil = await getPerfilAtual()
    if (!perfil?.is_master && perfil?.cargo !== 'master_admin' && perfil?.cargo !== 'super_admin') throw new Error('Somente o Admin Master pode alterar módulos por empresa.')
    const now = new Date().toISOString()
    const payload = modules.map((module) => buildEmpresaModuloPayload({ empresa_id: empresaId, modulo_codigo: module.modulo_codigo, ramo_origem: ramo, ativo: module.ativo, liberado_por_master: true, updated_at: now, created_at: now }))
    const { error } = await db().from('empresa_modulos').upsert(payload, { onConflict: 'empresa_id,modulo_codigo' })
    if (error) throw normalizeError(error, 'Erro ao salvar módulos da empresa.')
    await db().from('empresas').update({ ramo_atividade: ramo, updated_at: now }).eq('id', empresaId).throwOnError()
    return true
  },
}
