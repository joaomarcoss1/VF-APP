'use client'

import { Suspense } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import BrandLogo from '@/components/BrandLogo'
import { ThemeToggle } from '@/components/theme/ThemeToggle'
import { getRamoDefinition, getStoredInitialRamo, persistInitialRamo, type RamoAtividade } from '@/config/ramos'
import { getSupabase, getSupabaseEnvStatus } from '@/lib/supabase'
import { MultiempresaService, normalizarPapel } from '@/services'
import { setEmpresaSelecionadaMaster } from '@/services/_tenant'
import toast from 'react-hot-toast'
import { ArrowLeft, Building2, LockKeyhole, UserRound } from 'lucide-react'

function LoginPageContent() {
  const router = useRouter()
  const search = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [codigoEmpresa, setCodigoEmpresa] = useState('')
  const [loading, setLoading] = useState(false)
  const [selectedRamo, setSelectedRamo] = useState(getRamoDefinition('bar_restaurante'))
  const env = getSupabaseEnvStatus()

  useEffect(() => {
    const ramoParam = search.get('ramo')
    const ramo = getRamoDefinition(ramoParam || getStoredInitialRamo().id)
    setSelectedRamo(ramo)
    persistInitialRamo(ramo.id as RamoAtividade)
  }, [search])

  const ramoStyle = useMemo(() => ({ '--ramo-color': selectedRamo.color } as React.CSSProperties), [selectedRamo.color])

  async function resolveEmpresaByCodigo(codigo: string, perfil: any) {
    const supabase = getSupabase()
    const clean = codigo.trim()
    if (!clean) return null
    const empresaQuery = perfil.is_master
      ? supabase.from('empresas').select('id,codigo_empresa,matricula_empresa,ramo_atividade,tipo,nome,nome_fantasia').or(`codigo_empresa.eq.${clean},matricula_empresa.eq.${clean}`).maybeSingle()
      : supabase.from('empresas').select('id,codigo_empresa,matricula_empresa,ramo_atividade,tipo,nome,nome_fantasia').eq('id', perfil.empresa_id).maybeSingle()
    const { data: empresa, error } = await empresaQuery
    if (error) throw error
    const codigoOk = [empresa?.codigo_empresa, empresa?.matricula_empresa].filter(Boolean).map(String).map(v => v.toLowerCase()).includes(clean.toLowerCase())
    if (!codigoOk) throw new Error('Código/matrícula da empresa não corresponde ao seu usuário.')
    return empresa
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      if (!env.ok) throw new Error(env.message)
      const supabase = getSupabase()
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error

      const perfil = await MultiempresaService.registrarLogin()
      if (!perfil) throw new Error('Perfil não encontrado. Solicite ao Admin Master o vínculo com uma empresa.')

      let empresa: any = null
      if (codigoEmpresa.trim()) {
        empresa = await resolveEmpresaByCodigo(codigoEmpresa, perfil)
        if (empresa?.id && perfil.is_master) {
          await setEmpresaSelecionadaMaster({
            id: empresa.id,
            nome: empresa.nome_fantasia || empresa.nome,
            codigo_empresa: empresa.codigo_empresa || null,
            matricula_empresa: empresa.matricula_empresa || null,
            ramo_atividade: empresa.ramo_atividade || empresa.tipo || null,
          })
        }
      } else {
        localStorage.removeItem('vf_nexus_empresa_codigo')
        if (!perfil.is_master && perfil.empresa_id) {
          const { data } = await supabase.from('empresas').select('id,ramo_atividade,tipo,nome,nome_fantasia').eq('id', perfil.empresa_id).maybeSingle()
          empresa = data
        }
      }

      const ramoReal = getRamoDefinition(empresa?.ramo_atividade || empresa?.tipo || selectedRamo.id)
      persistInitialRamo(ramoReal.id as RamoAtividade)

      const role = normalizarPapel(perfil.cargo, Boolean(perfil.is_master))
      toast.success('Login realizado com segurança.')
      const next = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('next') : null
      if (next && next.startsWith('/')) return router.replace(next)
      router.replace(role === 'driver' ? '/portal-entregador' : role === 'super_admin' ? '/master' : '/dashboard')
    } catch (err: any) {
      await getSupabase().auth.signOut().catch(() => null)
      toast.error(err.message ?? 'Erro ao entrar.')
    } finally {
      setLoading(false)
    }
  }

  async function resetPassword() {
    try {
      if (!email) return toast.error('Informe seu e-mail primeiro.')
      const { error } = await getSupabase().auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}/auth/callback?next=/configuracoes` })
      if (error) throw error
      toast.success('Enviamos o link de recuperação para seu e-mail.')
    } catch (err: any) {
      toast.error(err.message ?? 'Não foi possível enviar o link.')
    }
  }

  return (
    <main className="vf-ramo-screen min-h-dvh overflow-hidden p-4 text-[var(--vf-text)] vf-theme-transition" style={ramoStyle}>
      <section className="mx-auto grid min-h-[calc(100dvh-2rem)] w-full max-w-6xl overflow-hidden rounded-[34px] border border-white/10 bg-[var(--vf-card)]/[.04] shadow-2xl shadow-black/30 backdrop-blur-xl md:grid-cols-[1fr,460px]">
        <div className="hidden flex-col justify-between p-8 text-white md:flex lg:p-10">
          <div className="flex items-center justify-between gap-3">
            <button onClick={() => router.push('/selecionar-ramo')} className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-[var(--vf-card)]/10 px-4 py-2 text-xs font-black text-slate-100 transition hover:bg-[var(--vf-card)]/15"><ArrowLeft size={15} /> Trocar ramo</button>
            <ThemeToggle compact />
          </div>
          <div className="max-w-lg">
            <div className="mb-5 flex items-center gap-3">
              <div className="grid h-16 w-16 place-items-center rounded-3xl bg-[var(--vf-card)] text-4xl shadow-2xl shadow-black/30">{selectedRamo.icon}</div>
              <div>
                <span className="text-xs font-black uppercase tracking-[.24em] text-amber-200">{selectedRamo.nome}</span>
                <strong className="block text-2xl">VF Nexus</strong>
              </div>
            </div>
            <h1 className="text-5xl font-black leading-[.96] tracking-tight">{selectedRamo.loginTitle}</h1>
            <p className="mt-5 text-base font-semibold leading-8 text-[var(--vf-text3)]">{selectedRamo.loginSubtitle}</p>
            <div className="mt-8 grid grid-cols-2 gap-3">
              {selectedRamo.dashboardCards.slice(0, 4).map((card) => <div key={card.label} className="rounded-3xl border border-white/10 bg-[var(--vf-card)]/10 p-4 backdrop-blur"><span className="text-2xl">{card.icon}</span><strong className="mt-2 block text-sm">{card.label}</strong><p className="mt-1 text-xs font-semibold text-[var(--vf-text3)]">{card.hint}</p></div>)}
            </div>
          </div>
          <p className="text-xs font-semibold text-[var(--vf-text3)]">© VF Nexus · Tecnologia NexLabs</p>
        </div>

        <div className="bg-[color-mix(in_srgb,var(--vf-surface)_92%,transparent)] p-6 md:p-9">
          <div className="mb-7 flex items-center justify-between gap-3 md:hidden">
            <button onClick={() => router.push('/selecionar-ramo')} className="inline-flex items-center gap-2 rounded-2xl border border-[var(--vf-border)] bg-[var(--vf-surface2)] px-3 py-2 text-xs font-black"><ArrowLeft size={15} /> Ramo</button>
            <ThemeToggle compact />
          </div>
          <div className="flex justify-center md:justify-start">
            <div className="grid h-16 w-16 place-items-center rounded-3xl bg-[var(--vf-card)] p-1.5 shadow-xl"><BrandLogo src="/nexlabs-logo.png" alt="VF Nexus" className="h-full w-full object-contain" /></div>
          </div>
          <div className="mt-5 text-center md:text-left">
            <span className="inline-flex rounded-full bg-[color-mix(in_srgb,var(--vf-secondary)_14%,transparent)] px-3 py-1 text-xs font-black uppercase tracking-[.16em] text-[var(--vf-secondary)]">{selectedRamo.nome}</span>
            <h2 className="mt-4 text-3xl font-black leading-tight text-[var(--vf-text)]">Acesse sua conta</h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-[var(--vf-text3)]">O sistema vai carregar somente as funções do ramo e da empresa vinculada.</p>
          </div>
          {!env.ok && <div className="mt-4 rounded-2xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">{env.message}</div>}
          <form onSubmit={handleLogin} className="mt-7 space-y-4">
            <label className="block"><span className="text-xs font-black uppercase tracking-wide text-[var(--vf-text3)]">E-mail</span><div className="relative mt-2"><UserRound className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--vf-text3)]" size={17} /><input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="seu@email.com" className="vf-input h-12 pl-11" /></div></label>
            <label className="block"><span className="text-xs font-black uppercase tracking-wide text-[var(--vf-text3)]">Senha</span><div className="relative mt-2"><LockKeyhole className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--vf-text3)]" size={17} /><input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} placeholder="••••••••" className="vf-input h-12 pl-11" /></div></label>
            <label className="block"><span className="text-xs font-black uppercase tracking-wide text-[var(--vf-text3)]">Código/matrícula da empresa</span><div className="relative mt-2"><Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--vf-text3)]" size={17} /><input value={codigoEmpresa} onChange={e => setCodigoEmpresa(e.target.value)} placeholder="Ex: VF-0001" className="vf-input h-12 pl-11" /></div></label>
            <div className="flex items-center justify-between gap-3"><a href="/atendimento/login-funcionario" className="text-xs font-black text-[var(--vf-primary)] hover:underline">Login operacional</a><button type="button" onClick={resetPassword} className="text-xs font-black text-[var(--vf-primary)] hover:underline">Esqueci minha senha</button></div>
            <button disabled={loading} className="h-12 w-full rounded-2xl bg-gradient-to-r from-blue-600 to-sky-500 font-black text-white shadow-lg shadow-blue-600/25 transition hover:-translate-y-0.5 disabled:opacity-50">{loading ? 'Entrando...' : 'Entrar'}</button>
          </form>
          <p className="mt-7 text-center text-xs font-semibold text-[var(--vf-text3)]">Funções de outros ramos ficam ocultas. O Admin Master controla módulos extras.</p>
        </div>
      </section>
    </main>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="grid min-h-dvh place-items-center bg-[var(--vf-bg)] p-6 text-[var(--vf-text)]">
          <div className="vf-card px-6 py-5 text-sm font-bold">Carregando login...</div>
        </main>
      }
    >
      <LoginPageContent />
    </Suspense>
  )
}
