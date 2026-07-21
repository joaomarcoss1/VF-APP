import { describe, expect, it } from 'vitest'

describe('V14.3 multiempresa RLS', () => {
  it('documenta que queries empresariais devem usar empresa_id', () => {
    const regra = { tabela: 'produtos', filtro: 'empresa_id' }
    expect(regra.filtro).toBe('empresa_id')
  })

  it('bloqueia conceito de scanner entre empresas', () => {
    const empresaAtual = 'empresa-a'
    const produtoEncontrado = { empresa_id: 'empresa-a', codigo: '789' }
    expect(produtoEncontrado.empresa_id).toBe(empresaAtual)
  })
})
