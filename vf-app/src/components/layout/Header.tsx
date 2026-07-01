'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabase } from '@/lib/supabase'
import { useQuery } from '@tanstack/react-query'
import { IdentidadeService } from '@/services'
import { getBrandingLogo } from '@/lib/branding'
import BrandLogo from '@/components/BrandLogo'

export default function Header({ title }: { title?: string }) {
  const [userName, setUserName] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const router = useRouter()
  const { data: identidade } = useQuery({ queryKey: ['identidade-global'], queryFn: IdentidadeService.obter, retry: false, staleTime: 60_000 })

  useEffect(() => {
    getSupabase().auth.getUser().then(({ data }) => {
      const name = data.user?.user_metadata?.full_name || data.user?.email?.split('@')[0] || ''
      setUserName(name)
    })
  }, [])

  return (
    <header className="flex items-center justify-between px-4 md:px-6 py-3 bg-white/85 backdrop-blur border-b border-[var(--vf-border)] sticky top-0 z-30">
      {/* Mobile logo + page title */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg border border-[rgba(10,141,255,.25)] bg-white md:hidden flex-shrink-0 overflow-hidden"><BrandLogo src={getBrandingLogo(identidade)} alt={identidade?.nome || 'VF Nexus'} width={32} height={32} className="w-8 h-8 object-contain" /></div>
        {title && (
          <h1 className="text-[15px] font-semibold text-[var(--vf-text)] hidden md:block">{title}</h1>
        )}
      </div>

      {/* AI badge */}
      <div
        onClick={() => router.push('/ia')}
        className="hidden md:flex items-center gap-2 bg-[var(--vf-gold-bg)] border border-[rgba(10,141,255,0.30)] rounded-full px-3 py-1.5 cursor-pointer hover:bg-[rgba(10,141,255,0.18)] transition-colors"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-[#F2B72E] vf-pulse" />
        <span className="text-[11px] text-[var(--vf-secondary)] font-medium">VF Nexus IA</span>
      </div>

      {/* User */}
      <div className="relative">
        <button
          onClick={() => setMenuOpen(o => !o)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-[var(--vf-surface2)] transition-colors"
        >
          <div className="w-7 h-7 rounded-full bg-[rgba(10,141,255,0.16)] border border-[rgba(10,141,255,0.35)] flex items-center justify-center text-[var(--vf-secondary)] text-xs font-semibold">
            {userName.charAt(0).toUpperCase() || 'U'}
          </div>
          <span className="text-[13px] text-[var(--vf-text3)] hidden md:block max-w-[120px] truncate">{userName}</span>
          <span className="text-[var(--vf-text3)] text-xs">▾</span>
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-[rgba(10,141,255,0.22)] rounded-lg shadow-xl py-1 z-50">
            <button onClick={() => { router.push('/configuracoes'); setMenuOpen(false) }}
              className="w-full text-left px-4 py-2 text-[13px] text-[var(--vf-text3)] hover:text-[var(--vf-text)] hover:bg-[var(--vf-surface2)] transition-colors">
              ⚙️ Configurações
            </button>
            <div className="h-px bg-[rgba(201,168,76,0.1)] my-1" />
            <button onClick={async () => {
              await getSupabase().auth.signOut()
              router.push('/auth')
            }} className="w-full text-left px-4 py-2 text-[13px] text-[var(--vf-text3)] hover:text-[#D45050] transition-colors">
              ⏻ Sair
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
