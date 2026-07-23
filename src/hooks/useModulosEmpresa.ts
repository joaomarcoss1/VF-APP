'use client'
import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ModulosEmpresaService } from '@/services/modulos-empresa'
import type { ModuloCodigo } from '@/config/ramos'
function safe(key:string){if(typeof window==='undefined')return'';try{return localStorage.getItem(key)||''}catch{return''}}
export function useModulosEmpresa(){
 const [empresaKey,setEmpresaKey]=useState('boot')
 useEffect(()=>{const read=()=>setEmpresaKey(safe('vf_nexus_empresa_operacional')||safe('vf_nexus_empresa_id')||'profile');read();window.addEventListener('storage',read);window.addEventListener('vf-nexus-empresa-operacional-change',read);return()=>{window.removeEventListener('storage',read);window.removeEventListener('vf-nexus-empresa-operacional-change',read)}},[])
 const query=useQuery({queryKey:['empresa-modulos-visiveis-v9-3',empresaKey],queryFn:ModulosEmpresaService.obterContexto,enabled:empresaKey!=='boot',retry:1,staleTime:5*60_000,gcTime:15*60_000,refetchOnWindowFocus:false})
 const modules=query.data?.modules??[];const visibleFeatures=query.data?.features??[];const set=useMemo(()=>new Set(modules),[modules]);const firstHref=visibleFeatures.find(f=>f.href!=='/master-admin')?.href??'/dashboard'
 return {...query,isLoading:empresaKey==='boot'||query.isLoading,isReady:Boolean(query.data&&!query.error),contexto:query.data??null,ramo:query.data?.ramo??null,modules,visibleFeatures,firstHref,hasModule:(m:ModuloCodigo|string)=>set.has(m as ModuloCodigo)||visibleFeatures.some(f=>f.key===m)}
}
