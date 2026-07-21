'use client'

import { Laptop, Moon, Sun } from 'lucide-react'
import { useVFTheme, type VFThemeMode } from './ThemeProvider'

const options: Array<{ value: VFThemeMode; label: string; icon: any }> = [
  { value: 'light', label: 'Claro', icon: Sun },
  { value: 'dark', label: 'Escuro', icon: Moon },
  { value: 'system', label: 'Auto', icon: Laptop },
]

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, setTheme, toggleTheme } = useVFTheme()
  const current = options.find((item) => item.value === theme) ?? options[2]
  const Icon = current.icon

  if (compact) {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        className="vf-theme-toggle-compact"
        aria-label="Alternar tema do sistema"
      >
        <Icon size={17} />
      </button>
    )
  }

  return (
    <div className="vf-theme-toggle" role="group" aria-label="Selecionar tema visual">
      {options.map((item) => {
        const ItemIcon = item.icon
        const active = theme === item.value
        return (
          <button
            key={item.value}
            type="button"
            onClick={() => setTheme(item.value)}
            className={active ? 'is-active' : ''}
            aria-pressed={active}
          >
            <ItemIcon size={15} />
            <span>{item.label}</span>
          </button>
        )
      })}
    </div>
  )
}
