'use client'

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

export type VFThemeMode = 'light' | 'dark' | 'system'
type VFResolvedTheme = 'light' | 'dark'

type ThemeContextValue = {
  theme: VFThemeMode
  resolvedTheme: VFResolvedTheme
  setTheme: (theme: VFThemeMode) => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function resolveTheme(mode: VFThemeMode): VFResolvedTheme {
  if (typeof window === 'undefined') return mode === 'light' ? 'light' : 'dark'
  if (mode === 'system') return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  return mode
}

function getInitialTheme(): VFThemeMode {
  if (typeof window === 'undefined') return 'system'
  const stored = window.localStorage.getItem('vf_nexus_theme')
  if (stored === 'light' || stored === 'dark' || stored === 'system') return stored
  return 'system'
}

export function VFThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<VFThemeMode>(() => getInitialTheme())
  const [resolvedTheme, setResolvedTheme] = useState<VFResolvedTheme>(() => resolveTheme(getInitialTheme()))

  useEffect(() => {
    if (typeof window === 'undefined') return
    const media = window.matchMedia?.('(prefers-color-scheme: dark)')
    const apply = () => setResolvedTheme(resolveTheme(theme))
    apply()
    media?.addEventListener?.('change', apply)
    return () => media?.removeEventListener?.('change', apply)
  }, [theme])

  useEffect(() => {
    if (typeof document === 'undefined') return
    const root = document.documentElement
    root.dataset.theme = resolvedTheme
    root.dataset.themeMode = theme
    root.classList.toggle('dark', resolvedTheme === 'dark')
    window.localStorage.setItem('vf_nexus_theme', theme)
  }, [theme, resolvedTheme])

  const value = useMemo<ThemeContextValue>(() => ({
    theme,
    resolvedTheme,
    setTheme: setThemeState,
    toggleTheme: () => setThemeState((current) => current === 'dark' ? 'light' : current === 'light' ? 'system' : 'dark'),
  }), [theme, resolvedTheme])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useVFTheme() {
  const value = useContext(ThemeContext)
  if (!value) throw new Error('useVFTheme deve ser usado dentro de VFThemeProvider')
  return value
}
