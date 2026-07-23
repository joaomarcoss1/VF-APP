'use client'
import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Building2, LockKeyhole, RefreshCw, ShieldAlert } from 'lucide-react'
import Sidebar from '@/components/layout/Sidebar'
import MobileNav from '@/components/layout/MobileNav'
import { AssinaturaService, IdentidadeService } from '@/services'
import { Alert, Button, Card, ErrorState, Skeleton } from '@/components/ui'
import { fmtCurrency } from '@/lib/precificacao'
import { usePathname, useRouter } from 'next/navigation'
import { pathToFeature } from '@/lib/modules'
import { applyBrandingVars, cacheBranding, readCachedBranding } from '@/lib/branding'
import { canAccessPath } from '@/lib/rbac'
import { useModulosEmpresa } from '@/hooks/useModulosEmpresa'
import { useTenant } from '@/hooks/useTenant'

function LoadingEnvironment(){return <div className="vf-environment-state"><Card className="vf-environment-card"><Skeleton className="h-12 w-12 rounded-2xl"/><div><h1>Carregando seu ambiente</h1><p>Validando usuário, empresa, módulos e permissões.</p></div><div className="vf-loading-lines"><Skeleton/><Skeleton/><Skeleton/></div></Card></div>}
export default function AppShell({children}:{children:React.ReactNode}){
 const pathname=usePathname();const router=useRouter();const[clientReady,setClientReady]=useState(false);useEffect(()=>setClientReady(true),[])
 const tenant=useTenant();const modules=useModulosEmpresa();const isMaster=Boolean(tenant.data?.isSuperAdmin);const hasOperationalTenant=Boolean(tenant.data?.empresaId)
 const identidadeQ=useQuery({queryKey:['identidade-global',tenant.operationalKey],queryFn:IdentidadeService.obter,retry:1,enabled:tenant.status==='ready'&&(!isMaster||hasOperationalTenant)})
 const assinaturaQ=useQuery({queryKey:['minha-assinatura',tenant.operationalKey],queryFn:AssinaturaService.minhaAssinatura,retry:1,enabled:tenant.status==='ready'&&(!isMaster||hasOperationalTenant)})
 useEffect(()=>{applyBrandingVars(readCachedBranding())},[]);useEffect(()=>{if(identidadeQ.data){applyBrandingVars(identidadeQ.data,{persist:true});cacheBranding(identidadeQ.data)}},[identidadeQ.data])
 const perfil=tenant.data?.perfil;const rotaMaster=pathname.startsWith('/master');const rotaLivre=pathname==='/onboarding'||pathname.startsWith('/assinatura')||pathname.startsWith('/suporte')||pathname.startsWith('/diagnostico')
 const masterSemEmpresa=Boolean(clientReady&&tenant.status==='ready'&&isMaster&&!rotaMaster&&!rotaLivre&&!tenant.data?.empresaId)
 useEffect(()=>{if(masterSemEmpresa)router.replace('/master/empresas')},[masterSemEmpresa,router])
 const currentFeature=pathToFeature(pathname);const featureKeys=modules.visibleFeatures.map(f=>f.key);const modulesReady=modules.isReady;const moduleNotVisible=Boolean(currentFeature&&modulesReady&&!featureKeys.includes(currentFeature));const permissionDenied=Boolean(currentFeature&&modulesReady&&perfil&&!moduleNotVisible&&!canAccessPath(perfil,pathname,featureKeys))
 useEffect(()=>{if(moduleNotVisible&&modules.firstHref&&pathname!==modules.firstHref)router.replace(modules.firstHref)},[moduleNotVisible,modules.firstHref,pathname,router])
 const semEmpresa=Boolean(tenant.status==='ready'&&!isMaster&&!tenant.data?.empresaId)
 const billing=(assinaturaQ.data as any)?.status_billing;const status=String((assinaturaQ.data as any)?.status||'').toLowerCase();const bloqueada=!rotaLivre&&Boolean(billing?.blocked||['bloqueada','vencida','unpaid','canceled','blocked','trial_desativado'].includes(status))&&!Boolean((assinaturaQ.data as any)?.cobranca_abolida||billing?.cobranca_abolida||billing?.trial_indeterminado)
 const bootLoading=!clientReady||tenant.status==='initializing'||tenant.status==='loading'||modules.isLoading
 const bootError=tenant.status==='error'?tenant.error:modules.error as Error|null
 const retry=()=>Promise.all([tenant.refetch(),modules.refetch(),identidadeQ.refetch(),assinaturaQ.refetch()])
 if(pathname==='/onboarding')return <div className="min-h-screen bg-[var(--vf-bg)]">{children}</div>
 if(bootLoading)return <LoadingEnvironment/>
 if(bootError)return <div className="vf-environment-state"><ErrorState title="Não foi possível carregar seu ambiente" description={bootError.message} onRetry={()=>void retry()}/></div>
 return <div className="vf-app-shell" data-vf-ready="true"><Sidebar/><div className="vf-app-column"><main className="vf-main">
 {masterSemEmpresa?<div className="vf-environment-state"><Card className="vf-environment-card"><Building2/><h1>Selecione uma empresa para operar</h1><p>O painel operacional só é liberado depois que o Admin Master escolhe uma empresa.</p><Button onClick={()=>router.push('/master/empresas')}>Selecionar empresa</Button></Card></div>:
 semEmpresa?<div className="vf-environment-state"><Card className="vf-environment-card"><ShieldAlert/><h1>Conta sem empresa vinculada</h1><p>Peça ao Admin Master para vincular esta conta a uma empresa.</p><Button variant="secondary" onClick={()=>router.push('/login')}>Voltar ao login</Button></Card></div>:
 bloqueada?<div className="vf-environment-state"><Card className="vf-environment-card"><LockKeyhole/><h1>Assinatura bloqueada ou vencida</h1><p>Regularize a assinatura para continuar.</p><div className="vf-billing-summary"><span>Status <b>{billing?.status||status||'bloqueado'}</b></span><span>Valor <b>{fmtCurrency(Number((assinaturaQ.data as any)?.valor_mensal||(assinaturaQ.data as any)?.valor||0))}</b></span></div><div className="vf-inline-actions"><Button onClick={()=>router.push('/assinatura')}>Ver assinatura</Button><Button variant="secondary" onClick={()=>void retry()}><RefreshCw size={16}/>Tentar novamente</Button></div></Card></div>:
 moduleNotVisible?<LoadingEnvironment/>:
 permissionDenied?<div className="vf-environment-state"><Card className="vf-environment-card"><ShieldAlert/><h1>Permissão não liberada</h1><Alert type="warn">Este módulo não está liberado para o seu cargo.</Alert><Button onClick={()=>router.push(modules.firstHref)}>Ir para módulo disponível</Button></Card></div>:
 children}
 </main></div><MobileNav/></div>
}
