-- VF Nexus V9.4 — diagnóstico somente leitura.
select
  to_regprocedure('public.vf_is_master()') as vf_is_master,
  to_regprocedure('public.vf_current_empresa_id()') as vf_current_empresa_id,
  to_regprocedure('public.vf_effective_empresa_id()') as vf_effective_empresa_id,
  to_regprocedure('public.vf_same_empresa(uuid)') as vf_same_empresa,
  to_regprocedure('public.vf_can(text,text)') as vf_can,
  to_regprocedure('public.vf_master_select_empresa(uuid)') as vf_master_select_empresa,
  to_regprocedure('public.vf_master_clear_operational_empresa()') as vf_master_clear_operational_empresa;

select c.table_name,
       bool_or(c.column_name='empresa_id') as possui_empresa_id,
       coalesce(cls.relrowsecurity,false) as rls_ativa,
       count(distinct p.policyname) as total_policies
from information_schema.columns c
join pg_class cls on cls.relname=c.table_name
join pg_namespace n on n.oid=cls.relnamespace and n.nspname='public'
left join pg_policies p on p.schemaname='public' and p.tablename=c.table_name
where c.table_schema='public'
group by c.table_name,cls.relrowsecurity
order by c.table_name;

select tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where schemaname='public'
  and (coalesce(qual,'') ilike '%vf_is_master%' or coalesce(with_check,'') ilike '%vf_is_master%')
order by tablename,policyname;

select table_name,column_name,is_nullable,data_type
from information_schema.columns
where table_schema='public' and column_name='empresa_id'
order by table_name;

select schemaname,tablename,indexname,indexdef
from pg_indexes
where schemaname='public' and indexdef ilike '%empresa_id%'
order by tablename,indexname;

select p.proname, pg_get_function_identity_arguments(p.oid) args, p.prosecdef security_definer,
       pg_get_functiondef(p.oid) ilike '%set search_path%' as search_path_definido
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.prosecdef
order by p.proname;
