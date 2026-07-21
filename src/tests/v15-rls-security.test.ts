import { describe, expect, it } from 'vitest'
import fs from 'node:fs'

describe('V15 migration RLS', () => {
  const sql = fs.readFileSync('supabase/migrations/029_vf_nexus_v15_producao_10_10.sql', 'utf8')
  it('cria funções obrigatórias de segurança', () => {
    for (const fn of ['current_empresa_id','current_user_role','is_super_admin','can_access_empresa','can_access_delivery','can_access_label','can_access_product']) {
      expect(sql).toContain(`function public.${fn}`)
    }
  })
  it('ativa row level security e policies tenant', () => {
    expect(sql).toMatch(/enable row level security/i)
    expect(sql).toMatch(/tenant_select_v15/i)
    expect(sql).toMatch(/public\.can_access_empresa/i)
  })
})
