-- VF Nexus Atendimento V3 — Mobile/PWA, permissões por setor e notificações lidas
-- Execute após as migrations 031, 032 e 033.

create extension if not exists pgcrypto;

alter table if exists public.restaurant_staff
  add column if not exists cpf_normalizado text,
  add column if not exists setor text default 'atendimento',
  add column if not exists ativo boolean default true,
  add column if not exists ultimo_acesso_em timestamptz,
  add column if not exists updated_at timestamptz default now();

update public.restaurant_staff
set cpf_normalizado = regexp_replace(coalesce(cpf, ''), '\\D', '', 'g')
where cpf_normalizado is null;

create index if not exists restaurant_staff_empresa_setor_idx on public.restaurant_staff(empresa_id, setor, ativo);
create index if not exists restaurant_staff_empresa_cpf_idx on public.restaurant_staff(empresa_id, cpf_normalizado) where ativo = true;

alter table if exists public.restaurant_notifications
  add column if not exists read_at timestamptz,
  add column if not exists target_sector text,
  add column if not exists target_user_id uuid,
  add column if not exists entity_type text,
  add column if not exists entity_id uuid;

create index if not exists restaurant_notifications_unread_sector_idx
on public.restaurant_notifications(empresa_id, target_sector, created_at desc)
where read_at is null;

-- Login operacional simples por empresa/código, nome e CPF.
drop function if exists public.vf_restaurante_login_staff(text, text, text);
create or replace function public.vf_restaurante_login_staff(
  p_nome text,
  p_cpf text,
  p_codigo_empresa text default null
)
returns public.restaurant_staff
language plpgsql
security definer
set search_path = public
as $$
declare
  v_empresa_id uuid;
  v_staff public.restaurant_staff;
begin
  if p_codigo_empresa is not null and length(trim(p_codigo_empresa)) > 0 then
    select id into v_empresa_id
    from public.empresas
    where codigo_empresa = trim(p_codigo_empresa)
       or matricula_empresa = trim(p_codigo_empresa)
       or codigo = trim(p_codigo_empresa)
    limit 1;
  end if;

  select * into v_staff
  from public.restaurant_staff rs
  where rs.ativo = true
    and rs.cpf_normalizado = regexp_replace(coalesce(p_cpf, ''), '\\D', '', 'g')
    and (v_empresa_id is null or rs.empresa_id = v_empresa_id)
    and lower(rs.nome) like lower('%' || split_part(trim(coalesce(p_nome, '')), ' ', 1) || '%')
  order by rs.updated_at desc nulls last, rs.created_at desc
  limit 1;

  if v_staff.id is null then
    raise exception 'Funcionário não encontrado, inativo ou sem permissão para esta empresa.';
  end if;

  update public.restaurant_staff
  set ultimo_acesso_em = now(), updated_at = now()
  where id = v_staff.id;

  return v_staff;
end;
$$;

-- Reforço de RLS: as tabelas do atendimento devem permanecer isoladas por empresa_id.
do $$
declare
  t text;
begin
  foreach t in array array[
    'restaurant_tables',
    'restaurant_tabs',
    'restaurant_tab_items',
    'restaurant_orders',
    'restaurant_order_items',
    'restaurant_tab_payments',
    'restaurant_cash_sessions',
    'restaurant_cash_movements',
    'restaurant_notifications',
    'restaurant_staff'
  ] loop
    if to_regclass('public.' || t) is not null then
      execute format('alter table public.%I enable row level security', t);
      execute format('create index if not exists %I on public.%I(empresa_id)', t || '_empresa_id_idx', t);
    end if;
  end loop;
end $$;
