
-- VF Nexus V9 — estabilização restaurante, tenant e setores operacionais.
-- Compatível com bancos que já rodaram versões anteriores.

create extension if not exists pgcrypto;

-- Restaurant staff: aceitar Bar/Drinks e Admin operacional.
alter table if exists public.restaurant_staff
  add column if not exists empresa_id uuid,
  add column if not exists cpf_normalizado text,
  add column if not exists setor text default 'atendimento',
  add column if not exists ativo boolean default true,
  add column if not exists ultimo_acesso_em timestamptz,
  add column if not exists updated_at timestamptz default now();

update public.restaurant_staff
set cpf_normalizado = regexp_replace(coalesce(cpf_normalizado, cpf, ''), '\D', '', 'g')
where cpf_normalizado is null or cpf_normalizado = '';

-- Remove constraints antigas de setor antes de recriar.
do $$
declare
  c record;
begin
  if to_regclass('public.restaurant_staff') is null then
    return;
  end if;

  for c in
    select conname
    from pg_constraint
    where conrelid = 'public.restaurant_staff'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%setor%'
  loop
    execute format('alter table public.restaurant_staff drop constraint if exists %I', c.conname);
  end loop;
end $$;

alter table if exists public.restaurant_staff
  add constraint restaurant_staff_setor_v9_check
  check (setor is null or setor in ('atendimento','cozinha','bar_drinks','caixa','gerente','admin'));

create index if not exists restaurant_staff_empresa_cpf_v9_idx
on public.restaurant_staff(empresa_id, cpf_normalizado)
where ativo = true;

create index if not exists restaurant_staff_empresa_setor_v9_idx
on public.restaurant_staff(empresa_id, setor, ativo);

-- Compatibilidade empresa_modulos: coluna antiga modulo + coluna nova modulo_codigo.
alter table if exists public.empresa_modulos
  add column if not exists modulo_codigo text,
  add column if not exists ramo_origem text,
  add column if not exists liberado_por_master boolean default false,
  add column if not exists updated_at timestamptz default now();

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='empresa_modulos' and column_name='modulo'
  ) then
    update public.empresa_modulos
    set modulo_codigo = coalesce(nullif(modulo_codigo, ''), modulo)
    where modulo_codigo is null or modulo_codigo = '';
  end if;
end $$;

-- Empresas: códigos e ramos sem depender de coluna empresas.codigo.
alter table if exists public.empresas
  add column if not exists codigo_empresa text,
  add column if not exists matricula_empresa text,
  add column if not exists ramo_atividade text,
  add column if not exists modulos_configurados jsonb default '{}'::jsonb;

update public.empresas
set codigo_empresa = coalesce(nullif(codigo_empresa, ''), 'VF-' || upper(substr(replace(id::text, '-', ''), 1, 6)))
where codigo_empresa is null or codigo_empresa = '';

update public.empresas
set matricula_empresa = coalesce(nullif(matricula_empresa, ''), nullif(codigo_empresa, ''), 'VF-' || upper(substr(replace(id::text, '-', ''), 1, 6)))
where matricula_empresa is null or matricula_empresa = '';

create index if not exists empresas_codigo_empresa_v9_idx on public.empresas(codigo_empresa);
create index if not exists empresas_matricula_empresa_v9_idx on public.empresas(matricula_empresa);
create index if not exists empresas_ramo_atividade_v9_idx on public.empresas(ramo_atividade);

-- Reforço de índices em tabelas operacionais conhecidas.
do $$
declare
  t text;
begin
  foreach t in array array[
    'produtos','clientes','vendas','despesas','agendamentos','ordens_servico','comprovantes','reservation_deposits',
    'restaurant_tables','restaurant_tabs','restaurant_orders','restaurant_order_items','restaurant_notifications',
    'entregas','delivery_drivers','deliveries','produto_estoque','insumos','fornecedores','notas_fiscais','etiquetas_lotes'
  ] loop
    if to_regclass('public.' || t) is not null then
      execute format('create index if not exists %I on public.%I(empresa_id)', t || '_empresa_id_v9_idx', t);
    end if;
  end loop;
end $$;
