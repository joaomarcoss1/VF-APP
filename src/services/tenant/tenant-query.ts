import { db, normalizeError, type AnyRecord } from '@/services/_base'
import { getEmpresaIdObrigatoria } from './tenant-context'
export type PageRequest = { page?: number; pageSize?: number; search?: string; orderBy?: string; ascending?: boolean }
export type PageResult<T> = { data: T[]; page: number; pageSize: number; total: number; hasMore: boolean }
const pageBounds=(page=1,pageSize=25)=>({page:Math.max(1,page),pageSize:Math.min(100,Math.max(1,pageSize)),from:(Math.max(1,page)-1)*Math.min(100,Math.max(1,pageSize)),to:Math.max(1,page)*Math.min(100,Math.max(1,pageSize))-1})
export async function tenantPage<T=AnyRecord>(table:string, columns='*', request:PageRequest={}, configure?:(query:any)=>any):Promise<PageResult<T>>{
  const empresaId=await getEmpresaIdObrigatoria(); const b=pageBounds(request.page,request.pageSize)
  let q:any=db().from(table).select(columns,{count:'exact'}).eq('empresa_id',empresaId)
  if(configure) q=configure(q)
  q=q.order(request.orderBy||'created_at',{ascending:request.ascending??false}).range(b.from,b.to)
  const {data,error,count}=await q; if(error) throw normalizeError(error,`Não foi possível carregar ${table}.`)
  return {data:(data??[]) as T[],page:b.page,pageSize:b.pageSize,total:count??0,hasMore:b.to+1<(count??0)}
}
export async function tenantInsert<T=AnyRecord>(table:string,payload:AnyRecord,columns='*'):Promise<T>{ const empresaId=await getEmpresaIdObrigatoria(); const clean={...payload}; delete clean.empresa_id; delete clean.company_id; const {data,error}=await db().from(table).insert({...clean,empresa_id:empresaId}).select(columns).single(); if(error) throw normalizeError(error,`Não foi possível salvar ${table}.`); return data as T }
export async function tenantUpdate<T=AnyRecord>(table:string,id:string,payload:AnyRecord,columns='*'):Promise<T>{ const empresaId=await getEmpresaIdObrigatoria(); const clean={...payload}; delete clean.empresa_id; delete clean.company_id; const {data,error}=await db().from(table).update({...clean,updated_at:new Date().toISOString()}).eq('empresa_id',empresaId).eq('id',id).select(columns).maybeSingle(); if(error) throw normalizeError(error,`Não foi possível atualizar ${table}.`); if(!data) throw new Error('Registro não encontrado nesta empresa.'); return data as T }
export async function tenantDelete(table:string,id:string):Promise<void>{ const empresaId=await getEmpresaIdObrigatoria(); const {error}=await db().from(table).delete().eq('empresa_id',empresaId).eq('id',id); if(error) throw normalizeError(error,`Não foi possível excluir ${table}.`) }
export async function tenantRpc<T=unknown>(name:string,params:AnyRecord={}):Promise<T>{ const empresaId=await getEmpresaIdObrigatoria(); const {data,error}=await db().rpc(name,{...params,p_empresa_id:params.p_empresa_id??empresaId}); if(error) throw normalizeError(error,`Não foi possível executar ${name}.`); return data as T }
