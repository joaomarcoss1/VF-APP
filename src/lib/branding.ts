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
  cor_menu: string
  cor_card: string
  cor_muted: string
  cor_sucesso: string
  cor_alerta: string
  cor_erro: string
  cor_info: string
  modo_tema: 'light' | 'dark' | 'custom'
}

const STORAGE_KEY = 'vf-nexus-branding-v3'

export const DEFAULT_BRANDING: Branding = {
  nome: 'VF Nexus',
  logo_url: '/nexlabs-logo.png',
  cor_primaria: '#0A8DFF',
  cor_secundaria: '#F2B72E',
  cor_fundo: '#F5F8FC',
  cor_texto: '#102033',
  cor_superficie: '#FFFFFF',
  cor_superficie2: '#EEF4FB',
  cor_borda: '#DCE6F0',
  cor_menu: '#FFFFFF',
  cor_card: '#FFFFFF',
  cor_muted: '#667085',
  cor_sucesso: '#16A34A',
  cor_alerta: '#F59E0B',
  cor_erro: '#DC2626',
  cor_info: '#0A8DFF',
  modo_tema: 'light',
}

function normalizeHex(value: unknown, fallback: string): string {
  const v = String(value ?? '').trim()
  if (/^#[0-9A-Fa-f]{6}$/.test(v)) return v
  return fallback
}

function normalizeLogo(value: unknown, fallback: string): string {
  const v = String(value ?? '').trim()
  if (!v) return fallback
  if (v.startsWith('/') || v.startsWith('http://') || v.startsWith('https://') || v.startsWith('data:image/')) return v
  return fallback
}

function hexToRgb(hex: string) {
  const clean = normalizeHex(hex, '#000000').replace('#', '')
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

export function isDarkColor(hex: string): boolean {
  return luminance(hex) < 0.42
}

export function readableTextFor(bg: string): string {
  return isDarkColor(bg) ? '#F8FAFC' : '#102033'
}

function contrastRatio(a: string, b: string): number {
  const l1 = luminance(a) + 0.05
  const l2 = luminance(b) + 0.05
  return l1 > l2 ? l1 / l2 : l2 / l1
}

function safeText(text: string, bg: string): string {
  const candidate = normalizeHex(text, readableTextFor(bg))
  return contrastRatio(candidate, bg) >= 4.5 ? candidate : readableTextFor(bg)
}

function deriveSurface(fundo: string, dark: boolean) {
  if (dark) return '#0B111A'
  if (fundo.toUpperCase() === '#FFFFFF') return '#FFFFFF'
  return '#FFFFFF'
}

function deriveSurface2(fundo: string, dark: boolean) {
  if (dark) return '#111827'
  if (fundo.toUpperCase() === '#FFFFFF') return '#F8FAFC'
  return '#EEF4FB'
}

function normalizeMode(value: unknown, fallback: Branding['modo_tema']): Branding['modo_tema'] {
  return value === 'light' || value === 'dark' || value === 'custom' ? value : fallback
}

export function resolveBranding(input?: Partial<IdentidadeEmpresa> | Partial<Branding> | null): Branding {
  const raw = (input ?? {}) as any
  const fundo = normalizeHex(raw.cor_fundo, DEFAULT_BRANDING.cor_fundo)
  const dark = isDarkColor(fundo)
  const superficie = normalizeHex(raw.cor_superficie, deriveSurface(fundo, dark))
  const superficie2 = normalizeHex(raw.cor_superficie2, deriveSurface2(fundo, dark))
  return {
    nome: String(raw.nome || DEFAULT_BRANDING.nome).trim() || DEFAULT_BRANDING.nome,
    logo_url: normalizeLogo(raw.logo_url, DEFAULT_BRANDING.logo_url),
    cor_primaria: normalizeHex(raw.cor_primaria, DEFAULT_BRANDING.cor_primaria),
    cor_secundaria: normalizeHex(raw.cor_secundaria, DEFAULT_BRANDING.cor_secundaria),
    cor_fundo: fundo,
    cor_texto: safeText(raw.cor_texto, superficie),
    cor_superficie: superficie,
    cor_superficie2: superficie2,
    cor_borda: normalizeHex(raw.cor_borda, dark ? '#263244' : DEFAULT_BRANDING.cor_borda),
    cor_menu: normalizeHex(raw.cor_menu, superficie),
    cor_card: normalizeHex(raw.cor_card, superficie),
    cor_muted: contrastRatio(normalizeHex(raw.cor_muted, dark ? '#CBD5E1' : DEFAULT_BRANDING.cor_muted), superficie) >= 3 ? normalizeHex(raw.cor_muted, dark ? '#CBD5E1' : DEFAULT_BRANDING.cor_muted) : (dark ? '#CBD5E1' : '#64748B'),
    cor_sucesso: normalizeHex(raw.cor_sucesso, DEFAULT_BRANDING.cor_sucesso),
    cor_alerta: normalizeHex(raw.cor_alerta, DEFAULT_BRANDING.cor_alerta),
    cor_erro: normalizeHex(raw.cor_erro, DEFAULT_BRANDING.cor_erro),
    cor_info: normalizeHex(raw.cor_info, raw.cor_primaria || DEFAULT_BRANDING.cor_info),
    modo_tema: normalizeMode(raw.modo_tema, dark ? 'dark' : 'light'),
  }
}

export function readCachedBranding(): Branding | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? resolveBranding(JSON.parse(raw)) : null
  } catch {
    return null
  }
}

export function cacheBranding(input?: Partial<IdentidadeEmpresa> | Partial<Branding> | null) {
  if (typeof window === 'undefined' || !input) return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(resolveBranding(input)))
  } catch {}
}

export function clearBrandingCache() {
  if (typeof window === 'undefined') return
  try { window.localStorage.removeItem(STORAGE_KEY) } catch {}
}

export function applyBrandingVars(input?: Partial<IdentidadeEmpresa> | Partial<Branding> | null, options?: { persist?: boolean }) {
  if (typeof document === 'undefined') return
  const b = resolveBranding(input || readCachedBranding() || DEFAULT_BRANDING)
  const root = document.documentElement
  root.style.setProperty('--vf-primary', b.cor_primaria)
  root.style.setProperty('--vf-secondary', b.cor_secundaria)
  // V9: o branding não pode quebrar contraste do modo claro/escuro.
  // Mantemos fundo, texto e superfícies sob controle do ThemeProvider/CSS.
  // A identidade da empresa personaliza apenas acentos, logo e bordas suaves.
  root.style.setProperty('--vf-brand-primary', b.cor_primaria)
  root.style.setProperty('--vf-brand-secondary', b.cor_secundaria)
  root.style.setProperty('--vf-brand-border', b.cor_borda)
  root.style.setProperty('--vf-border', `color-mix(in srgb, ${b.cor_borda} 70%, var(--vf-border))`)
  root.style.setProperty('--vf-success', b.cor_sucesso)
  root.style.setProperty('--vf-warning', b.cor_alerta)
  root.style.setProperty('--vf-error', b.cor_erro)
  root.style.setProperty('--vf-info', b.cor_info)
  root.style.setProperty('--vf-green', b.cor_sucesso)
  root.style.setProperty('--vf-red', b.cor_erro)
  root.style.setProperty('--vf-blue', b.cor_info)
  root.style.setProperty('--vf-amber', b.cor_alerta)
  root.style.setProperty('--vf-black', b.cor_fundo)
  root.style.setProperty('--vf-gold', b.cor_primaria)
  root.style.setProperty('--vf-gold-l', b.cor_secundaria)
  root.style.setProperty('--vf-gold-bg', `color-mix(in srgb, ${b.cor_primaria} 10%, transparent)`)
  root.style.setProperty('--vf-header-bg', 'color-mix(in srgb, var(--vf-surface) 94%, transparent)')
  root.style.setProperty('--vf-accent-soft', `color-mix(in srgb, ${b.cor_primaria} 10%, transparent)`)
  root.style.setProperty('--vf-secondary-soft', `color-mix(in srgb, ${b.cor_secundaria} 12%, transparent)`)
  root.style.setProperty('--vf-focus', `color-mix(in srgb, ${b.cor_primaria} 20%, transparent)`)
  root.style.setProperty('--vf-fg-on-primary', isDarkColor(b.cor_primaria) ? '#FFFFFF' : '#04070D')
  root.dataset.vfTheme = b.modo_tema
  if (options?.persist) cacheBranding(b)
  try { window.dispatchEvent(new CustomEvent('vf-branding-updated', { detail: b })) } catch {}
}

export function getBrandingLogo(input?: Partial<IdentidadeEmpresa> | Partial<Branding> | null) {
  return resolveBranding(input).logo_url
}
