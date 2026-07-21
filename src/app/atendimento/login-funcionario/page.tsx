'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { ArrowLeft, Fingerprint, LogIn, ShieldCheck } from 'lucide-react'
import { RestauranteService } from '@/services/restaurante'
import { ThemeToggle } from '@/components/theme/ThemeToggle'
import BrandLogo from '@/components/BrandLogo'

export default function LoginFuncionarioPage() {
  const router = useRouter()
  const [nome, setNome] = useState('')
  const [cpf, setCpf] = useState('')
  const [codigo, setCodigo] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit() {
    try {
      setLoading(true)
      const staff = await RestauranteService.loginFuncionario({ nome, cpf, codigo_empresa: codigo })
      toast.success(`Bem-vindo, ${staff.nome}.`)
      const target = staff.setor === 'cozinha' ? '/cozinha' : staff.setor === 'bar_drinks' ? '/bar-drinks' : staff.setor === 'caixa' ? '/atendimento/caixa' : ['gerente','admin'].includes(staff.setor) ? '/setor' : '/atendimento'
      router.replace(target)
    } catch (error: any) {
      toast.error(error.message ?? 'Não foi possível entrar.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="vf-operational-login min-h-dvh bg-[var(--vf-bg)] p-4 text-[var(--vf-text)] md:grid md:place-items-center">
      <section className="mx-auto grid min-h-[calc(100dvh-2rem)] w-full max-w-5xl overflow-hidden rounded-[30px] border border-[var(--vf-border)] bg-[var(--vf-surface)] shadow-2xl md:min-h-[620px] md:grid-cols-[1fr,430px]">
        <div className="hidden flex-col justify-between bg-[radial-gradient(circle_at_20%_20%,rgba(37,99,235,.45),transparent_34%),linear-gradient(135deg,#06112a,#020617)] p-8 text-white md:flex">
          <div>
            <div className="flex items-center justify-between gap-3">
              <button onClick={() => router.push('/login')} className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-4 py-2 text-xs font-black text-slate-100 transition hover:bg-white/15"><ArrowLeft size={15} /> Login admin</button>
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white p-1.5"><BrandLogo src="/nexlabs-logo.png" alt="VF Nexus" className="h-full w-full object-contain" /></div>
            </div>
            <span className="mt-10 inline-flex rounded-full bg-amber-300/15 px-4 py-2 text-xs font-black uppercase tracking-[.18em] text-amber-100">Login operacional</span>
            <h1 className="mt-6 text-5xl font-black leading-none">Entre direto no seu setor.</h1>
            <p className="mt-5 max-w-md text-sm font-semibold leading-7 text-slate-300">Atendimento, cozinha, bar/drinks e caixa sem acessar o painel completo. Cada funcionário vê apenas a própria operação.</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/10 p-5">
            <ShieldCheck className="text-emerald-300" />
            <strong className="mt-3 block">Isolado por empresa</strong>
            <p className="mt-1 text-sm text-slate-300">CPF, setor e matrícula da empresa são validados antes de liberar o acesso.</p>
          </div>
        </div>

        <div className="flex min-w-0 flex-col justify-center bg-[var(--vf-surface)] p-5 text-[var(--vf-text)] md:p-8">
          <div className="mb-5 flex items-center justify-between md:hidden">
            <button onClick={() => router.push('/login')} className="inline-flex items-center gap-2 rounded-2xl border border-[var(--vf-border)] bg-[var(--vf-surface2)] px-3 py-2 text-xs font-black"><ArrowLeft size={15} /> Admin</button>
            <ThemeToggle compact />
          </div>
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-[color-mix(in_srgb,var(--vf-primary)_12%,transparent)] text-[var(--vf-primary)]"><Fingerprint size={27} /></div>
          <h2 className="mt-6 text-2xl font-black text-[var(--vf-text)]">Login do funcionário</h2>
          <p className="mt-2 text-sm font-semibold leading-6 text-[var(--vf-text3)]">Informe nome, CPF e código/matrícula da empresa para acessar o setor correto.</p>
          <div className="mt-6 space-y-3">
            <input value={nome} onChange={(e) => setNome(e.target.value)} className="vf-input" placeholder="Nome completo" autoComplete="name" />
            <input value={cpf} onChange={(e) => setCpf(e.target.value)} className="vf-input" placeholder="CPF" inputMode="numeric" autoComplete="off" />
            <input value={codigo} onChange={(e) => setCodigo(e.target.value)} className="vf-input" placeholder="Código/matrícula da empresa" autoComplete="organization" />
          </div>
          <button onClick={submit} disabled={loading} className="vf-btn vf-btn-primary mt-5 w-full"><LogIn size={16} /> {loading ? 'Validando...' : 'Entrar no setor'}</button>
          <button type="button" onClick={() => router.push('/login')} className="mt-4 text-center text-sm font-bold text-[var(--vf-text3)] hover:text-[var(--vf-primary)]">Entrar com usuário administrativo</button>
        </div>
      </section>
    </main>
  )
}
