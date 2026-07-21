-- VF Nexus V14.3 — isolamento multiempresa, login profissional, RBAC e RLS estrutural
-- Execute depois das migrations anteriores. Idempotente.

create extension if not exists pgcrypto;

-- 1) Empresas com matrícula/código único
alter table public.empresas
  add column if not exists codigo_empresa text,
  add column if not exists matricula_empresa text,
  add column if not exists nome_fantasia text,
  add column if not exists razao_social text,
  add column if not exists cnpj text,
  add column if not exists telefone text,
  add column if not exists responsavel text,
  add column if not exists plano text default 'trial',
  add column if not exists status text default 'ativa',
  add column if not exists updated_at timestamptz default now();

update public.empresas
set nome_fantasia = coalesce(nome_fantasia, nome),
    razao_social = coalesce(razao_social, nome),
    codigo_empresa = coalesce(codigo_empresa, matricula_empresa, 'VF-' || upper(left(replace(id::text,'-',''),6))),
    matricula_empresa = coalesce(matricula_empresa, codigo_empresa, 'VF-' || upper(left(replace(id::text,'-',''),6)))
where nome_fantasia is null or codigo_empresa is null or matricula_empresa is null;

create unique index if not exists empresas_codigo_empresa_unique on public.empresas(lower(codigo_empresa));
create unique index if not exists empresas_matricula_empresa_unique on public.empresas(lower(matricula_empresa));

-- 2) Perfis e vínculo usuário-empresa
alter table public.perfis
  add column if not exists email text,
  add column if not exists telefone text,
  add column if not exists cargo text default 'funcionario',
  add column if not exists permissoes text[] not null default array[]::text[],
  add column if not exists is_master boolean not null default false,
  add column if not exists bloqueado boolean not null default false,
  add column if not exists ultimo_login timestamptz,
  add column if not exists updated_at timestamptz default now();

do $$ begin
  alter table public.perfis drop constraint if exists perfis_cargo_check;
  alter table public.perfis add constraint perfis_cargo_check check (cargo in ('super_admin','master_admin','dono','administrador','empresa_admin','gerente','funcionario','financeiro','vendedor','atendente','operacional','contador'));
exception when others then null; end $$;

create table if not exists public.usuarios_empresas (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null,
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  papel text not null default 'funcionario',
  cargo text,
  setor text,
  permissoes text[] not null default array[]::text[],
  status text not null default 'ativo',
  principal boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(usuario_id, empresa_id)
);

insert into public.usuarios_empresas (usuario_id, empresa_id, papel, cargo, permissoes, status, principal)
select id, empresa_id,
  case when is_master or cargo in ('master_admin','super_admin') then 'super_admin'
       when cargo in ('dono','administrador','empresa_admin') then 'empresa_admin'
       when cargo = 'gerente' then 'gerente'
       else 'funcionario' end,
  cargo,
  permissoes,
  case when bloqueado then 'bloqueado' else 'ativo' end,
  true
from public.perfis
where empresa_id is not null
on conflict (usuario_id, empresa_id) do update set papel=excluded.papel, cargo=excluded.cargo, permissoes=excluded.permissoes, status=excluded.status, updated_at=now();

-- 3) Funções de segurança
create or replace function public.current_user_id()
returns uuid language sql stable as $$ select auth.uid() $$;

create or replace function public.current_empresa_id()
returns uuid language sql stable security definer set search_path = public as $$
  select p.empresa_id
  from public.perfis p
  where p.id = auth.uid()
  limit 1
$$;

create or replace function public.current_user_role()
returns text language sql stable security definer set search_path = public as $$
  select case
    when coalesce(p.is_master,false) or p.cargo in ('super_admin','master_admin') then 'super_admin'
    when p.cargo in ('dono','administrador','empresa_admin') then 'empresa_admin'
    when p.cargo = 'gerente' then 'gerente'
    else 'funcionario'
  end
  from public.perfis p
  where p.id = auth.uid()
  limit 1
$$;

create or replace function public.is_super_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.perfis p where p.id = auth.uid() and (coalesce(p.is_master,false) or p.cargo in ('super_admin','master_admin')))
     or exists(select 1 from public.master_admins m where m.user_id = auth.uid())
$$;

create or replace function public.is_empresa_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.perfis p where p.id = auth.uid() and p.cargo in ('dono','administrador','empresa_admin'))
$$;

create or replace function public.user_belongs_to_empresa(empresa uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select empresa is not null and exists(
    select 1 from public.perfis p
    where p.id = auth.uid() and p.empresa_id = empresa and coalesce(p.bloqueado,false) = false
  )
$$;

create or replace function public.can_access_empresa(empresa uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_super_admin() or public.user_belongs_to_empresa(empresa)
$$;

-- 4) Garantir empresa_id nas tabelas multiempresa que podem ter sido criadas sem coluna.
do $$
declare
  t text;
begin
  foreach t in array array[
    'produtos','produto_estoque','movimentacoes_produto_estoque','historico_precos',
    'vendas','venda_itens','venda_pagamentos','venda_status_historico',
    'clientes','fornecedores','despesas','financeiro','lancamentos_financeiros',
    'cardapios','cardapio_itens','catalogos_publicos','promocoes',
    'etiquetas_lotes','etiquetas_itens','codigos_barras_produtos',
    'importacoes_estoque','importacoes_etiquetas','importacoes_dados',
    'suporte_chamados','integracoes','integracoes_logs','webhooks_config','webhooks_eventos',
    'logs_auditoria','logs_erro','equipe_usuarios','equipe_convites','configuracoes',
    'agendamentos','ordens_servico','eventos','compras','compra_itens','notas_fiscais','documentos_gerados'
  ] loop
    if to_regclass('public.' || t) is not null then
      execute format('alter table public.%I add column if not exists empresa_id uuid references public.empresas(id) on delete cascade', t);
      execute format('create index if not exists idx_%I_empresa_v143 on public.%I(empresa_id)', t, t);
    end if;
  end loop;
end $$;

-- Backfill mínimo de filhos principais.
do $$ begin
  if to_regclass('public.venda_itens') is not null then
    update public.venda_itens vi set empresa_id = v.empresa_id from public.vendas v where vi.venda_id = v.id and vi.empresa_id is null;
  end if;
  if to_regclass('public.venda_pagamentos') is not null then
    update public.venda_pagamentos vp set empresa_id = v.empresa_id from public.vendas v where vp.venda_id = v.id and vp.empresa_id is null;
  end if;
  if to_regclass('public.cardapio_itens') is not null then
    update public.cardapio_itens ci set empresa_id = c.empresa_id from public.cardapios c where ci.cardapio_id = c.id and ci.empresa_id is null;
  end if;
  if to_regclass('public.etiquetas_itens') is not null then
    update public.etiquetas_itens ei set empresa_id = l.empresa_id from public.etiquetas_lotes l where ei.lote_id = l.id and ei.empresa_id is null;
  end if;
exception when others then null; end $$;

-- 5) RLS e policies tenant-safe em todas as tabelas com empresa_id.
do $$
declare
  t text;
begin
  foreach t in array array[
    'produtos','produto_estoque','movimentacoes_produto_estoque','historico_precos',
    'vendas','venda_itens','venda_pagamentos','venda_status_historico',
    'clientes','fornecedores','despesas','financeiro','lancamentos_financeiros',
    'cardapios','cardapio_itens','promocoes',
    'etiquetas_lotes','etiquetas_itens','codigos_barras_produtos',
    'importacoes_estoque','importacoes_etiquetas','importacoes_dados',
    'suporte_chamados','integracoes','integracoes_logs','webhooks_config','webhooks_eventos',
    'logs_auditoria','logs_erro','equipe_usuarios','equipe_convites','configuracoes',
    'agendamentos','ordens_servico','eventos','compras','compra_itens','notas_fiscais','documentos_gerados'
  ] loop
    if to_regclass('public.' || t) is not null then
      execute format('alter table public.%I enable row level security', t);
      execute format('drop policy if exists vf_tenant_select on public.%I', t);
      execute format('drop policy if exists vf_tenant_insert on public.%I', t);
      execute format('drop policy if exists vf_tenant_update on public.%I', t);
      execute format('drop policy if exists vf_tenant_delete on public.%I', t);
      execute format('create policy vf_tenant_select on public.%I for select using (public.can_access_empresa(empresa_id))', t);
      execute format('create policy vf_tenant_insert on public.%I for insert with check (public.can_access_empresa(empresa_id))', t);
      execute format('create policy vf_tenant_update on public.%I for update using (public.can_access_empresa(empresa_id)) with check (public.can_access_empresa(empresa_id))', t);
      execute format('create policy vf_tenant_delete on public.%I for delete using (public.can_access_empresa(empresa_id))', t);
    end if;
  end loop;
end $$;

-- 6) Policies específicas para empresas, perfis e vínculos.
alter table public.empresas enable row level security;
drop policy if exists vf_empresas_select_v143 on public.empresas;
drop policy if exists vf_empresas_update_v143 on public.empresas;
drop policy if exists vf_empresas_insert_master_v143 on public.empresas;
create policy vf_empresas_select_v143 on public.empresas for select using (public.is_super_admin() or id = public.current_empresa_id());
create policy vf_empresas_update_v143 on public.empresas for update using (public.is_super_admin() or id = public.current_empresa_id()) with check (public.is_super_admin() or id = public.current_empresa_id());
create policy vf_empresas_insert_master_v143 on public.empresas for insert with check (public.is_super_admin());

alter table public.perfis enable row level security;
drop policy if exists vf_perfis_select_v143 on public.perfis;
drop policy if exists vf_perfis_insert_v143 on public.perfis;
drop policy if exists vf_perfis_update_v143 on public.perfis;
drop policy if exists vf_perfis_delete_v143 on public.perfis;
create policy vf_perfis_select_v143 on public.perfis for select using (id = auth.uid() or public.is_super_admin() or empresa_id = public.current_empresa_id());
create policy vf_perfis_insert_v143 on public.perfis for insert with check (public.is_super_admin() or (public.is_empresa_admin() and empresa_id = public.current_empresa_id()));
create policy vf_perfis_update_v143 on public.perfis for update using (id = auth.uid() or public.is_super_admin() or (public.is_empresa_admin() and empresa_id = public.current_empresa_id())) with check (id = auth.uid() or public.is_super_admin() or (public.is_empresa_admin() and empresa_id = public.current_empresa_id()));
create policy vf_perfis_delete_v143 on public.perfis for delete using (public.is_super_admin() or (public.is_empresa_admin() and empresa_id = public.current_empresa_id()));

alter table public.usuarios_empresas enable row level security;
drop policy if exists vf_usuarios_empresas_select_v143 on public.usuarios_empresas;
drop policy if exists vf_usuarios_empresas_all_v143 on public.usuarios_empresas;
create policy vf_usuarios_empresas_select_v143 on public.usuarios_empresas for select using (public.is_super_admin() or empresa_id = public.current_empresa_id() or usuario_id = auth.uid());
create policy vf_usuarios_empresas_all_v143 on public.usuarios_empresas for all using (public.is_super_admin() or (public.is_empresa_admin() and empresa_id = public.current_empresa_id())) with check (public.is_super_admin() or (public.is_empresa_admin() and empresa_id = public.current_empresa_id()));

-- 7) Catálogo público: público apenas para itens publicados.
alter table public.catalogos_publicos enable row level security;
drop policy if exists vf_catalogos_publicos_select_v143 on public.catalogos_publicos;
drop policy if exists vf_catalogos_publicos_write_v143 on public.catalogos_publicos;
create policy vf_catalogos_publicos_select_v143 on public.catalogos_publicos for select using (ativo = true or public.can_access_empresa(empresa_id));
create policy vf_catalogos_publicos_write_v143 on public.catalogos_publicos for all using (public.can_access_empresa(empresa_id)) with check (public.can_access_empresa(empresa_id));

-- 8) Função segura para scanner/PDV por código, restrita à empresa atual.
create or replace function public.vf_buscar_produto_por_codigo_v143(p_codigo text)
returns table(produto jsonb)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_empresa uuid := public.current_empresa_id();
  v_codigo text := trim(coalesce(p_codigo,''));
  v_produto_id uuid;
begin
  if v_empresa is null or v_codigo = '' then
    return;
  end if;

  select p.id into v_produto_id
  from public.produtos p
  where p.empresa_id = v_empresa
    and coalesce(p.ativo,true) = true
    and (p.codigo_barras = v_codigo or p.sku = v_codigo or p.codigo_interno = v_codigo)
  limit 1;

  if v_produto_id is null then
    select p.id into v_produto_id
    from public.codigos_barras_produtos cb
    join public.produtos p on p.id = cb.produto_id and p.empresa_id = cb.empresa_id
    where cb.empresa_id = v_empresa and cb.codigo = v_codigo and coalesce(p.ativo,true) = true
    limit 1;
  end if;

  if v_produto_id is not null then
    return query
    select to_jsonb(p)
    from public.produtos p
    where p.empresa_id = v_empresa and p.id = v_produto_id;
  end if;
end;
$$;

-- 9) Auditoria padronizada para acesso master e login.
create table if not exists public.logs_auditoria (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid references public.empresas(id) on delete cascade,
  usuario_id uuid,
  acao text not null,
  entidade text,
  entidade_id uuid,
  detalhes jsonb not null default '{}'::jsonb,
  ip text,
  user_agent text,
  created_at timestamptz not null default now()
);
alter table public.logs_auditoria enable row level security;
drop policy if exists vf_logs_auditoria_select_v143 on public.logs_auditoria;
drop policy if exists vf_logs_auditoria_insert_v143 on public.logs_auditoria;
create policy vf_logs_auditoria_select_v143 on public.logs_auditoria for select using (public.can_access_empresa(empresa_id));
create policy vf_logs_auditoria_insert_v143 on public.logs_auditoria for insert with check (public.can_access_empresa(empresa_id));

-- 10) Views/índices auxiliares
create index if not exists idx_perfis_empresa_cargo_v143 on public.perfis(empresa_id, cargo);
create index if not exists idx_usuarios_empresas_empresa_v143 on public.usuarios_empresas(empresa_id, papel);
create index if not exists idx_produtos_empresa_codigo_v143 on public.produtos(empresa_id, codigo_barras);
create index if not exists idx_produtos_empresa_sku_v143 on public.produtos(empresa_id, sku);
create index if not exists idx_codigos_barras_empresa_codigo_v143 on public.codigos_barras_produtos(empresa_id, codigo);

comment on function public.current_empresa_id() is 'VF Nexus V14.3: empresa atual do usuário autenticado para isolamento multiempresa.';
comment on function public.can_access_empresa(uuid) is 'VF Nexus V14.3: bloqueia qualquer acesso fora da empresa do usuário, exceto super admin auditado.';
