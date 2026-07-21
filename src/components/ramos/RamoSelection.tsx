'use client'

import { useRouter } from 'next/navigation'
import BrandLogo from '@/components/BrandLogo'
import { ThemeToggle } from '@/components/theme/ThemeToggle'
import { RAMOS_ATIVIDADE, persistInitialRamo, type RamoAtividade } from '@/config/ramos'
import { ArrowRight, Sparkles } from 'lucide-react'

const MICRO: Record<string, string> = {
  bar_restaurante: 'Comandas e caixa',
  barbearia: 'Agenda e clientes',
  confeitaria: 'Produção e encomendas',
  roupas: 'Estoque e vendas',
  eletronicos: 'Vendas e assistência',
  prestador_servicos: 'Orçamentos e ordens',
  autonomo: 'Gestão simples',
}

export default function RamoSelection() {
  const router = useRouter()

  function selectRamo(ramo: RamoAtividade) {
    persistInitialRamo(ramo)
    router.push(`/login?ramo=${ramo}`)
  }

  return (
    <main className="vf-branch-landing min-h-dvh overflow-x-hidden overflow-y-auto text-[var(--vf-text)] vf-theme-transition">
      <div className="vf-branch-orb vf-branch-orb-a" />
      <div className="vf-branch-orb vf-branch-orb-b" />
      <section className="relative mx-auto flex min-h-dvh w-full max-w-6xl flex-col px-4 py-5 sm:px-6 md:px-8">
        <header className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="vf-branch-logo-frame">
              <BrandLogo src="/nexlabs-logo.png" alt="VF Nexus" className="h-full w-full object-contain" />
            </div>
            <div>
              <strong className="block text-lg font-black tracking-tight sm:text-xl">VF Nexus</strong>
              <span className="text-[10px] font-black uppercase tracking-[.24em] text-[var(--vf-secondary)]">SaaS modular</span>
            </div>
          </div>
          <ThemeToggle />
        </header>

        <div className="flex flex-1 flex-col justify-center py-7 sm:py-10">
          <div className="mx-auto max-w-3xl text-center">
            <span className="vf-branch-pill"><Sparkles size={14} /> experiência personalizada</span>
            <h1 className="mt-5 text-4xl font-black tracking-[-.06em] sm:text-5xl md:text-7xl">Escolha seu ramo</h1>
            <p className="mx-auto mt-4 max-w-xl text-sm font-semibold leading-6 text-[var(--vf-text3)] sm:text-base">Personalize sua experiência no VF Nexus.</p>
          </div>

          <div className="vf-branch-grid mt-8 sm:mt-10">
            {RAMOS_ATIVIDADE.map((ramo, index) => (
              <button
                key={ramo.id}
                type="button"
                onClick={() => selectRamo(ramo.id)}
                className="vf-branch-card group"
                style={{ '--branch-color': ramo.color, animationDelay: `${index * 48}ms` } as any}
              >
                <span className="vf-branch-card-glow" />
                <span className="vf-branch-icon">{ramo.icon}</span>
                <span className="min-w-0 flex-1 text-left">
                  <strong>{ramo.nome}</strong>
                  <small>{MICRO[ramo.id] ?? ramo.curto}</small>
                </span>
                <ArrowRight className="vf-branch-arrow" size={18} />
              </button>
            ))}
          </div>
        </div>

        <footer className="pb-[max(.25rem,env(safe-area-inset-bottom))] text-center text-[11px] font-bold text-[var(--vf-text3)]">
          Módulos por ramo · app mobile/PWA · funções ocultas por empresa
        </footer>
      </section>
    </main>
  )
}
