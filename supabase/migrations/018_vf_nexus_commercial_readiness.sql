-- ============================================================
-- 018 — VF Nexus Commercial Readiness Hardening
-- Objetivo: fechar lacunas reais para piloto comercial:
-- - garantir master_admins.user_id e is_master_admin desde banco novo;
-- - remover policies permissivas antigas em tabelas críticas e recriar RLS por ação;
-- - criar tabelas ausentes usadas pelo app (comprovantes_historico, notificacoes_central);
-- - estruturar convites de equipe e sessões de impersonar com auditoria;
-- - documentar validação de readiness.
-- ============================================================

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- 1) Master admin consistente para migrations antigas e novas.
alter table public.master_admins add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.master_admins add column if not exists updated_at timestamptz not null default now();
create unique index if not exists ux_master_admins_user_id on public.master_admins(user_id) where user_id is not null;
create index if not exists idx_master_admins_email_ativo on public.master_admins(email, ativo);

create or replace function public.is_master_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.master_admins m
    where m.ativo = true
      and (m.user_id = auth.uid() or m.email = auth.jwt()->>'email')
  );
$$;
grant execute on function public.is_master_admin() to authenticated;

-- 2) Permissão centralizada por ação: cargo + permissões explícitas + master.
create or replace function public.vf_can(p_modulo text, p_acao text, p_empresa_id uuid default public.get_empresa_id())
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_cargo text;
  v_permissoes text[];
begin
  if public.is_master_admin() then return true; end if;
  if p_empresa_id is null then return false; end if;

  select lower(coalesce(cargo, '')), permissoes
    into v_cargo, v_permissoes
  from public.perfis
  where id = auth.uid() and empresa_id = p_empresa_id and coalesce(bloqueado,false) = false;

  if not found then return false; end if;
  if v_cargo in ('dono','administrador') then return true; end if;
  if v_permissoes is not null and ('*' = any(v_permissoes) or (p_modulo || ':' || p_acao) = any(v_permissoes)) then return true; end if;

  return exists (
    select 1
    from public.permissoes_equipe pe
    where pe.empresa_id = p_empresa_id
      and pe.modulo = p_modulo
      and pe.acao = p_acao
      and pe.permitido = true
      and (lower(coalesce(pe.cargo,'')) = v_cargo or pe.cargo is null)
  ) or case v_cargo
    when 'gerente' then p_acao in ('ver','criar','editar','cancelar','estornar','aprovar','exportar')
    when 'financeiro' then p_modulo in ('dashboard','financeiro','relatorios','despesas','vendas','comprovantes','fechamento','notas-fiscais') and p_acao in ('ver','criar','editar','estornar','aprovar','exportar')
    when 'vendedor' then p_modulo in ('dashboard','vendas','clientes','produtos','comprovantes','cardapio','promocoes') and p_acao in ('ver','criar','editar')
    when 'atendente' then p_modulo in ('dashboard','vendas','clientes','agendamentos','comprovantes','produtos','cardapio') and p_acao in ('ver','criar','editar')
    when 'operacional' then p_modulo in ('dashboard','estoque','produtos','notas-fiscais','fornecedores','ordens-servico','insumos','fichas') and p_acao in ('ver','criar','editar')
    when 'contador' then p_modulo in ('dashboard','financeiro','relatorios','despesas','vendas','notas-fiscais','comprovantes','fechamento') and p_acao in ('ver','exportar')
    else false
  end;
end;
$$;
grant execute on function public.vf_can(text,text,uuid) to authenticated;

-- 3) Comprovantes reais: o service já usava esta tabela, mas ela podia não existir.
create table if not exists public.comprovantes_historico (
  id uuid primary key default uuid_generate_v4(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  venda_id uuid references public.vendas(id) on delete set null,
  agendamento_id uuid references public.agendamentos(id) on delete set null,
  ordem_servico_id uuid references public.ordens_servico(id) on delete set null,
  tipo text not null,
  descricao text,
  forma_pagamento text,
  mensagem text,
  pdf_url text,
  cliente_nome text,
  cliente_whatsapp text,
  total numeric(14,2) not null default 0,
  payload jsonb not null default '{}'::jsonb,
  enviado_whatsapp boolean not null default false,
  documento_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_comprovantes_historico_empresa on public.comprovantes_historico(empresa_id, created_at desc);
alter table public.comprovantes_historico enable row level security;

-- 4) Central de notificações real e consultável.
create table if not exists public.notificacoes_central (
  id uuid primary key default uuid_generate_v4(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  usuario_id uuid references auth.users(id) on delete set null,
  tipo text not null,
  titulo text not null,
  mensagem text not null,
  prioridade text not null default 'media' check (prioridade in ('baixa','media','alta','critica')),
  entidade text,
  entidade_id uuid,
  lida boolean not null default false,
  lida_em timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_notificacoes_central_empresa_lida on public.notificacoes_central(empresa_id, lida, created_at desc);
alter table public.notificacoes_central enable row level security;

-- 5) Convites de equipe e permissões customizadas.
create table if not exists public.equipe_convites (
  id uuid primary key default uuid_generate_v4(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  email text not null,
  nome text,
  cargo text not null default 'atendente',
  permissoes text[] default '{}',
  token text not null unique default encode(gen_random_bytes(24), 'hex'),
  status text not null default 'pendente' check (status in ('pendente','aceito','cancelado','expirado')),
  convidado_por uuid references auth.users(id) on delete set null,
  expira_em timestamptz not null default (now() + interval '7 days'),
  aceito_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_equipe_convites_empresa on public.equipe_convites(empresa_id, status, created_at desc);
alter table public.equipe_convites enable row level security;

-- 6) Sessões de suporte/impersonar: sem integração falsa, mas com base real e auditável.
create table if not exists public.impersonar_sessoes (
  id uuid primary key default uuid_generate_v4(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  master_user_id uuid references auth.users(id) on delete set null,
  motivo text not null,
  status text not null default 'ativa' check (status in ('ativa','encerrada','expirada')),
  iniciado_em timestamptz not null default now(),
  encerrado_em timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_impersonar_sessoes_empresa_status on public.impersonar_sessoes(empresa_id, status, iniciado_em desc);
alter table public.impersonar_sessoes enable row level security;

-- 7) Drop de policies permissivas antigas nas tabelas com empresa_id e recriação RBAC estrita.
do $$
declare
  rec record;
  pol record;
  has_empresa boolean;
begin
  for rec in select * from (values
    ('produtos','produtos'),('clientes','clientes'),('fornecedores','fornecedores'),('insumos','insumos'),
    ('vendas','vendas'),('venda_itens','vendas'),('venda_pagamentos','vendas'),('venda_status_historico','vendas'),
    ('lancamentos_financeiros','financeiro'),('contas_pagar','financeiro'),('contas_receber','financeiro'),('despesas','despesas'),('fechamentos_diarios','fechamento'),
    ('produto_estoque','estoque'),('movimentacoes_produto_estoque','estoque'),('movimentacoes_estoque','estoque'),('inventarios_estoque','estoque'),('inventario_itens','estoque'),
    ('compras','notas-fiscais'),('compra_itens','notas-fiscais'),('notas_fiscais','notas-fiscais'),('nota_fiscal_itens','notas-fiscais'),
    ('ordens_servico','ordens-servico'),('agendamentos','agendamentos'),('eventos','eventos'),('evento_itens','eventos'),
    ('cardapios','cardapio'),('cardapio_itens','cardapio'),('promocoes','promocoes'),('documentos_gerados','relatorios'),
    ('equipe_usuarios','equipe'),('permissoes_equipe','equipe'),('equipe_convites','equipe'),('logs_auditoria','auditoria'),
    ('comprovantes_historico','comprovantes'),('notificacoes_central','configuracoes'),('notificacoes_agendadas','agendamentos'),('push_subscriptions','configuracoes'),
    ('assinaturas','configuracoes'),('assinaturas_saas','master-admin'),('plano_limites_empresa','master-admin'),('deploy_validacoes','auditoria')
  ) as x(tabela, modulo)
  loop
    if to_regclass(format('public.%I', rec.tabela)) is null then continue; end if;

    select exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name=rec.tabela and column_name='empresa_id'
    ) into has_empresa;
    if not has_empresa then continue; end if;

    for pol in select policyname from pg_policies where schemaname='public' and tablename=rec.tabela loop
      execute format('drop policy if exists %I on public.%I', pol.policyname, rec.tabela);
    end loop;

    execute format('alter table public.%I enable row level security', rec.tabela);
    execute format('create policy %I on public.%I for select using (public.is_master_admin() or (empresa_id = public.get_empresa_id() and public.vf_can(%L, ''ver'', empresa_id)))', 'vf_'||rec.tabela||'_select', rec.tabela, rec.modulo);
    execute format('create policy %I on public.%I for insert with check (public.is_master_admin() or (empresa_id = public.get_empresa_id() and public.vf_can(%L, ''criar'', empresa_id)))', 'vf_'||rec.tabela||'_insert', rec.tabela, rec.modulo);
    execute format('create policy %I on public.%I for update using (public.is_master_admin() or (empresa_id = public.get_empresa_id() and public.vf_can(%L, ''editar'', empresa_id))) with check (public.is_master_admin() or (empresa_id = public.get_empresa_id() and public.vf_can(%L, ''editar'', empresa_id)))', 'vf_'||rec.tabela||'_update', rec.tabela, rec.modulo, rec.modulo);
    execute format('create policy %I on public.%I for delete using (public.is_master_admin() or (empresa_id = public.get_empresa_id() and public.vf_can(%L, ''excluir'', empresa_id)))', 'vf_'||rec.tabela||'_delete', rec.tabela, rec.modulo);
  end loop;
end $$;

-- 8) Policies especiais para perfis/empresas/master/impersonar.
alter table public.perfis enable row level security;
do $$ declare pol record; begin
  for pol in select policyname from pg_policies where schemaname='public' and tablename='perfis' loop
    execute format('drop policy if exists %I on public.perfis', pol.policyname);
  end loop;
end $$;
create policy vf_perfis_select on public.perfis for select using (id = auth.uid() or public.is_master_admin() or empresa_id = public.get_empresa_id());
create policy vf_perfis_update_self on public.perfis for update using (id = auth.uid() or public.vf_can('equipe','editar',empresa_id) or public.is_master_admin()) with check (id = auth.uid() or public.vf_can('equipe','editar',empresa_id) or public.is_master_admin());
create policy vf_perfis_insert_admin on public.perfis for insert with check (public.is_master_admin() or public.vf_can('equipe','criar',empresa_id));

alter table public.empresas enable row level security;
do $$ declare pol record; begin
  for pol in select policyname from pg_policies where schemaname='public' and tablename='empresas' loop
    execute format('drop policy if exists %I on public.empresas', pol.policyname);
  end loop;
end $$;
create policy vf_empresas_select on public.empresas for select using (id = public.get_empresa_id() or public.is_master_admin());
create policy vf_empresas_update on public.empresas for update using (id = public.get_empresa_id() and public.vf_can('configuracoes','editar',id) or public.is_master_admin()) with check (id = public.get_empresa_id() and public.vf_can('configuracoes','editar',id) or public.is_master_admin());
create policy vf_empresas_insert_master on public.empresas for insert with check (public.is_master_admin());

alter table public.master_admins enable row level security;
do $$ declare pol record; begin
  for pol in select policyname from pg_policies where schemaname='public' and tablename='master_admins' loop
    execute format('drop policy if exists %I on public.master_admins', pol.policyname);
  end loop;
end $$;
create policy vf_master_admins_select_self on public.master_admins for select using (user_id = auth.uid() or email = auth.jwt()->>'email' or public.is_master_admin());
create policy vf_master_admins_manage on public.master_admins for all using (public.is_master_admin()) with check (public.is_master_admin());

alter table public.impersonar_sessoes enable row level security;
do $$ declare pol record; begin
  for pol in select policyname from pg_policies where schemaname='public' and tablename='impersonar_sessoes' loop
    execute format('drop policy if exists %I on public.impersonar_sessoes', pol.policyname);
  end loop;
end $$;
create policy vf_impersonar_select_master on public.impersonar_sessoes for select using (public.is_master_admin());
create policy vf_impersonar_insert_master on public.impersonar_sessoes for insert with check (public.is_master_admin());
create policy vf_impersonar_update_master on public.impersonar_sessoes for update using (public.is_master_admin()) with check (public.is_master_admin());

-- 9) Função segura para iniciar suporte/impersonar sem falsificar sessão real.
create or replace function public.vf_iniciar_impersonar(p_empresa_id uuid, p_motivo text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if not public.is_master_admin() then raise exception 'Somente master admin pode iniciar suporte/impersonar.'; end if;
  if p_motivo is null or length(trim(p_motivo)) < 8 then raise exception 'Motivo obrigatório com pelo menos 8 caracteres.'; end if;

  insert into public.impersonar_sessoes (empresa_id, master_user_id, motivo)
  values (p_empresa_id, auth.uid(), trim(p_motivo)) returning id into v_id;

  perform public.vf_auditar(p_empresa_id, 'master.impersonar.iniciar', 'impersonar_sessoes', v_id, jsonb_build_object('motivo', trim(p_motivo)));
  return v_id;
end;
$$;
grant execute on function public.vf_iniciar_impersonar(uuid,text) to authenticated;

create or replace function public.vf_encerrar_impersonar(p_sessao_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_empresa uuid;
begin
  if not public.is_master_admin() then raise exception 'Somente master admin pode encerrar suporte/impersonar.'; end if;
  update public.impersonar_sessoes
  set status = 'encerrada', encerrado_em = now()
  where id = p_sessao_id and status = 'ativa'
  returning empresa_id into v_empresa;
  if v_empresa is not null then
    perform public.vf_auditar(v_empresa, 'master.impersonar.encerrar', 'impersonar_sessoes', p_sessao_id, '{}'::jsonb);
  end if;
end;
$$;
grant execute on function public.vf_encerrar_impersonar(uuid) to authenticated;

-- 10) Registro de readiness da versão 018.
insert into public.deploy_validacoes (versao, checklist, aprovado, responsavel)
select '018', jsonb_build_object(
  'master_admin_user_id', true,
  'rls_policies_antigas_removidas', true,
  'comprovantes_historico', true,
  'notificacoes_central', true,
  'equipe_convites', true,
  'impersonar_sessoes', true,
  'rbac_por_acao_banco', true
), true, auth.uid()
where to_regclass('public.deploy_validacoes') is not null
on conflict do nothing;
