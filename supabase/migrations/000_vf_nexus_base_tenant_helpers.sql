-- VF Nexus V9.3 — helpers tenant fundamentais.
-- Esta migration deve ser executada antes de qualquer policy que use vf_is_master,
-- vf_current_empresa_id, vf_same_empresa ou vf_can.

create extension if not exists pgcrypto;

create or replace function public.vf_current_user_id()
returns uuid
language sql
stable
security definer
set search_path = public, auth
as $$
  select auth.uid()
$$;

create or replace function public.vf_current_profile_id()
returns uuid
language sql
stable
security definer
set search_path = public, auth
as $$
  select auth.uid()
$$;

create or replace function public.vf_is_master()
returns boolean
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  v_uid uuid := auth.uid();
  v_ok boolean := false;
begin
  if v_uid is null then
    return false;
  end if;

  if to_regclass('public.master_admins') is not null then
    execute $query$
      select exists (
        select 1
        from public.master_admins ma
        where nullif(to_jsonb(ma)->>'user_id', '')::uuid = $1
          and coalesce(nullif(to_jsonb(ma)->>'ativo', '')::boolean, true)
      )
    $query$
    using v_uid
    into v_ok;

    if coalesce(v_ok, false) then
      return true;
    end if;
  end if;

  if to_regclass('public.perfis') is not null then
    execute $query$
      select exists (
        select 1
        from public.perfis p
        where p.id = $1
          and not coalesce(nullif(to_jsonb(p)->>'bloqueado', '')::boolean, false)
          and (
            coalesce(nullif(to_jsonb(p)->>'is_master', '')::boolean, false)
            or lower(coalesce(to_jsonb(p)->>'cargo', '')) = 'master_admin'
            or exists (
              select 1
              from jsonb_array_elements_text(
                case
                  when jsonb_typeof(coalesce(to_jsonb(p)->'permissoes', '[]'::jsonb)) = 'array'
                    then coalesce(to_jsonb(p)->'permissoes', '[]'::jsonb)
                  else '[]'::jsonb
                end
              ) permission(value)
              where permission.value = '*'
            )
          )
      )
    $query$
    using v_uid
    into v_ok;
  end if;

  return coalesce(v_ok, false);
exception
  when others then
    return false;
end;
$$;

create or replace function public.vf_current_empresa_id()
returns uuid
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  v_uid uuid := auth.uid();
  v_empresa_id uuid;
begin
  if v_uid is null then
    return null;
  end if;

  if to_regclass('public.perfis') is not null then
    execute $query$
      select nullif(to_jsonb(p)->>'empresa_id', '')::uuid
      from public.perfis p
      where p.id = $1
        and nullif(to_jsonb(p)->>'empresa_id', '') is not null
      limit 1
    $query$
    using v_uid
    into v_empresa_id;

    if v_empresa_id is not null then
      return v_empresa_id;
    end if;
  end if;

  if to_regclass('public.usuarios_empresas') is not null then
    execute $query$
      select nullif(to_jsonb(ue)->>'empresa_id', '')::uuid
      from public.usuarios_empresas ue
      where (
        nullif(to_jsonb(ue)->>'profile_id', '')::uuid = $1
        or nullif(to_jsonb(ue)->>'usuario_id', '')::uuid = $1
      )
        and nullif(to_jsonb(ue)->>'empresa_id', '') is not null
        and lower(coalesce(to_jsonb(ue)->>'status', 'ativo'))
          in ('ativo', 'active', 'aprovado', 'approved')
      order by
        case when coalesce(to_jsonb(ue)->>'principal', 'false') = 'true' then 0 else 1 end,
        coalesce(to_jsonb(ue)->>'created_at', '') desc
      limit 1
    $query$
    using v_uid
    into v_empresa_id;
  end if;

  return v_empresa_id;
exception
  when others then
    return null;
end;
$$;

create or replace function public.vf_same_empresa(p_empresa_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select p_empresa_id is not null
    and p_empresa_id = public.vf_current_empresa_id()
$$;

create or replace function public.vf_can(
  p_modulo text,
  p_acao text default 'visualizar'
)
returns boolean
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  v_uid uuid := auth.uid();
  v_ok boolean := false;
begin
  if public.vf_is_master() then
    return true;
  end if;

  if v_uid is null or to_regclass('public.perfis') is null then
    return false;
  end if;

  execute $query$
    select exists (
      select 1
      from public.perfis p
      where p.id = $1
        and not coalesce(nullif(to_jsonb(p)->>'bloqueado', '')::boolean, false)
        and (
          lower(coalesce(to_jsonb(p)->>'cargo', ''))
            in ('dono', 'administrador', 'empresa_admin', 'gerente')
          or exists (
            select 1
            from jsonb_array_elements_text(
              case
                when jsonb_typeof(coalesce(to_jsonb(p)->'permissoes', '[]'::jsonb)) = 'array'
                  then coalesce(to_jsonb(p)->'permissoes', '[]'::jsonb)
                else '[]'::jsonb
              end
            ) permission(value)
            where permission.value in ('*', $2, $2 || '.' || $3)
          )
        )
    )
  $query$
  using v_uid, p_modulo, p_acao
  into v_ok;

  return coalesce(v_ok, false);
exception
  when others then
    return false;
end;
$$;

revoke all on function public.vf_current_user_id() from public;
revoke all on function public.vf_current_profile_id() from public;
revoke all on function public.vf_is_master() from public;
revoke all on function public.vf_current_empresa_id() from public;
revoke all on function public.vf_same_empresa(uuid) from public;
revoke all on function public.vf_can(text, text) from public;

grant execute on function public.vf_current_user_id() to authenticated;
grant execute on function public.vf_current_profile_id() to authenticated;
grant execute on function public.vf_is_master() to anon, authenticated;
grant execute on function public.vf_current_empresa_id() to anon, authenticated;
grant execute on function public.vf_same_empresa(uuid) to anon, authenticated;
grant execute on function public.vf_can(text, text) to authenticated;
