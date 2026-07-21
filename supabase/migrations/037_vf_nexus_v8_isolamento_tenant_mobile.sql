-- VF Nexus V8 — isolamento multiempresa e hardening de RLS
-- Esta migration é idempotente e protege tabelas com empresa_id/company_id.

create extension if not exists pgcrypto;

-- Empresas precisam ter matrícula/código para separação operacional e login por empresa.
alter table if exists public.empresas
  add column if not exists codigo_empresa text,
  add column if not exists matricula_empresa text,
  add column if not exists ramo_atividade text,
  add column if not exists modulos_configurados jsonb default '{}'::jsonb,
  add column if not exists updated_at timestamptz default now();

update public.empresas
set codigo_empresa = coalesce(nullif(codigo_empresa, ''), 'VF-' || upper(substr(replace(id::text, '-', ''), 1, 6)))
where codigo_empresa is null or codigo_empresa = '';

update public.empresas
set matricula_empresa = coalesce(nullif(matricula_empresa, ''), nullif(codigo_empresa, ''), 'VF-' || upper(substr(replace(id::text, '-', ''), 1, 6)))
where matricula_empresa is null or matricula_empresa = '';

create unique index if not exists empresas_codigo_empresa_unique_idx on public.empresas(codigo_empresa) where codigo_empresa is not null;
create unique index if not exists empresas_matricula_empresa_unique_idx on public.empresas(matricula_empresa) where matricula_empresa is not null;

-- Funções auxiliares de segurança.
create or replace function public.vf_is_master()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.perfis p
    where p.id = auth.uid()
      and coalesce(p.is_master, false) = true
  ) or exists (
    select 1 from public.master_admins ma
    where ma.user_id = auth.uid()
      and coalesce(ma.ativo, true) = true
  );
$$;

create or replace function public.vf_current_empresa_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.empresa_id
  from public.perfis p
  where p.id = auth.uid()
  limit 1;
$$;

create or replace function public.vf_same_empresa(p_empresa_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.vf_is_master() or (p_empresa_id is not null and p_empresa_id = public.vf_current_empresa_id());
$$;

-- Aplica policies padronizadas em tabelas com empresa_id.
do $$
declare
  t text;
  tables text[] := array[
    'agendamentos','clientes','produtos','insumos','fichas_tecnicas','estoque','movimentacoes_estoque','produto_estoque','movimentacoes_produto_estoque',
    'vendas','venda_itens','lancamentos_financeiros','contas_pagar','contas_receber','despesas','fornecedores','notas_fiscais','nota_fiscal_itens',
    'ordens_servico','ordens_servico_checklist','ordens_servico_materiais','ordens_servico_fotos','ordens_servico_assinaturas','orcamentos_servico',
    'restaurant_tables','restaurant_tabs','restaurant_tab_items','restaurant_orders','restaurant_order_items','restaurant_tab_payments','restaurant_cash_sessions','restaurant_cash_movements','restaurant_notifications','restaurant_staff',
    'reservation_deposits','reservation_deposit_notifications','empresa_modulos','promocoes','comprovantes_historico','eventos','compras','compra_itens','integracoes_configuracoes'
  ];
begin
  foreach t in array tables loop
    if to_regclass('public.' || t) is not null and exists (
      select 1 from information_schema.columns where table_schema='public' and table_name=t and column_name='empresa_id'
    ) then
      execute format('alter table public.%I enable row level security', t);
      execute format('create index if not exists %I on public.%I(empresa_id)', t || '_empresa_id_v8_idx', t);
      execute format('drop policy if exists vf_tenant_select on public.%I', t);
      execute format('drop policy if exists vf_tenant_insert on public.%I', t);
      execute format('drop policy if exists vf_tenant_update on public.%I', t);
      execute format('drop policy if exists vf_tenant_delete on public.%I', t);
      execute format('create policy vf_tenant_select on public.%I for select using (public.vf_same_empresa(empresa_id))', t);
      execute format('create policy vf_tenant_insert on public.%I for insert with check (public.vf_same_empresa(empresa_id))', t);
      execute format('create policy vf_tenant_update on public.%I for update using (public.vf_same_empresa(empresa_id)) with check (public.vf_same_empresa(empresa_id))', t);
      execute format('create policy vf_tenant_delete on public.%I for delete using (public.vf_same_empresa(empresa_id))', t);
    end if;
  end loop;
end $$;

-- Tabelas antigas de entregas podem usar company_id.
do $$
declare
  t text;
  tables text[] := array['delivery_drivers','deliveries','delivery_offers','delivery_status_history','delivery_earnings','delivery_receipts','delivery_sync_queue','delivery_driver_devices'];
begin
  foreach t in array tables loop
    if to_regclass('public.' || t) is not null and exists (
      select 1 from information_schema.columns where table_schema='public' and table_name=t and column_name='company_id'
    ) then
      execute format('alter table public.%I enable row level security', t);
      execute format('create index if not exists %I on public.%I(company_id)', t || '_company_id_v8_idx', t);
      execute format('drop policy if exists vf_company_select on public.%I', t);
      execute format('drop policy if exists vf_company_insert on public.%I', t);
      execute format('drop policy if exists vf_company_update on public.%I', t);
      execute format('drop policy if exists vf_company_delete on public.%I', t);
      execute format('create policy vf_company_select on public.%I for select using (public.vf_same_empresa(company_id))', t);
      execute format('create policy vf_company_insert on public.%I for insert with check (public.vf_same_empresa(company_id))', t);
      execute format('create policy vf_company_update on public.%I for update using (public.vf_same_empresa(company_id)) with check (public.vf_same_empresa(company_id))', t);
      execute format('create policy vf_company_delete on public.%I for delete using (public.vf_same_empresa(company_id))', t);
    end if;
  end loop;
end $$;

-- Reforço de compatibilidade da tabela empresa_modulos.
alter table if exists public.empresa_modulos
  add column if not exists modulo_codigo text,
  add column if not exists modulo text,
  add column if not exists ramo_origem text,
  add column if not exists liberado_por_master boolean default false,
  add column if not exists updated_at timestamptz default now();

update public.empresa_modulos
set modulo_codigo = coalesce(nullif(modulo_codigo, ''), nullif(modulo, '')),
    modulo = coalesce(nullif(modulo, ''), nullif(modulo_codigo, ''))
where modulo_codigo is null or modulo_codigo = '' or modulo is null or modulo = '';

create unique index if not exists empresa_modulos_empresa_modulo_codigo_unique_idx
on public.empresa_modulos(empresa_id, modulo_codigo)
where modulo_codigo is not null;
