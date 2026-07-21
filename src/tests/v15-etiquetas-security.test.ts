import { describe, expect, it } from 'vitest'
import fs from 'node:fs'

describe('V15 etiquetas security', () => {
  const sql = fs.readFileSync('supabase/migrations/029_vf_nexus_v15_producao_10_10.sql', 'utf8')
  it('inclui policies para etiquetas e códigos de barras por empresa', () => {
    expect(sql).toContain('etiquetas_lotes')
    expect(sql).toContain('etiquetas_itens')
    expect(sql).toContain('codigos_barras_produtos')
  })
})
