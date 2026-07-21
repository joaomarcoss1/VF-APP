-- VF Nexus V15 Produção 10/10 — hardening multiempresa, RLS, auditoria, delivery, PDV, scanner e etiquetas
-- Idempotente. Execute após as migrations 001-028.

create extension if not exists pgcrypto;

-- =========================================================
-- 1. Funções de segurança multiempresa
-- =========================================================
create or replace function public.current_profile_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$ select auth.uid() $$;

create or replace function public.current_empresa_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.empresa_id
  from public.perfis p
  where p.id = auth.uid()
  limit 1
$$;

create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
    when coalesce(p.is_master,false) or p.cargo in ('master_admin','super_admin') then 'super_admin'
    when p.cargo in ('empresa_admin','admin_empresa','administrador','dono') then 'empresa_admin'
    when p.cargo = 'gerente' then 'gerente'
    when p.cargo in ('driver','entregador') then 'driver'
    else 'funcionario'
  end
  from public.perfis p
  where p.id = auth.uid()
  limit 1
$$;

create or replace function public.is_super_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select coalesce(is_master,false) or cargo in ('master_admin','super_admin') from public.perfis where id = auth.uid()), false)
$$;

create or replace function public.is_empresa_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select cargo in ('empresa_admin','admin_empresa','administrador','dono') from public.perfis where id = auth.uid()), false)
$$;

create or replace function public.is_gerente()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select cargo = 'gerente' from public.perfis where id = auth.uid()), false)
$$;

create or replace function public.is_funcionario()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select cargo not in ('master_admin','super_admin','empresa_admin','admin_empresa','administrador','dono','gerente','driver','entregador') from public.perfis where id = auth.uid()), false)
$$;

create or replace function public.is_driver()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select cargo in ('driver','entregador') from public.perfis where id = auth.uid()), false)
$$;

create or replace function public.user_belongs_to_empresa(empresa uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select empresa is not null and (
    public.is_super_admin()
    or exists (select 1 from public.perfis p where p.id = auth.uid() and p.empresa_id = empresa)
    or exists (select 1 from public.usuarios_empresas ue where ue.profile_id = auth.uid() and ue.empresa_id = empresa and coalesce(ue.status,'ativo') = 'ativo')
  )
$$;

create or replace function public.can_access_empresa(empresa uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.user_belongs_to_empresa(empresa)
$$;

create or replace function public.can_manage_empresa(empresa uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select empresa is not null and (public.is_super_admin() or exists (
    select 1 from public.perfis p where p.id = auth.uid() and p.empresa_id = empresa and p.cargo in ('empresa_admin','admin_empresa','administrador','dono','gerente')
  ))
$$;

create or replace function public.can_access_delivery(delivery uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.deliveries d
    where d.id = delivery and (
      public.can_manage_empresa(d.company_id)
      or exists (select 1 from public.delivery_drivers dr where dr.id = d.assigned_driver_id and dr.profile_id = auth.uid())
      or exists (select 1 from public.delivery_offers o join public.delivery_drivers dr on dr.id = o.driver_id where o.delivery_id = d.id and dr.profile_id = auth.uid())
    )
  )
$$;

create or replace function public.can_access_label(lote uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.etiquetas_lotes el where el.id = lote and public.can_access_empresa(el.empresa_id))
$$;

create or replace function public.can_access_product(produto uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.produtos p where p.id = produto and public.can_access_empresa(p.empresa_id))
$$;

-- =========================================================
-- 2. Estrutura de empresas, perfis e vínculos
-- =========================================================
alter table if exists public.empresas
  add column if not exists codigo_empresa text,
  add column if not exists matricula_empresa text,
  add column if not exists status text default 'ativo',
  add column if not exists plano text default 'trial',
  add column if not exists responsavel text,
  add column if not exists updated_at timestamptz default now();

create unique index if not exists idx_empresas_codigo_empresa on public.empresas(codigo_empresa) where codigo_empresa is not null;
create unique index if not exists idx_empresas_matricula_empresa on public.empresas(matricula_empresa) where matricula_empresa is not null;

alter table if exists public.perfis
  add column if not exists empresa_id uuid references public.empresas(id) on delete set null,
  add column if not exists is_master boolean default false,
  add column if not exists cargo text default 'funcionario',
  add column if not exists status text default 'ativo',
  add column if not exists ultimo_login timestamptz,
  add column if not exists permissoes text[] default array[]::text[];

create table if not exists public.usuarios_empresas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  profile_id uuid not null references public.perfis(id) on delete cascade,
  role text not null default 'funcionario',
  cargo text,
  setor text,
  status text not null default 'ativo',
  permissoes jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (empresa_id, profile_id)
);

create index if not exists idx_usuarios_empresas_empresa on public.usuarios_empresas(empresa_id, status);
create index if not exists idx_usuarios_empresas_profile on public.usuarios_empresas(profile_id, status);

-- =========================================================
-- 3. Garantia de colunas tenant e índices em tabelas empresariais
-- =========================================================
do $$
declare t text;
begin
  foreach t in array array[
    'produtos','produto_estoque','movimentacoes_estoque','clientes','fornecedores','vendas','venda_itens','venda_pagamentos',
    'lancamentos_financeiros','despesas','cardapios','cardapio_itens','catalogos_publicos','promocoes','etiquetas_lotes','etiquetas_itens',
    'codigos_barras_produtos','importacoes_estoque','importacoes_etiquetas','importacoes_dados','suporte_chamados','logs_auditoria','logs_erro',
    'integracoes','webhooks_config','webhooks_eventos','assinaturas_saas'
  ] loop
    if to_regclass('public.' || t) is not null then
      execute format('alter table public.%I add column if not exists empresa_id uuid references public.empresas(id) on delete cascade', t);
      execute format('create index if not exists idx_%s_empresa_v15 on public.%I(empresa_id)', replace(t,'-','_'), t);
      execute format('alter table public.%I enable row level security', t);
    end if;
  end loop;
end $$;

-- Delivery usa company_id. Garantir índices e RLS.
do $$
declare t text;
begin
  foreach t in array array['delivery_drivers','deliveries','delivery_offers','delivery_status_history','delivery_earnings','delivery_receipts','delivery_sync_queue','delivery_driver_devices'] loop
    if to_regclass('public.' || t) is not null then
      execute format('alter table public.%I add column if not exists company_id uuid references public.empresas(id) on delete cascade', t);
      execute format('create index if not exists idx_%s_company_v15 on public.%I(company_id)', t, t);
      execute format('alter table public.%I enable row level security', t);
    end if;
  end loop;
end $$;

-- =========================================================
-- 4. Policies tenant-safe genéricas
-- =========================================================
do $$
declare t text;
begin
  foreach t in array array[
    'produtos','produto_estoque','movimentacoes_estoque','clientes','fornecedores','vendas','venda_itens','venda_pagamentos',
    'lancamentos_financeiros','despesas','cardapios','cardapio_itens','promocoes','etiquetas_lotes','etiquetas_itens',
    'codigos_barras_produtos','importacoes_estoque','importacoes_etiquetas','importacoes_dados','suporte_chamados','logs_auditoria','logs_erro',
    'integracoes','webhooks_config','webhooks_eventos','assinaturas_saas'
  ] loop
    if to_regclass('public.' || t) is not null then
      execute format('drop policy if exists %I on public.%I', t || '_tenant_select_v15', t);
      execute format('create policy %I on public.%I for select using (public.can_access_empresa(empresa_id))', t || '_tenant_select_v15', t);
      execute format('drop policy if exists %I on public.%I', t || '_tenant_insert_v15', t);
      execute format('create policy %I on public.%I for insert with check (public.can_access_empresa(empresa_id))', t || '_tenant_insert_v15', t);
      execute format('drop policy if exists %I on public.%I', t || '_tenant_update_v15', t);
      execute format('create policy %I on public.%I for update using (public.can_access_empresa(empresa_id)) with check (public.can_access_empresa(empresa_id))', t || '_tenant_update_v15', t);
      execute format('drop policy if exists %I on public.%I', t || '_tenant_delete_v15', t);
      execute format('create policy %I on public.%I for delete using (public.can_manage_empresa(empresa_id))', t || '_tenant_delete_v15', t);
    end if;
  end loop;
end $$;

-- Empresas/perfis/vínculos
alter table if exists public.empresas enable row level security;
drop policy if exists empresas_select_v15 on public.empresas;
create policy empresas_select_v15 on public.empresas for select using (public.is_super_admin() or public.can_access_empresa(id));
drop policy if exists empresas_admin_write_v15 on public.empresas;
create policy empresas_admin_write_v15 on public.empresas for all using (public.is_super_admin()) with check (public.is_super_admin());

alter table if exists public.perfis enable row level security;
drop policy if exists perfis_select_v15 on public.perfis;
create policy perfis_select_v15 on public.perfis for select using (id = auth.uid() or public.is_super_admin() or public.can_manage_empresa(empresa_id));
drop policy if exists perfis_update_v15 on public.perfis;
create policy perfis_update_v15 on public.perfis for update using (id = auth.uid() or public.is_super_admin() or public.can_manage_empresa(empresa_id)) with check (id = auth.uid() or public.is_super_admin() or public.can_manage_empresa(empresa_id));

alter table if exists public.usuarios_empresas enable row level security;
drop policy if exists usuarios_empresas_select_v15 on public.usuarios_empresas;
create policy usuarios_empresas_select_v15 on public.usuarios_empresas for select using (public.is_super_admin() or profile_id = auth.uid() or public.can_manage_empresa(empresa_id));
drop policy if exists usuarios_empresas_write_v15 on public.usuarios_empresas;
create policy usuarios_empresas_write_v15 on public.usuarios_empresas for all using (public.is_super_admin() or public.can_manage_empresa(empresa_id)) with check (public.is_super_admin() or public.can_manage_empresa(empresa_id));

-- Catálogo público: leitura pública apenas do publicado/ativo.
alter table if exists public.catalogos_publicos enable row level security;
drop policy if exists catalogos_publicos_public_select_v15 on public.catalogos_publicos;
create policy catalogos_publicos_public_select_v15 on public.catalogos_publicos for select using (ativo = true);
drop policy if exists catalogos_publicos_tenant_write_v15 on public.catalogos_publicos;
create policy catalogos_publicos_tenant_write_v15 on public.catalogos_publicos for all using (public.can_manage_empresa(empresa_id)) with check (public.can_manage_empresa(empresa_id));

-- Delivery policies
alter table if exists public.delivery_drivers enable row level security;
drop policy if exists delivery_drivers_v15 on public.delivery_drivers;
create policy delivery_drivers_v15 on public.delivery_drivers for all using (public.can_manage_empresa(company_id) or profile_id = auth.uid()) with check (public.can_manage_empresa(company_id) or profile_id = auth.uid());

alter table if exists public.deliveries enable row level security;
drop policy if exists deliveries_select_v15 on public.deliveries;
create policy deliveries_select_v15 on public.deliveries for select using (public.can_manage_empresa(company_id) or public.can_access_delivery(id));
drop policy if exists deliveries_write_v15 on public.deliveries;
create policy deliveries_write_v15 on public.deliveries for insert with check (public.can_manage_empresa(company_id));
drop policy if exists deliveries_update_v15 on public.deliveries;
create policy deliveries_update_v15 on public.deliveries for update using (public.can_manage_empresa(company_id) or public.can_access_delivery(id)) with check (public.can_manage_empresa(company_id) or public.can_access_delivery(id));

-- =========================================================
-- 5. Auditoria e health checks
-- =========================================================
create or replace function public.vf_audit_v15(p_acao text, p_entidade text default null, p_entidade_id uuid default null, p_detalhes jsonb default '{}'::jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_empresa uuid := public.current_empresa_id();
begin
  if to_regclass('public.logs_auditoria') is null then return; end if;
  insert into public.logs_auditoria(empresa_id, usuario_id, acao, entidade, entidade_id, detalhes, created_at)
  values (v_empresa, auth.uid(), p_acao, p_entidade, p_entidade_id, coalesce(p_detalhes,'{}'::jsonb), now());
end;
$$;

create or replace function public.vf_security_health_v15()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'version','v15-producao-10-10',
    'user_id', auth.uid(),
    'empresa_id', public.current_empresa_id(),
    'role', public.current_user_role(),
    'is_super_admin', public.is_super_admin(),
    'checked_at', now()
  )
$$;
