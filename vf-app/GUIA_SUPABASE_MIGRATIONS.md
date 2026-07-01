# Guia de Migrations Supabase — VF Nexus

Execute as migrations no Supabase SQL Editor em ordem crescente.

Migrations atuais:

1. `001_schema.sql`
2. `002_mobile_push_notifications.sql`
3. `003_security_calculations_stock_history.sql`
4. `004_vf_nexus_onboarding_empresa_modulos.sql`
5. `005_crm_financeiro_comprovantes_ux.sql`
6. `006_commercial_grade_saas.sql`
7. `007_branding_notas_custos_produtos.sql`
8. `008_commercial_stabilization_branding_modules.sql`
9. `009_commercial_completion_sales_inventory_permissions.sql`
10. `010_vf_nexus_financeiro_profissional.sql`
11. `011_vf_nexus_vendas_estoque_profissional.sql`
12. `012_vf_nexus_rbac_auditoria_planos.sql`
13. `013_vf_nexus_relatorios_branding_documentos.sql`

As migrations novas usam `IF NOT EXISTS` e `ADD COLUMN IF NOT EXISTS` para preservar dados existentes.

- 015_vf_nexus_concretizacao_regras_negocio.sql — triggers internos para venda, estoque, financeiro, compras, OS e auditoria.
