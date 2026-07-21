import { describe, expect, it } from 'vitest'
import fs from 'node:fs'

describe('V15 relatórios security', () => {
  it('RelatoriosService utiliza contexto/empresa nos dados', () => {
    const service = fs.readFileSync('src/services/relatorios.ts', 'utf8')
    expect(service).toMatch(/getEmpresaId|empresa_id/)
  })
})
