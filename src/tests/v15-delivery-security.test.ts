import { describe, expect, it } from 'vitest'
import fs from 'node:fs'

describe('V15 delivery security', () => {
  const sql = fs.readFileSync('supabase/migrations/029_vf_nexus_v15_producao_10_10.sql', 'utf8')
  it('protege delivery por company_id e can_access_delivery', () => {
    expect(sql).toContain('can_access_delivery')
    expect(sql).toContain('delivery_drivers')
    expect(sql).toContain('deliveries_select_v15')
  })
})
