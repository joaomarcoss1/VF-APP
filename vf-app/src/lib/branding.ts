import type { IdentidadeEmpresa } from '@/types'

export type Branding = {
  nome: string
  logo_url: string
  cor_primaria: string
  cor_secundaria: string
  cor_fundo: string
  cor_texto: string
  cor_superficie: string
  cor_superficie2: string
  cor_borda: string
}

export const DEFAULT_BRANDING: Branding = {
  nome: 'VF Nexus',
  logo_url: '/nexlabs-logo.png',
  cor_primaria: '#0F4C81',
  cor_secundaria: '#D4AF37',
  cor_fundo: '#F8FAFC',
  cor_texto: '#102033',
  cor_superficie: '#FFFFFF',
  cor_superficie2: '#F8FAFC',
  cor_borda: '#DCE6F0',
}

function normalizeHex(value: unknown, fallback: string): string {
  const v = String(value ?? '').trim()
  if (/^#[0-9A-Fa-f]{6}$/.test(v)) return v
  return fallback
}

function hexToRgb(hex: string) {
  const clean = hex.replace('#', '')
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  }
}

function luminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex)
  const vals = [r, g, b].map(v => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * vals[0] + 0.7152 * vals[1] + 0.0722 * vals[2]
}

export function resolveBranding(input?: Partial<IdentidadeEmpresa> | null): Branding {
  const fundo = normalizeHex(input?.cor_fundo, DEFAULT_BRANDING.cor_fundo)
  const isDark = luminance(fundo) < 0.42
  return {
    nome: input?.nome?.trim() || DEFAULT_BRANDING.nome,
    logo_url: input?.logo_url?.trim() || DEFAULT_BRANDING.logo_url,
    cor_primaria: normalizeHex(input?.cor_primaria, DEFAULT_BRANDING.cor_primaria),
    cor_secundaria: normalizeHex(input?.cor_secundaria, DEFAULT_BRANDING.cor_secundaria),
    cor_fundo: fundo,
    cor_texto: normalizeHex(input?.cor_texto, isDark ? '#F8FAFC' : DEFAULT_BRANDING.cor_texto),
    cor_superficie: isDark ? '#0B111A' : '#FFFFFF',
    cor_superficie2: isDark ? '#111827' : '#F8FAFC',
    cor_borda: isDark ? 'rgba(148, 163, 184, 0.22)' : '#DCE6F0',
  }
}

export function applyBrandingVars(input?: Partial<IdentidadeEmpresa> | null) {
  if (typeof document === 'undefined') return
  const b = resolveBranding(input)
  const root = document.documentElement
  root.style.setProperty('--vf-primary', b.cor_primaria)
  root.style.setProperty('--vf-secondary', b.cor_secundaria)
  root.style.setProperty('--vf-bg', b.cor_fundo)
  root.style.setProperty('--vf-bg-soft', b.cor_fundo === '#F8FAFC' ? '#EEF4FA' : b.cor_superficie2)
  root.style.setProperty('--vf-surface', b.cor_superficie)
  root.style.setProperty('--vf-surface2', b.cor_superficie2)
  root.style.setProperty('--vf-surface3', b.cor_superficie2)
  root.style.setProperty('--vf-border', b.cor_borda)
  root.style.setProperty('--vf-text', b.cor_texto)
  root.style.setProperty('--vf-text2', b.cor_texto === '#F8FAFC' ? '#CBD5E1' : '#425466')
  root.style.setProperty('--vf-text3', b.cor_texto === '#F8FAFC' ? '#94A3B8' : '#667085')
  root.style.setProperty('--vf-black', b.cor_fundo)
  root.style.setProperty('--vf-gold', b.cor_primaria)
  root.style.setProperty('--vf-gold-l', b.cor_secundaria)
  root.style.setProperty('--vf-gold-bg', `color-mix(in srgb, ${b.cor_primaria} 10%, transparent)`)
}

export function getBrandingLogo(input?: Partial<IdentidadeEmpresa> | null) {
  return resolveBranding(input).logo_url
}
