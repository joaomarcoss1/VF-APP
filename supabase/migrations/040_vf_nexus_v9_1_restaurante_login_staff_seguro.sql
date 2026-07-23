-- VF Nexus V9.1 — login operacional seguro por empresa/setor
-- Exige código/matrícula da empresa e cria base para sessão operacional por setor.

create extension if not exists pgcrypto;

create table if not exists public.restaurant_staff_sessions (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  staff_id uuid not null references public.restaurant_staff(id) on delete cascade,
  setor text not null,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  last_seen_at timestamptz
);

create index if not exists restaurant_staff_sessions_empresa_staff_idx
  on public.restaurant_staff_sessions(empresa_id, staff_id, ativo);

create index if not exists restaurant_staff_sessions_setor_idx
  on public.restaurant_staff_sessions(empresa_id, setor, ativo);

alter table if exists public.restaurant_staff_sessions enable row level security;

drop policy if exists restaurant_staff_sessions_tenant_all_v91 on public.restaurant_staff_sessions;
create policy restaurant_staff_sessions_tenant_all_v91
on public.restaurant_staff_sessions
for all
using (public.vf_is_master() or empresa_id = public.vf_current_empresa_id())
with check (public.vf_is_master() or empresa_id = public.vf_current_empresa_id());

do $$
declare
  r record;
begin
  for r in
    select n.nspname as schema_name, p.proname as function_name, pg_get_function_identity_arguments(p.oid) as args
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'vf_restaurante_login_staff'
  loop
    execute format('drop function if exists %I.%I(%s) cascade', r.schema_name, r.function_name, r.args);
  end loop;
end $$;

create or replace function public.vf_restaurante_login_staff(
  p_nome text,
  p_cpf text,
  p_codigo_empresa text
)
returns table (
  id uuid,
  empresa_id uuid,
  nome text,
  cpf text,
  cpf_normalizado text,
  setor text,
  cargo text,
  ativo boolean,
  ultimo_acesso_em timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_empresa_id uuid;
  v_cpf text := regexp_replace(coalesce(p_cpf, ''), '\D', '', 'g');
  v_nome text := lower(trim(coalesce(p_nome, '')));
  v_nome_primeiro text := lower(split_part(trim(coalesce(p_nome, '')), ' ', 1));
  v_codigo text := lower(trim(coalesce(p_codigo_empresa, '')));
begin
  if length(v_codigo) = 0 then
    raise exception 'Informe o código ou matrícula da empresa para acessar o atendimento.';
  end if;

  if length(v_cpf) < 11 then
    raise exception 'CPF inválido para login operacional.';
  end if;

  if length(v_nome_primeiro) < 2 then
    raise exception 'Informe o nome do funcionário para login operacional.';
  end if;

  select e.id into v_empresa_id
  from public.empresas e
  where lower(coalesce(e.codigo_empresa, '')) = v_codigo
     or lower(coalesce(e.matricula_empresa, '')) = v_codigo
     or lower(e.id::text) = v_codigo
  limit 1;

  if v_empresa_id is null then
    raise exception 'Empresa não encontrada para o código/matrícula informado.';
  end if;

  return query
  with found as (
    select rs.*
    from public.restaurant_staff rs
    where rs.empresa_id = v_empresa_id
      and rs.ativo = true
      and rs.cpf_normalizado = v_cpf
      and (lower(rs.nome) like '%' || v_nome_primeiro || '%' or lower(rs.nome) = v_nome)
    order by rs.updated_at desc nulls last, rs.created_at desc
    limit 1
  ), touched as (
    update public.restaurant_staff rs
    set ultimo_acesso_em = now(), updated_at = now()
    from found f
    where rs.id = f.id
      and rs.empresa_id = v_empresa_id
    returning rs.*
  )
  select t.id, t.empresa_id, t.nome, t.cpf, t.cpf_normalizado, t.setor, t.cargo, t.ativo, t.ultimo_acesso_em, t.created_at, t.updated_at
  from touched t;

  if not found then
    raise exception 'Funcionário não encontrado, inativo ou não pertence à empresa informada.';
  end if;
end;
$$;

grant execute on function public.vf_restaurante_login_staff(text, text, text) to anon, authenticated;
