-- VF Nexus V4 — Ramos modulares, funções ocultas por empresa, Bar/Drinks e proteção multiempresa
-- Execute após 031, 032, 033 e 034.

create extension if not exists pgcrypto;

-- Empresas passam a ter ramo definitivo, código/matrícula e configuração modular.
alter table if exists public.empresas
  add column if not exists ramo_atividade text,
  add column if not exists codigo_empresa text,
  add column if not exists matricula_empresa text,
  add column if not exists modulos_configurados jsonb default '{}'::jsonb,
  add column if not exists updated_at timestamptz default now();

update public.empresas
set ramo_atividade = coalesce(
  ramo_atividade,
  case
    when tipo in ('restaurante','bar','hamburgueria','delivery','buffet','cafeteria','lanchonete','alimenticio') then 'bar_restaurante'
    when tipo = 'barbearia' then 'barbearia'
    when tipo = 'confeitaria' then 'confeitaria'
    when tipo = 'roupas' then 'roupas'
    when tipo = 'eletronicos' then 'eletronicos'
    when tipo = 'prestador_servico' then 'prestador_servicos'
    else 'autonomo'
  end
),
matricula_empresa = coalesce(nullif(matricula_empresa, ''), nullif(codigo_empresa, ''), 'VF-' || upper(substr(replace(id::text, '-', ''), 1, 6))),
codigo_empresa = coalesce(nullif(codigo_empresa, ''), nullif(matricula_empresa, ''), 'VF-' || upper(substr(replace(id::text, '-', ''), 1, 6))),
updated_at = now();

create index if not exists empresas_ramo_atividade_idx on public.empresas(ramo_atividade);
create unique index if not exists empresas_codigo_empresa_unique_idx on public.empresas(lower(codigo_empresa)) where codigo_empresa is not null;
create unique index if not exists empresas_matricula_empresa_unique_idx on public.empresas(lower(matricula_empresa)) where matricula_empresa is not null;

-- Controle final do Admin Master: quando ativo=false, o módulo some; quando ativo=true, aparece mesmo se for extra.
create table if not exists public.empresa_modulos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  modulo_codigo text not null,
  ramo_origem text,
  ativo boolean not null default true,
  liberado_por_master boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (empresa_id, modulo_codigo)
);

alter table public.empresa_modulos enable row level security;
create index if not exists empresa_modulos_empresa_modulo_idx on public.empresa_modulos(empresa_id, modulo_codigo);
create index if not exists empresa_modulos_empresa_ativo_idx on public.empresa_modulos(empresa_id, ativo);

-- Staff operacional com setores reais.
alter table if exists public.restaurant_staff
  add column if not exists cpf_normalizado text,
  add column if not exists setor text default 'atendimento',
  add column if not exists ativo boolean default true,
  add column if not exists ultimo_acesso_em timestamptz,
  add column if not exists updated_at timestamptz default now();

update public.restaurant_staff
set cpf_normalizado = regexp_replace(coalesce(cpf, ''), '\D', '', 'g'),
    setor = case when setor in ('bar','drinks') then 'bar_drinks' else coalesce(setor, 'atendimento') end,
    updated_at = now();

create index if not exists restaurant_staff_empresa_setor_idx on public.restaurant_staff(empresa_id, setor, ativo);
create index if not exists restaurant_staff_empresa_cpf_idx on public.restaurant_staff(empresa_id, cpf_normalizado) where ativo = true;

-- Produção separada: cozinha e bar_drinks.
alter table if exists public.produtos
  add column if not exists setor_producao text default 'nenhum',
  add column if not exists aparece_no_atendimento boolean default true,
  add column if not exists categoria_atendimento text,
  add column if not exists ordem_atendimento int default 0;

update public.produtos
set setor_producao = case when setor_producao in ('bar','drinks') then 'bar_drinks' else coalesce(setor_producao, 'nenhum') end;

alter table if exists public.restaurant_tab_items
  add column if not exists setor_producao text default 'nenhum';
update public.restaurant_tab_items set setor_producao = 'bar_drinks' where setor_producao in ('bar','drinks');

alter table if exists public.restaurant_orders
  add column if not exists setor text default 'cozinha',
  add column if not exists setor_producao text;
update public.restaurant_orders
set setor = case when setor in ('bar','drinks') then 'bar_drinks' else coalesce(setor, 'cozinha') end,
    setor_producao = coalesce(setor_producao, setor);

create index if not exists produtos_empresa_setor_producao_idx on public.produtos(empresa_id, setor_producao);
create index if not exists restaurant_orders_empresa_setor_status_idx on public.restaurant_orders(empresa_id, setor, status);

-- Notificações por setor e leitura.
alter table if exists public.restaurant_notifications
  add column if not exists read_at timestamptz,
  add column if not exists target_sector text,
  add column if not exists target_user_id uuid,
  add column if not exists entity_type text,
  add column if not exists entity_id uuid;

create index if not exists restaurant_notifications_unread_sector_idx
on public.restaurant_notifications(empresa_id, target_sector, created_at desc)
where read_at is null;

-- Função de login operacional: derruba versões antigas para permitir mudar retorno sem erro 42P13.
do $$
declare
  r record;
begin
  for r in
    select p.oid::regprocedure as funcao
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'vf_restaurante_login_staff'
  loop
    execute format('drop function if exists %s', r.funcao);
  end loop;
end $$;

create or replace function public.vf_restaurante_login_staff(
  p_nome text,
  p_cpf text,
  p_codigo_empresa text default null
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
begin
  if p_codigo_empresa is not null and length(trim(p_codigo_empresa)) > 0 then
    select e.id into v_empresa_id
    from public.empresas e
    where lower(e.codigo_empresa) = lower(trim(p_codigo_empresa))
       or lower(e.matricula_empresa) = lower(trim(p_codigo_empresa))
       or '' = lower(trim(p_codigo_empresa))
    limit 1;
  end if;

  return query
  with found as (
    select rs.*
    from public.restaurant_staff rs
    where rs.ativo = true
      and rs.cpf_normalizado = regexp_replace(coalesce(p_cpf, ''), '\D', '', 'g')
      and (v_empresa_id is null or rs.empresa_id = v_empresa_id)
      and lower(rs.nome) like lower('%' || split_part(trim(coalesce(p_nome, '')), ' ', 1) || '%')
    order by rs.updated_at desc nulls last, rs.created_at desc
    limit 1
  ), touched as (
    update public.restaurant_staff rs
    set ultimo_acesso_em = now(), updated_at = now()
    from found f
    where rs.id = f.id
    returning rs.*
  )
  select t.id, t.empresa_id, t.nome, t.cpf, t.cpf_normalizado, t.setor, t.cargo, t.ativo, t.ultimo_acesso_em, t.created_at, t.updated_at
  from touched t;

  if not found then
    raise exception 'Funcionário não encontrado, inativo ou sem permissão para esta empresa.';
  end if;
end;
$$;

-- Função utilitária para o front/master obter módulos configurados sem misturar empresas.
create or replace function public.vf_empresa_modulos_visiveis(p_empresa_id uuid)
returns table (modulo_codigo text, ativo boolean, liberado_por_master boolean)
language sql
security definer
set search_path = public
as $$
  select em.modulo_codigo, em.ativo, em.liberado_por_master
  from public.empresa_modulos em
  where em.empresa_id = p_empresa_id;
$$;

-- RLS básica por empresa_id em tudo que é operacional/modular.
do $$
declare
  t text;
begin
  foreach t in array array[
    'empresa_modulos',
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
