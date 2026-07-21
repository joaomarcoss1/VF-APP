import { describe, expect, it } from 'vitest'
import fs from 'node:fs'

describe('V15 PDV security', () => {
  it('ProdutosService filtra produtos por empresa_id', () => {
    const service = fs.readFileSync('src/services/produtos.ts', 'utf8')
    expect(service).toMatch(/eq\('empresa_id', empresaId\)/)
  })
})
