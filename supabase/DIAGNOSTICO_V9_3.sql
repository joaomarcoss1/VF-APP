-- VF Nexus V9.3 — diagnóstico pós-migrations no Supabase.
-- Execute no SQL Editor depois de aplicar as migrations.

select
  p.proname as funcao,
  pg_get_function_identity_arguments(p.oid) as argumentos
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'vf_current_user_id',
    'vf_current_profile_id',
    'vf_is_master',
    'vf_current_empresa_id',
    'vf_same_empresa',
    'vf_can',
    'vf_restaurante_login_staff',
    'vf_restaurante_validar_staff_session'
  )
order by p.proname;

select
  c.relname as tabela,
  c.relrowsecurity as rls_ativa
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in (
    'produtos', 'clientes', 'vendas', 'evento_itens',
    'integracoes_configuracoes', 'notificacoes_central',
    'restaurant_staff_sessions', 'whatsapp_messages'
  )
order by c.relname;

select
  schemaname,
  tablename,
  policyname,
  cmd
from pg_policies
where schemaname = 'public'
  and tablename in (
    'produto_variacoes', 'produto_variacao_estoque',
    'movimentacoes_variacao_estoque', 'eventos', 'evento_itens',
    'integracoes_configuracoes', 'notificacoes_central',
    'restaurant_staff_sessions', 'whatsapp_messages'
  )
order by tablename, policyname;

select
  table_name,
  column_name,
  data_type
from information_schema.columns
where table_schema = 'public'
  and column_name = 'empresa_id'
  and table_name in (
    'produtos', 'produto_variacoes', 'produto_variacao_estoque',
    'movimentacoes_variacao_estoque', 'clientes', 'vendas',
    'eventos', 'evento_itens', 'integracoes_configuracoes',
    'notificacoes_central', 'restaurant_staff_sessions',
    'whatsapp_messages'
  )
order by table_name;
