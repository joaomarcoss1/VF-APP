-- VF Nexus — Correção completa do login operacional seguro por empresa/setor
-- Corrige: public.vf_is_master() does not exist
-- Corrige: public.vf_current_empresa_id() does not exist
-- Corrige: função vf_restaurante_login_staff sem criação real de sessão
-- Corrige: uso inválido de "if not found"

create extension if not exists pgcrypto;

-- ============================================================
-- 1. FUNÇÃO: VERIFICAR SE O USUÁRIO É ADMIN MASTER
-- ============================================================

create or replace function public.vf_is_master()
returns boolean
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  v_uid uuid;
  v_ok boolean := false;
begin
  v_uid := auth.uid();

  if v_uid is null then
    return false;
  end if;

  if to_regclass('public.master_admins') is not null then
    select exists (
      select 1
      from public.master_admins
      where user_id = v_uid
        and coalesce(ativo, true) = true
    )
    into v_ok;

    if coalesce(v_ok, false) then
      return true;
    end if;
  end if;

  if to_regclass('public.perfis') is not null then
    select exists (
      select 1
      from public.perfis
      where id = v_uid
        and coalesce(is_master, false) = true
        and coalesce(bloqueado, false) = false
    )
    into v_ok;

    if coalesce(v_ok, false) then
      return true;
    end if;
  end if;

  return false;
exception
  when others then
    return false;
end;
$$;

grant execute on function public.vf_is_master() to anon, authenticated;


-- ============================================================
-- 2. FUNÇÃO: PEGAR EMPRESA ATUAL DO USUÁRIO AUTENTICADO
-- ============================================================

create or replace function public.vf_current_empresa_id()
returns uuid
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  v_uid uuid;
  v_empresa_id uuid;
begin
  v_uid := auth.uid();

  if v_uid is null then
    return null;
  end if;

  if to_regclass('public.perfis') is not null then
    select empresa_id
    into v_empresa_id
    from public.perfis
    where id = v_uid
      and empresa_id is not null
    limit 1;

    if v_empresa_id is not null then
      return v_empresa_id;
    end if;
  end if;

  if to_regclass('public.usuarios_empresas') is not null then
    if exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'usuarios_empresas'
        and column_name = 'profile_id'
    ) then
      execute '
        select empresa_id
        from public.usuarios_empresas
        where profile_id = $1
          and empresa_id is not null
        limit 1
      '
      using v_uid
      into v_empresa_id;

      if v_empresa_id is not null then
        return v_empresa_id;
      end if;
    end if;

    if exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'usuarios_empresas'
        and column_name = 'usuario_id'
    ) then
      execute '
        select empresa_id
        from public.usuarios_empresas
        where usuario_id = $1
          and empresa_id is not null
        limit 1
      '
      using v_uid
      into v_empresa_id;

      if v_empresa_id is not null then
        return v_empresa_id;
      end if;
    end if;
  end if;

  return null;
exception
  when others then
    return null;
end;
$$;

grant execute on function public.vf_current_empresa_id() to anon, authenticated;


-- ============================================================
-- 3. TABELA DE SESSÕES OPERACIONAIS
-- ============================================================

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

alter table public.restaurant_staff_sessions
  add column if not exists empresa_id uuid references public.empresas(id) on delete cascade,
  add column if not exists staff_id uuid references public.restaurant_staff(id) on delete cascade,
  add column if not exists setor text,
  add column if not exists ativo boolean not null default true,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists expires_at timestamptz,
  add column if not exists last_seen_at timestamptz;

create index if not exists restaurant_staff_sessions_empresa_staff_idx
  on public.restaurant_staff_sessions(empresa_id, staff_id, ativo);

create index if not exists restaurant_staff_sessions_setor_idx
  on public.restaurant_staff_sessions(empresa_id, setor, ativo);

create index if not exists restaurant_staff_sessions_id_ativo_idx
  on public.restaurant_staff_sessions(id, ativo);

alter table public.restaurant_staff_sessions enable row level security;

drop policy if exists restaurant_staff_sessions_tenant_all_v91 on public.restaurant_staff_sessions;

create policy restaurant_staff_sessions_tenant_all_v91
on public.restaurant_staff_sessions
for all
using (
  public.vf_is_master()
  or empresa_id = public.vf_current_empresa_id()
)
with check (
  public.vf_is_master()
  or empresa_id = public.vf_current_empresa_id()
);


-- ============================================================
-- 4. REMOVER FUNÇÃO ANTIGA DE LOGIN OPERACIONAL
-- ============================================================

do $$
declare
  r record;
begin
  for r in
    select
      n.nspname as schema_name,
      p.proname as function_name,
      pg_get_function_identity_arguments(p.oid) as args
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'vf_restaurante_login_staff'
  loop
    execute format(
      'drop function if exists %I.%I(%s) cascade',
      r.schema_name,
      r.function_name,
      r.args
    );
  end loop;
end $$;


-- ============================================================
-- 5. NOVA FUNÇÃO DE LOGIN FUNCIONÁRIO COM SESSÃO
-- ============================================================

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
  updated_at timestamptz,
  session_id uuid,
  session_expires_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_empresa_id uuid;
  v_staff_id uuid;
  v_session_id uuid;
  v_session_expires_at timestamptz;
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

  select e.id
  into v_empresa_id
  from public.empresas e
  where lower(coalesce(e.codigo_empresa, '')) = v_codigo
     or lower(coalesce(e.matricula_empresa, '')) = v_codigo
     or lower(e.id::text) = v_codigo
  limit 1;

  if v_empresa_id is null then
    raise exception 'Empresa não encontrada para o código/matrícula informado.';
  end if;

  select rs.id
  into v_staff_id
  from public.restaurant_staff rs
  where rs.empresa_id = v_empresa_id
    and coalesce(rs.ativo, true) = true
    and rs.cpf_normalizado = v_cpf
    and (
      lower(rs.nome) like '%' || v_nome_primeiro || '%'
      or lower(rs.nome) = v_nome
    )
  order by rs.updated_at desc nulls last, rs.created_at desc
  limit 1;

  if v_staff_id is null then
    raise exception 'Funcionário não encontrado, inativo ou não pertence à empresa informada.';
  end if;

  update public.restaurant_staff rs
  set
    ultimo_acesso_em = now(),
    updated_at = now()
  where rs.id = v_staff_id
    and rs.empresa_id = v_empresa_id;

  v_session_expires_at := now() + interval '12 hours';

  insert into public.restaurant_staff_sessions (
    empresa_id,
    staff_id,
    setor,
    ativo,
    created_at,
    expires_at,
    last_seen_at
  )
  select
    rs.empresa_id,
    rs.id,
    rs.setor,
    true,
    now(),
    v_session_expires_at,
    now()
  from public.restaurant_staff rs
  where rs.id = v_staff_id
    and rs.empresa_id = v_empresa_id
  returning public.restaurant_staff_sessions.id
  into v_session_id;

  return query
  select
    rs.id,
    rs.empresa_id,
    rs.nome,
    rs.cpf,
    rs.cpf_normalizado,
    rs.setor,
    rs.cargo,
    rs.ativo,
    rs.ultimo_acesso_em,
    rs.created_at,
    rs.updated_at,
    v_session_id as session_id,
    v_session_expires_at as session_expires_at
  from public.restaurant_staff rs
  where rs.id = v_staff_id
    and rs.empresa_id = v_empresa_id;
end;
$$;

grant execute on function public.vf_restaurante_login_staff(text, text, text) to anon, authenticated;


-- ============================================================
-- 6. FUNÇÃO PARA VALIDAR SESSÃO OPERACIONAL
-- ============================================================

create or replace function public.vf_restaurante_validar_staff_session(
  p_session_id uuid,
  p_setor text default null
)
returns table (
  session_valida boolean,
  empresa_id uuid,
  staff_id uuid,
  setor text,
  pode_operar boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session record;
  v_setor text := lower(trim(coalesce(p_setor, '')));
begin
  select
    s.id,
    s.empresa_id,
    s.staff_id,
    lower(s.setor) as setor,
    s.ativo,
    s.expires_at,
    rs.ativo as staff_ativo
  into v_session
  from public.restaurant_staff_sessions s
  join public.restaurant_staff rs on rs.id = s.staff_id
  where s.id = p_session_id
  limit 1;

  if v_session.id is null then
    return query select false, null::uuid, null::uuid, null::text, false;
    return;
  end if;

  if coalesce(v_session.ativo, false) = false
     or coalesce(v_session.staff_ativo, false) = false
     or (v_session.expires_at is not null and v_session.expires_at < now())
  then
    return query select false, v_session.empresa_id, v_session.staff_id, v_session.setor, false;
    return;
  end if;

  update public.restaurant_staff_sessions
  set last_seen_at = now()
  where id = p_session_id;

  if v_setor = ''
     or v_session.setor in ('gerente', 'admin', 'administrador')
     or v_session.setor = v_setor
  then
    return query select true, v_session.empresa_id, v_session.staff_id, v_session.setor, true;
  else
    return query select true, v_session.empresa_id, v_session.staff_id, v_session.setor, false;
  end if;
end;
$$;

grant execute on function public.vf_restaurante_validar_staff_session(uuid, text) to anon, authenticated;