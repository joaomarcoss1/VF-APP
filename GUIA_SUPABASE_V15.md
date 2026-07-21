# Guia Supabase V15

Aplique as migrations em ordem. A migration principal da V15 é:

`supabase/migrations/029_vf_nexus_v15_producao_10_10.sql`

Ela cria/atualiza funções:

- `current_empresa_id()`
- `current_user_role()`
- `is_super_admin()`
- `can_access_empresa()`
- `can_access_delivery()`
- `can_access_label()`
- `can_access_product()`

Depois valide no SQL Editor:

```sql
select public.vf_security_health_v15();
```
