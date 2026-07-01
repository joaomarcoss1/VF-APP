'use client'
import { useState } from 'react'
import BrandLogo from '@/components/BrandLogo'
import { useRouter } from 'next/navigation'
import { getSupabase, getSupabaseEnvStatus } from '@/lib/supabase'
import { SECTOR_OPTIONS, getSectorProfile } from '@/lib/modules'
import type { TipoEmpresa } from '@/types'
import toast from 'react-hot-toast'

type Mode = 'login' | 'register' | 'reset'

export default function AuthPage() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nome, setNome] = useState('')
  const [empresaNome, setEmpresaNome] = useState('')
  const [tipoEmpresa, setTipoEmpresa] = useState<TipoEmpresa>('prestador_servico')
  const [usaAgendamentos, setUsaAgendamentos] = useState(true)
  const [usaEstoque, setUsaEstoque] = useState(true)
  const [usaInsumos, setUsaInsumos] = useState(false)
  const [usaCatalogoEventos, setUsaCatalogoEventos] = useState(false)
  const [loading, setLoading] = useState(false)

  const envStatus = getSupabaseEnvStatus()
  const sector = getSectorProfile(tipoEmpresa)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (!envStatus.ok) throw new Error(envStatus.message)
      const supabase = getSupabase()
      if (mode === 'register') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: nome,
              nome_empresa: empresaNome || `Empresa de ${nome || email.split('@')[0]}`,
              tipo_empresa: tipoEmpresa,
              usa_agendamentos: usaAgendamentos,
              usa_estoque: usaEstoque,
              usa_insumos: usaInsumos,
              usa_catalogo_eventos: usaCatalogoEventos,
              onboarding_origem: 'cadastro_vf_nexus',
            }
          }
        })
        if (error) throw error
        toast.success('Conta criada! Seu painel será configurado conforme o ramo informado.')
        setMode('login')
      } else if (mode === 'reset') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${location.origin}/auth/callback?next=/configuracoes`
        })
        if (error) throw error
        toast.success('Link de recuperação enviado para seu e-mail.')
        setMode('login')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        router.push('/dashboard')
      }
    } catch (err: any) {
      toast.error(err.message ?? 'Erro ao autenticar')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = async () => {
    if (!envStatus.ok) return toast.error(envStatus.message)
    const supabase = getSupabase()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${location.origin}/auth/callback` }
    })
    if (error) toast.error(error.message)
  }

  return (
    <div className="min-h-screen bg-[var(--vf-bg)] flex flex-col md:flex-row overflow-hidden">
      <div className="hidden md:flex flex-col justify-between w-1/2 p-12 bg-[radial-gradient(circle_at_30%_20%,rgba(10,141,255,0.22),transparent_34%),radial-gradient(circle_at_72%_62%,rgba(242,183,46,0.18),transparent_32%),#04070D] border-r border-[rgba(10,141,255,0.2)] relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.08]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.09) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.09) 1px, transparent 1px)', backgroundSize: '36px 36px' }} />
        <div className="flex items-center gap-4 relative">
          <div className="vf-logo-soft w-[88px] h-[88px] flex items-center justify-center p-3"><BrandLogo src="/nexlabs-logo-full.png" alt="NexLabs" variant="full" width={72} height={72} className="w-full h-full object-contain" /></div>
          <div>
            <div className="text-[var(--vf-text)] font-semibold tracking-widest text-sm">VF NEXUS</div>
            <div className="text-[var(--vf-secondary)] text-xs tracking-widest uppercase">Criado pela NexLabs</div>
          </div>
        </div>
        <div className="relative max-w-xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-[rgba(10,141,255,0.35)] bg-[rgba(10,141,255,0.08)] px-4 py-2 text-xs text-[#BBDFFF] mb-6">✦ Gestão SaaS multirramo</span>
          <h1 className="text-4xl lg:text-5xl font-bold text-[var(--vf-text)] mb-4 leading-tight">
            Um sistema para<br />cada tipo de <span className="vf-nex-text">negócio</span>
          </h1>
          <p className="text-slate-300 text-base leading-relaxed mb-8">
            O VF Nexus adapta produtos, agenda, estoque, vendas, relatórios e módulos conforme o ramo da empresa. Menos telas desnecessárias, mais gestão de verdade.
          </p>
          <div className="grid grid-cols-2 gap-4">
            {[
              { val: '5', label: 'perguntas para configurar o painel' },
              { val: 'PDF',  label: 'comprovantes premium' },
              { val: 'PWA', label: 'instalável no celular' },
              { val: 'IA', label: 'gestão e insights' },
            ].map(({ val, label }) => (
              <div key={val} className="vf-glass p-4">
                <div className="text-[var(--vf-secondary)] text-2xl font-bold">{val}</div>
                <div className="text-slate-400 text-xs mt-1">{label}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="text-slate-500 text-xs relative">© 2026 VF Nexus. Tecnologia NexLabs.</div>
      </div>

      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 bg-[radial-gradient(circle_at_top,rgba(10,141,255,0.08),transparent_38%)]">
        <div className="w-full max-w-lg">
          <div className="flex items-center gap-3 mb-7 md:hidden justify-center">
            <div className="vf-logo-soft w-[60px] h-[60px] flex items-center justify-center p-2"><BrandLogo src="/nexlabs-logo.png" alt="NexLabs" width={48} height={48} className="w-full h-full object-contain" /></div>
            <div><div className="text-[var(--vf-text)] font-semibold tracking-widest">VF NEXUS</div><div className="text-[var(--vf-secondary)] text-xs">NexLabs</div></div>
          </div>

          <div className="vf-card p-5 sm:p-8 shadow-2xl shadow-blue-950/20">
            <h2 className="text-xl font-semibold text-[var(--vf-text)] mb-1">
              {mode === 'login' ? 'Entrar na sua conta' : mode === 'register' ? 'Criar conta e configurar ramo' : 'Recuperar senha'}
            </h2>
            <p className="text-slate-400 text-sm mb-6">
              {mode === 'login' ? 'Bem-vindo de volta ao VF Nexus.' : mode === 'register' ? 'Responda 5 perguntas rápidas para liberar somente as funções úteis para seu negócio.' : 'Enviaremos um link para seu e-mail'}
            </p>

            {!envStatus.ok && <div className="mb-4 rounded-lg border border-[#F2B72E]/35 bg-[#F2B72E]/10 p-3 text-[12px] leading-relaxed text-[var(--vf-secondary)]">{envStatus.message}</div>}

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'register' && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div><label className="block text-slate-300 text-xs font-medium mb-1.5 uppercase tracking-wide">Seu nome</label><input className="vf-input" type="text" value={nome} onChange={e => setNome(e.target.value)} placeholder="Seu nome" required /></div>
                    <div><label className="block text-slate-300 text-xs font-medium mb-1.5 uppercase tracking-wide">1. Nome da empresa/MEI</label><input className="vf-input" type="text" value={empresaNome} onChange={e => setEmpresaNome(e.target.value)} placeholder="Ex: Barbearia João" required /></div>
                  </div>
                  <div><label className="block text-slate-300 text-xs font-medium mb-1.5 uppercase tracking-wide">2. Qual é o ramo principal?</label><select className="vf-input" value={tipoEmpresa} onChange={e => setTipoEmpresa(e.target.value as TipoEmpresa)}>{SECTOR_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}</select><p className="text-[11px] text-slate-500 mt-1">{sector.description}</p></div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div><label className="block text-slate-300 text-xs font-medium mb-1.5 uppercase tracking-wide">3. Trabalha com horários/agendamentos?</label><select className="vf-input" value={String(usaAgendamentos)} onChange={e => setUsaAgendamentos(e.target.value === 'true')}><option value="true">Sim, preciso de agenda</option><option value="false">Não neste momento</option></select></div>
                    <div><label className="block text-slate-300 text-xs font-medium mb-1.5 uppercase tracking-wide">4. Precisa controlar estoque?</label><select className="vf-input" value={String(usaEstoque)} onChange={e => setUsaEstoque(e.target.value === 'true')}><option value="true">Sim, produtos/itens</option><option value="false">Não, só serviços</option></select></div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div><label className="block text-slate-300 text-xs font-medium mb-1.5 uppercase tracking-wide">5. Usa insumos/ficha técnica?</label><select className="vf-input" value={String(usaInsumos)} onChange={e => setUsaInsumos(e.target.value === 'true')}><option value="false">Não, cadastro direto</option><option value="true">Sim, ingredientes/insumos</option></select></div>
                    <div><label className="block text-slate-300 text-xs font-medium mb-1.5 uppercase tracking-wide">Função extra inicial</label><select className="vf-input" value={String(usaCatalogoEventos)} onChange={e => setUsaCatalogoEventos(e.target.value === 'true')}><option value="false">Somente módulos essenciais</option><option value="true">Catálogo/cardápio e eventos</option></select></div>
                  </div>
                </>
              )}
              <div><label className="block text-slate-300 text-xs font-medium mb-1.5 uppercase tracking-wide">E-mail</label><input className="vf-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" required /></div>
              {mode !== 'reset' && <div><label className="block text-slate-300 text-xs font-medium mb-1.5 uppercase tracking-wide">Senha</label><input className="vf-input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required minLength={6} /></div>}
              {mode === 'login' && <div className="flex justify-end"><button type="button" onClick={() => setMode('reset')} className="text-[var(--vf-secondary)] text-xs hover:text-white transition-colors">Esqueceu a senha?</button></div>}
              <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-[#0A8DFF] to-[#F2B72E] hover:brightness-110 text-[#04070D] font-semibold py-3 rounded-xl text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-blue-950/30">
                {loading && <span className="w-4 h-4 border-2 border-[#04070D] border-t-transparent rounded-full animate-spin" />}
                {mode === 'login' ? 'Entrar' : mode === 'register' ? 'Criar conta configurada' : 'Enviar link'}
              </button>
            </form>

            {mode !== 'reset' && <><div className="flex items-center gap-3 my-4"><div className="flex-1 h-px bg-[var(--vf-border)]" /><span className="text-slate-500 text-xs">ou</span><div className="flex-1 h-px bg-[var(--vf-border)]" /></div><button onClick={handleGoogle} className="w-full border border-[var(--vf-border)] bg-[var(--vf-surface2)] hover:bg-[var(--vf-surface3)] text-[var(--vf-text)] py-2.5 rounded-lg text-sm transition-colors">Continuar com Google</button></>}
            <div className="mt-5 text-center text-sm">
              {mode === 'login' ? <span className="text-slate-400">Não tem conta? <button onClick={() => setMode('register')} className="text-[var(--vf-secondary)] hover:text-white">Criar gratuitamente</button></span> : <button onClick={() => setMode('login')} className="text-[var(--vf-secondary)] hover:text-white">← Voltar para login</button>}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
