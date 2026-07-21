-- VF Nexus — Base tenant + Isolamento de notificações centrais
-- Corrige: function public.vf_is_master() does not exist
-- Corrige: function public.vf_same_empresa(uuid) does not exist

create extension if not exists pgcrypto;

-- ============================================================
-- 1. BASE MASTER / PERFIS
-- ============================================================

create table if not exists public.master_admins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  email text,
  nome text,
  ativo boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table if exists public.master_admins
  add column if not exists user_id uuid,
  add column if not exists email text,
  add column if not exists nome text,
  add column if not exists ativo boolean default true,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

alter table if exists public.perfis
  add column if not exists empresa_id uuid,
  add column if not exists is_master boolean default false,
  add column if not exists bloqueado boolean default false;

-- ============================================================
-- 2. FUNÇÃO: ADMIN MASTER
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
-- 3. FUNÇÃO: EMPRESA ATUAL
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
-- 4. FUNÇÃO: COMPARAR EMPRESA
-- ============================================================

create or replace function public.vf_same_empresa(p_empresa_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public, auth
as $$
begin
  if p_empresa_id is null then
    return false;
  end if;

  return p_empresa_id = public.vf_current_empresa_id();
exception
  when others then
    return false;
end;
$$;

grant execute on function public.vf_same_empresa(uuid) to anon, authenticated;

-- ============================================================
-- 5. NOTIFICAÇÕES CENTRAIS
-- ============================================================

create table if not exists public.notificacoes_central (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid references public.empresas(id) on delete cascade,
  tipo text not null default 'info',
  titulo text not null,
  mensagem text not null,
  prioridade text default 'media',
  entidade text,
  entidade_id uuid,
  lida boolean default false,
  lida_em timestamptz,
  created_at timestamptz default now()
);

alter table if exists public.notificacoes_central
  add column if not exists empresa_id uuid references public.empresas(id) on delete cascade,
  add column if not exists tipo text default 'info',
  add column if not exists titulo text,
  add column if not exists mensagem text,
  add column if not exists prioridade text default 'media',
  add column if not exists entidade text,
  add column if not exists entidade_id uuid,
  add column if not exists lida boolean default false,
  add column if not exists lida_em timestamptz,
  add column if not exists created_at timestamptz default now();

update public.notificacoes_central
set
  tipo = coalesce(tipo, 'info'),
  prioridade = coalesce(prioridade, 'media'),
  lida = coalesce(lida, false),
  created_at = coalesce(created_at, now());

create index if not exists notificacoes_central_empresa_created_idx
on public.notificacoes_central(empresa_id, created_at desc);

create index if not exists notificacoes_central_empresa_lida_idx
on public.notificacoes_central(empresa_id, lida);

alter table if exists public.notificacoes_central enable row level security;

drop policy if exists notificacoes_tenant_select_v92 on public.notificacoes_central;

create policy notificacoes_tenant_select_v92
on public.notificacoes_central
for select
using (
  public.vf_is_master()
  or public.vf_same_empresa(empresa_id)
);

drop policy if exists notificacoes_tenant_write_v92 on public.notificacoes_central;

create policy notificacoes_tenant_write_v92
on public.notificacoes_central
for all
using (
  public.vf_is_master()
  or public.vf_same_empresa(empresa_id)
)
with check (
  public.vf_is_master()
  or public.vf_same_empresa(empresa_id)
);