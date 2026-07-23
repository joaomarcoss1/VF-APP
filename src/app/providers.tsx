'use client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect, useState, type ReactNode } from 'react'
import { Toaster } from 'react-hot-toast'
import OfflineBanner from '@/components/mobile/OfflineBanner'
import InstallAppPrompt from '@/components/mobile/InstallAppPrompt'
import { VFThemeProvider } from '@/components/theme/ThemeProvider'
import { TenantProvider } from '@/contexts/TenantProvider'
import { AppErrorBoundary } from '@/components/feedback/AppErrorBoundary'
export default function Providers({children}:{children:ReactNode}){
 useEffect(()=>{if(!('serviceWorker'in navigator))return;let cancelled=false;const register=()=>{if(cancelled)return;navigator.serviceWorker.register('/sw.js',{updateViaCache:'none'}).then(r=>r.update()).catch(e=>console.warn('Service Worker indisponível',e))}; if(document.readyState==='complete')register();else window.addEventListener('load',register,{once:true});return()=>{cancelled=true;window.removeEventListener('load',register)}},[])
 const [queryClient]=useState(()=>new QueryClient({defaultOptions:{queries:{staleTime:60_000,retry:1,refetchOnWindowFocus:false,refetchOnReconnect:true},mutations:{retry:0}}}))
 return <QueryClientProvider client={queryClient}><VFThemeProvider><TenantProvider><AppErrorBoundary>{children}</AppErrorBoundary></TenantProvider></VFThemeProvider><OfflineBanner/><InstallAppPrompt/><Toaster position="top-right" toastOptions={{duration:4200,style:{background:'var(--vf-surface-elevated)',color:'var(--vf-text)',border:'1px solid var(--vf-border)',borderRadius:'14px',fontSize:'13px',maxWidth:'min(420px,calc(100vw - 24px))'}}}/></QueryClientProvider>
}
