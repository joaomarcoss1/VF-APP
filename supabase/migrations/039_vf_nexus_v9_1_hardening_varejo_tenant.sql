-- VF Nexus — Correção robusta para policies de variações por empresa
-- Resolve: function public.vf_is_master() does not exist
-- Resolve também ausência de public.vf_current_empresa_id()

create extension if not exists pgcrypto;

-- ============================================================
-- 1. GARANTIR ESTRUTURA MÍNIMA DE MASTER/PERFIS
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
-- 2. FUNÇÃO: VERIFICAR SE O USUÁRIO É MASTER
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
    execute '
      select exists (
        select 1
        from public.master_admins
        where user_id = $1
          and coalesce(ativo, true) = true
      )
    '
    using v_uid
    into v_ok;

    if coalesce(v_ok, false) then
      return true;
    end if;
  end if;

  if to_regclass('public.perfis') is not null then
    execute '
      select exists (
        select 1
        from public.perfis
        where id = $1
          and coalesce(is_master, false) = true
          and coalesce(bloqueado, false) = false
      )
    '
    using v_uid
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

-- ============================================================
-- 3. FUNÇÃO: PEGAR EMPRESA ATUAL DO USUÁRIO
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
  v_has_profile_id boolean := false;
  v_has_usuario_id boolean := false;
  v_has_status boolean := false;
  v_status_filter text := '';
begin
  v_uid := auth.uid();

  if v_uid is null then
    return null;
  end if;

  -- Primeiro tenta buscar pela tabela perfis
  if to_regclass('public.perfis') is not null
     and exists (
       select 1
       from information_schema.columns
       where table_schema = 'public'
         and table_name = 'perfis'
         and column_name = 'empresa_id'
     )
  then
    execute '
      select empresa_id
      from public.perfis
      where id = $1
        and empresa_id is not null
      limit 1
    '
    using v_uid
    into v_empresa_id;

    if v_empresa_id is not null then
      return v_empresa_id;
    end if;
  end if;

  -- Depois tenta buscar pela tabela usuarios_empresas, caso exista
  if to_regclass('public.usuarios_empresas') is not null then

    select exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'usuarios_empresas'
        and column_name = 'profile_id'
    )
    into v_has_profile_id;

    select exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'usuarios_empresas'
        and column_name = 'usuario_id'
    )
    into v_has_usuario_id;

    select exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'usuarios_empresas'
        and column_name = 'status'
    )
    into v_has_status;

    if v_has_status then
      v_status_filter := ' and coalesce(status::text, ''ativo'') in (''ativo'', ''active'', ''aprovado'', ''approved'') ';
    else
      v_status_filter := '';
    end if;

    if v_has_profile_id then
      execute '
        select empresa_id
        from public.usuarios_empresas
        where profile_id = $1
          and empresa_id is not null
          ' || v_status_filter || '
        limit 1
      '
      using v_uid
      into v_empresa_id;

      if v_empresa_id is not null then
        return v_empresa_id;
      end if;
    end if;

    if v_has_usuario_id then
      execute '
        select empresa_id
        from public.usuarios_empresas
        where usuario_id = $1
          and empresa_id is not null
          ' || v_status_filter || '
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

grant execute on function public.vf_is_master() to anon, authenticated;
grant execute on function public.vf_current_empresa_id() to anon, authenticated;

-- ============================================================
-- 4. GARANTIR EMPRESA_ID NAS TABELAS DE VARIAÇÃO
-- ============================================================

alter table if exists public.produto_variacoes
  add column if not exists empresa_id uuid references public.empresas(id) on delete cascade;

alter table if exists public.produto_variacao_estoque
  add column if not exists empresa_id uuid references public.empresas(id) on delete cascade;

alter table if exists public.movimentacoes_variacao_estoque
  add column if not exists empresa_id uuid references public.empresas(id) on delete cascade;

do $$
begin
  if to_regclass('public.produto_variacoes') is not null
     and to_regclass('public.produtos') is not null
  then
    update public.produto_variacoes pv
    set empresa_id = p.empresa_id
    from public.produtos p
    where pv.produto_id = p.id
      and pv.empresa_id is null
      and p.empresa_id is not null;
  end if;

  if to_regclass('public.produto_variacao_estoque') is not null
     and to_regclass('public.produto_variacoes') is not null
  then
    update public.produto_variacao_estoque pve
    set empresa_id = pv.empresa_id
    from public.produto_variacoes pv
    where pve.variacao_id = pv.id
      and pve.empresa_id is null
      and pv.empresa_id is not null;
  end if;

  if to_regclass('public.movimentacoes_variacao_estoque') is not null
     and to_regclass('public.produto_variacoes') is not null
  then
    update public.movimentacoes_variacao_estoque mve
    set empresa_id = pv.empresa_id
    from public.produto_variacoes pv
    where mve.variacao_id = pv.id
      and mve.empresa_id is null
      and pv.empresa_id is not null;
  end if;
end $$;

-- ============================================================
-- 5. CRIAR ÍNDICES COM SEGURANÇA
-- ============================================================

do $$
begin
  if to_regclass('public.produto_variacoes') is not null then
    execute '
      create index if not exists produto_variacoes_empresa_produto_v91_idx
      on public.produto_variacoes(empresa_id, produto_id)
    ';
  end if;

  if to_regclass('public.produto_variacao_estoque') is not null then
    execute '
      create index if not exists produto_variacao_estoque_empresa_variacao_v91_idx
      on public.produto_variacao_estoque(empresa_id, variacao_id)
    ';
  end if;

  if to_regclass('public.movimentacoes_variacao_estoque') is not null then
    if exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'movimentacoes_variacao_estoque'
        and column_name = 'created_at'
    ) then
      execute '
        create index if not exists movimentacoes_variacao_estoque_empresa_variacao_v91_idx
        on public.movimentacoes_variacao_estoque(empresa_id, variacao_id, created_at desc)
      ';
    else
      execute '
        create index if not exists movimentacoes_variacao_estoque_empresa_variacao_v91_idx
        on public.movimentacoes_variacao_estoque(empresa_id, variacao_id)
      ';
    end if;
  end if;
end $$;

-- ============================================================
-- 6. ATIVAR RLS E RECRIAR POLICIES
-- ============================================================

do $$
declare
  t text;
  select_policy text;
  all_policy text;
begin
  foreach t in array array[
    'produto_variacoes',
    'produto_variacao_estoque',
    'movimentacoes_variacao_estoque'
  ] loop

    if to_regclass('public.' || t) is not null then

      execute format('alter table public.%I enable row level security', t);

      select_policy := 'vf_v91_tenant_select_' || t;
      all_policy := 'vf_v91_tenant_all_' || t;

      execute format(
        'drop policy if exists %I on public.%I',
        select_policy,
        t
      );

      execute format(
        'create policy %I on public.%I for select using (
          public.vf_is_master()
          or empresa_id = public.vf_current_empresa_id()
        )',
        select_policy,
        t
      );

      execute format(
        'drop policy if exists %I on public.%I',
        all_policy,
        t
      );

      execute format(
        'create policy %I on public.%I for all using (
          public.vf_is_master()
          or empresa_id = public.vf_current_empresa_id()
        ) with check (
          public.vf_is_master()
          or empresa_id = public.vf_current_empresa_id()
        )',
        all_policy,
        t
      );

    end if;
  end loop;
end $$;