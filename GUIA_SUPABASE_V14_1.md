# Guia Supabase V14.1

Aplicar no SQL Editor:

```sql
supabase/migrations/025_vf_nexus_v14_1_rls_offline_etiquetas.sql
```

Essa migration cria:
- tabelas de etiquetas;
- códigos de barras por produto;
- offline sync;
- pagamentos de assinatura;
- eventos billing;
- RLS completo das tabelas V14;
- RPC `vf_registrar_venda_completa_v14_1`;
- RPC `vf_estornar_venda_completa_v14_1`.

Não rode SQL no PowerShell. Execute no Supabase SQL Editor.
