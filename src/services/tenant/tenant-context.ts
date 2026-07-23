import { db, normalizeError } from '@/services/_base'
import {
  getTenantContext, getEmpresaIdObrigatoria, getEmpresaSelecionadaMasterDetalhes,
  setEmpresaSelecionadaMaster, clearEmpresaSelecionadaMaster, type EmpresaSelecionadaMaster,
} from '@/services/_tenant'
export { getTenantContext, getEmpresaIdObrigatoria, getEmpresaSelecionadaMasterDetalhes, setEmpresaSelecionadaMaster, clearEmpresaSelecionadaMaster }
export type { EmpresaSelecionadaMaster }
export async function getEmpresaAtual() {
  const empresaId = await getEmpresaIdObrigatoria()
  const { data, error } = await db().from('empresas').select('id,nome,nome_fantasia,codigo_empresa,matricula_empresa,ramo_atividade,status').eq('id', empresaId).maybeSingle()
  if (error) throw normalizeError(error,'Não foi possível carregar a empresa atual.')
  if (!data) throw new Error('Empresa atual não encontrada.')
  return data
}
export async function requireTenant(){ const ctx=await getTenantContext(); if(!ctx.empresaId) throw new Error('Selecione ou vincule uma empresa para continuar.'); return ctx }
export async function requireMaster(){ const ctx=await getTenantContext(); if(!ctx.isSuperAdmin) throw new Error('Acesso restrito ao Admin Master.'); return ctx }
export async function requireCompanyAdmin(){ const ctx=await getTenantContext(); if(!ctx.isSuperAdmin && !ctx.isEmpresaAdmin && ctx.papel!=='gerente') throw new Error('Ação restrita à administração da empresa.'); return ctx }
