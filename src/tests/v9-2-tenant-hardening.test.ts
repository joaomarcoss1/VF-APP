import { describe, expect, it } from 'vitest'
import { FEATURE_DEFINITIONS } from '@/lib/modules'

describe('VF Nexus V9.2 hardening estático', () => {
  it('não usa ícones textuais antigos nos módulos principais', () => {
    const banned = new Set(['Atd','Coz','Bar','Cx','SCAN','TAG','Doc','Item','Venda','Fin','Rel','Conf'])
    for (const feature of FEATURE_DEFINITIONS) expect(banned.has(feature.icon)).toBe(false)
  })

  it('preserva módulos comerciais essenciais', () => {
    const keys = FEATURE_DEFINITIONS.map(f => f.key)
    for (const key of ['pdv','scanner','etiquetas','atendimento','reservas_adiantamentos','financeiro','estoque']) {
      expect(keys).toContain(key as any)
    }
  })
})
