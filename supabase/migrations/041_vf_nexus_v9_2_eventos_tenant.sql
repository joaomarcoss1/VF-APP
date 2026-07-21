-- VF Nexus V9.2 — Correção completa para Eventos/Evento Itens com helpers tenant
-- Corrige erro: function public.vf_is_master() does not exist
-- Corrige também ausência de public.vf_same_empresa(uuid)

create extension if not exists pgcrypto;

-- ============================================================
-- 1. FUNÇÃO: ADMIN MASTER
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
-- 2. FUNÇÃO: EMPRESA ATUAL DO USUÁRIO
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
-- 3. FUNÇÃO: COMPARAR EMPRESA
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
-- 4. GARANTIR COLUNAS DE EMPRESA
-- ============================================================

alter table if exists public.eventos
  add column if not exists empresa_id uuid references public.empresas(id) on delete cascade;

alter table if exists public.evento_itens
  add column if not exists empresa_id uuid references public.empresas(id) on delete cascade;


-- ============================================================
-- 5. PREENCHER EMPRESA_ID EM EVENTO_ITENS
-- ============================================================

do $$
begin
  if to_regclass('public.evento_itens') is not null
     and to_regclass('public.eventos') is not null
  then
    update public.evento_itens ei
    set empresa_id = e.empresa_id
    from public.eventos e
    where ei.evento_id = e.id
      and ei.empresa_id is null
      and e.empresa_id is not null;
  end if;
end $$;


-- ============================================================
-- 6. CRIAR ÍNDICES COM SEGURANÇA
-- ============================================================

do $$
begin
  if to_regclass('public.eventos') is not null then
    if exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'eventos'
        and column_name = 'created_at'
    ) then
      execute '
        create index if not exists eventos_empresa_created_idx
        on public.eventos(empresa_id, created_at desc)
      ';
    else
      execute '
        create index if not exists eventos_empresa_idx
        on public.eventos(empresa_id)
      ';
    end if;
  end if;

  if to_regclass('public.evento_itens') is not null then
    execute '
      create index if not exists evento_itens_empresa_evento_idx
      on public.evento_itens(empresa_id, evento_id)
    ';
  end if;
end $$;


-- ============================================================
-- 7. ATIVAR RLS
-- ============================================================

alter table if exists public.eventos enable row level security;
alter table if exists public.evento_itens enable row level security;


-- ============================================================
-- 8. RECRIAR POLICIES DE EVENTOS
-- ============================================================

drop policy if exists eventos_tenant_select_v92 on public.eventos;
create policy eventos_tenant_select_v92
on public.eventos
for select
using (
  public.vf_is_master()
  or public.vf_same_empresa(empresa_id)
);

drop policy if exists eventos_tenant_write_v92 on public.eventos;
create policy eventos_tenant_write_v92
on public.eventos
for all
using (
  public.vf_is_master()
  or public.vf_same_empresa(empresa_id)
)
with check (
  public.vf_is_master()
  or public.vf_same_empresa(empresa_id)
);


-- ============================================================
-- 9. RECRIAR POLICIES DE EVENTO_ITENS
-- ============================================================

drop policy if exists evento_itens_tenant_select_v92 on public.evento_itens;
create policy evento_itens_tenant_select_v92
on public.evento_itens
for select
using (
  public.vf_is_master()
  or public.vf_same_empresa(empresa_id)
);

drop policy if exists evento_itens_tenant_write_v92 on public.evento_itens;
create policy evento_itens_tenant_write_v92
on public.evento_itens
for all
using (
  public.vf_is_master()
  or public.vf_same_empresa(empresa_id)
)
with check (
  public.vf_is_master()
  or public.vf_same_empresa(empresa_id)
);