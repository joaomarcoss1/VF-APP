import { describe, expect, it } from 'vitest'
import { can } from '@/lib/rbac'

describe('rbac', () => {
  it('bloqueia vendedor em cancelamento/estorno', () => {
    expect(can({ cargo: 'vendedor' }, 'vendas', 'criar')).toBe(true)
    expect(can({ cargo: 'vendedor' }, 'vendas', 'cancelar')).toBe(false)
    expect(can({ cargo: 'vendedor' }, 'vendas', 'estornar')).toBe(false)
  })

  it('libera master admin para impersonar', () => {
    expect(can({ cargo: 'master_admin' }, 'master-admin', 'impersonar')).toBe(true)
    expect(can({ is_master: true }, 'master-admin', 'impersonar')).toBe(true)
  })

  it('libera financeiro para DRE/exportação sem administrar master', () => {
    expect(can({ cargo: 'financeiro' }, 'financeiro', 'exportar')).toBe(true)
    expect(can({ cargo: 'financeiro' }, 'master-admin', 'administrar')).toBe(false)
  })
})
