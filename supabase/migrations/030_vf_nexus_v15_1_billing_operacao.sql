-- ============================================================
-- VF Nexus V15.1 — Billing Stripe, diagnóstico, permissões,
-- fechamento de caixa, onboarding e segurança operacional.
-- ============================================================

create extension if not exists pgcrypto;

-- Empresas: reforço para billing, onboarding e bloqueio operacional.
create table if not exists public.empresas (
  id uuid primary key default gen_random_uuid(),
  nome text,
  nome_fantasia text,
  razao_social text,
  codigo_empresa text,
  matricula_empresa text,
  cnpj text,
  telefone text,
  email text,
  status text default 'ativa',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.empresas add column if not exists codigo_empresa text;
alter table public.empresas add column if not exists matricula_empresa text;
alter table public.empresas add column if not exists nome_fantasia text;
alter table public.empresas add column if not exists razao_social text;
alter table public.empresas add column if not exists billing_status text default 'trial_manual';
alter table public.empresas add column if not exists billing_bloqueada boolean default false;
alter table public.empresas add column if not exists trial_indeterminado boolean default true;
alter table public.empresas add column if not exists trial_desativado_em timestamptz;
alter table public.empresas add column if not exists cobranca_abolida boolean default false;
alter table public.empresas add column if not exists cobranca_abolida_em timestamptz;
alter table public.empresas add column if not exists onboarding_v15_concluido boolean default false;
alter table public.empresas add column if not exists onboarding_v15_respostas jsonb default '{}'::jsonb;
alter table public.empresas add column if not exists plano_atual text default 'teste';
alter table public.empresas add column if not exists stripe_customer_id text;
alter table public.empresas add column if not exists bloqueio_motivo text;

create unique index if not exists empresas_codigo_empresa_unique_idx on public.empresas (codigo_empresa) where codigo_empresa is not null;
create unique index if not exists empresas_matricula_empresa_unique_idx on public.empresas (matricula_empresa) where matricula_empresa is not null;
create index if not exists empresas_billing_status_idx on public.empresas (billing_status);

-- Perfis: garante empresa e papel.
create table if not exists public.perfis (
  id uuid primary key,
  empresa_id uuid references public.empresas(id) on delete set null,
  nome text,
  email text,
  cargo text default 'funcionario',
  is_master boolean default false,
  permissoes jsonb default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.perfis add column if not exists empresa_id uuid references public.empresas(id) on delete set null;
alter table public.perfis add column if not exists cargo text default 'funcionario';
alter table public.perfis add column if not exists is_master boolean default false;
alter table public.perfis add column if not exists permissoes jsonb default '[]'::jsonb;
create index if not exists perfis_empresa_id_idx on public.perfis (empresa_id);
create index if not exists perfis_cargo_idx on public.perfis (cargo);

-- Planos configuráveis SaaS.
create table if not exists public.planos_saas (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  nome text not null,
  descricao text,
  preco_mensal numeric(12,2) default 0,
  preco_anual numeric(12,2),
  moeda text default 'BRL',
  stripe_price_id text,
  stripe_product_id text,
  modulos text[] default array[]::text[],
  limites jsonb default '{}'::jsonb,
  recursos jsonb default '{}'::jsonb,
  ativo boolean default true,
  ordem int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

insert into public.planos_saas (codigo, nome, descricao, preco_mensal, modulos, limites, recursos, ordem)
values
  ('teste', 'Teste sem prazo', 'Acesso de teste liberado pelo Admin Master até ser desativado manualmente.', 0, array['dashboard','pdv','estoque','entregas','etiquetas','relatorios'], '{"usuarios":5,"empresas":1}'::jsonb, '{"trial_manual":true}'::jsonb, 0),
  ('starter', 'Starter', 'Plano inicial para pequenos negócios.', 79, array['dashboard','pdv','produtos','estoque','clientes','relatorios'], '{"usuarios":3,"produtos":500}'::jsonb, '{}'::jsonb, 1),
  ('profissional', 'Profissional', 'Plano completo para empresas em operação.', 149, array['dashboard','pdv','produtos','estoque','clientes','financeiro','entregas','etiquetas','importacao','relatorios'], '{"usuarios":10,"produtos":5000}'::jsonb, '{}'::jsonb, 2),
  ('premium', 'Premium', 'Plano avançado com operação completa, entregas e relatórios.', 249, array['*'], '{"usuarios":50,"produtos":50000}'::jsonb, '{"priority_support":true}'::jsonb, 3)
on conflict (codigo) do update set
  nome = excluded.nome,
  descricao = excluded.descricao,
  modulos = excluded.modulos,
  limites = excluded.limites,
  recursos = excluded.recursos,
  ordem = excluded.ordem,
  updated_at = now();

-- Assinaturas SaaS com teste manual e isenção permanente.
create table if not exists public.assinaturas_saas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  plano_id uuid references public.planos_saas(id) on delete set null,
  plano_codigo text default 'teste',
  modo_acesso text default 'trial_manual',
  status text default 'trial_manual',
  trial_indeterminado boolean default true,
  trial_ativo boolean default true,
  trial_desativado_em timestamptz,
  cobranca_abolida boolean default false,
  cobranca_abolida_em timestamptz,
  bloqueada boolean default false,
  bloqueio_motivo text,
  stripe_customer_id text,
  stripe_subscription_id text,
  stripe_price_id text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean default false,
  valor_mensal numeric(12,2) default 0,
  moeda text default 'BRL',
  metadata jsonb default '{}'::jsonb,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (empresa_id)
);
create index if not exists assinaturas_saas_empresa_idx on public.assinaturas_saas (empresa_id);
create index if not exists assinaturas_saas_status_idx on public.assinaturas_saas (status);
create index if not exists assinaturas_saas_stripe_subscription_idx on public.assinaturas_saas (stripe_subscription_id);
create index if not exists assinaturas_saas_stripe_customer_idx on public.assinaturas_saas (stripe_customer_id);

-- Registros de pagamento/Stripe.
create table if not exists public.pagamentos_saas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid references public.empresas(id) on delete cascade,
  assinatura_id uuid references public.assinaturas_saas(id) on delete set null,
  provider text default 'stripe',
  provider_payment_id text,
  provider_invoice_id text,
  amount numeric(12,2) default 0,
  currency text default 'BRL',
  status text default 'pending',
  paid_at timestamptz,
  payload jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);
create index if not exists pagamentos_saas_empresa_idx on public.pagamentos_saas (empresa_id, created_at desc);

create table if not exists public.stripe_webhook_events (
  id uuid primary key default gen_random_uuid(),
  stripe_event_id text unique,
  type text,
  empresa_id uuid references public.empresas(id) on delete set null,
  status text default 'received',
  payload jsonb default '{}'::jsonb,
  error_message text,
  processed_at timestamptz,
  created_at timestamptz default now()
);
create index if not exists stripe_webhook_events_empresa_idx on public.stripe_webhook_events (empresa_id, created_at desc);

-- Auditoria visível.
create table if not exists public.logs_auditoria (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid references public.empresas(id) on delete set null,
  usuario_id uuid,
  acao text not null,
  entidade text,
  entidade_id text,
  detalhes jsonb default '{}'::jsonb,
  ip text,
  user_agent text,
  created_at timestamptz default now()
);
create index if not exists logs_auditoria_empresa_idx on public.logs_auditoria (empresa_id, created_at desc);
create index if not exists logs_auditoria_acao_idx on public.logs_auditoria (acao);

-- Matriz visual de permissões por empresa e cargo.
create table if not exists public.permissoes_empresa (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  cargo text not null,
  modulo text not null,
  acao text not null,
  permitido boolean default false,
  updated_by uuid,
  updated_at timestamptz default now(),
  unique (empresa_id, cargo, modulo, acao)
);
create index if not exists permissoes_empresa_lookup_idx on public.permissoes_empresa (empresa_id, cargo, modulo);

-- Caixa operacional.
create table if not exists public.caixas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  aberto_por uuid,
  fechado_por uuid,
  status text default 'aberto',
  data_caixa date default current_date,
  saldo_inicial numeric(12,2) default 0,
  dinheiro_informado numeric(12,2),
  dinheiro_esperado numeric(12,2) default 0,
  pix_esperado numeric(12,2) default 0,
  credito_esperado numeric(12,2) default 0,
  debito_esperado numeric(12,2) default 0,
  outros_esperado numeric(12,2) default 0,
  diferenca numeric(12,2) default 0,
  observacoes text,
  opened_at timestamptz default now(),
  closed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create unique index if not exists caixas_aberto_unico_idx on public.caixas (empresa_id) where status = 'aberto';
create index if not exists caixas_empresa_data_idx on public.caixas (empresa_id, data_caixa desc);

create table if not exists public.caixa_movimentos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  caixa_id uuid references public.caixas(id) on delete cascade,
  tipo text not null,
  descricao text,
  forma_pagamento text default 'dinheiro',
  valor numeric(12,2) not null default 0,
  origem text default 'manual',
  origem_id uuid,
  usuario_id uuid,
  created_at timestamptz default now()
);
create index if not exists caixa_movimentos_caixa_idx on public.caixa_movimentos (empresa_id, caixa_id, created_at desc);

-- Onboarding empresarial ampliado.
create table if not exists public.empresa_onboarding (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade unique,
  dados_empresa boolean default false,
  branding boolean default false,
  equipe boolean default false,
  entregadores boolean default false,
  produtos boolean default false,
  pdv boolean default false,
  caixa boolean default false,
  assinatura boolean default false,
  concluido boolean default false,
  respostas jsonb default '{}'::jsonb,
  updated_by uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Diagnóstico técnico.
create table if not exists public.diagnostico_checks (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid references public.empresas(id) on delete cascade,
  check_key text not null,
  status text not null,
  detalhes jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);
create index if not exists diagnostico_checks_empresa_idx on public.diagnostico_checks (empresa_id, created_at desc);

-- Funções de segurança.
create or replace function public.vf_v15_1_current_profile_id()
returns uuid language sql stable as $$ select auth.uid(); $$;

create or replace function public.vf_v15_1_current_empresa_id()
returns uuid language sql stable as $$
  select p.empresa_id from public.perfis p where p.id = auth.uid() limit 1;
$$;

create or replace function public.vf_v15_1_is_super_admin()
returns boolean language sql stable as $$
  select coalesce((select p.is_master or lower(coalesce(p.cargo,'')) in ('master_admin','super_admin') from public.perfis p where p.id = auth.uid() limit 1), false);
$$;

create or replace function public.vf_v15_1_user_role()
returns text language sql stable as $$
  select case
    when public.vf_v15_1_is_super_admin() then 'super_admin'
    else coalesce((select lower(p.cargo) from public.perfis p where p.id = auth.uid() limit 1), 'funcionario')
  end;
$$;

create or replace function public.vf_v15_1_can_access_empresa(p_empresa_id uuid)
returns boolean language sql stable as $$
  select public.vf_v15_1_is_super_admin() or (p_empresa_id is not null and p_empresa_id = public.vf_v15_1_current_empresa_id());
$$;

create or replace function public.vf_v15_1_registrar_auditoria(
  p_empresa_id uuid,
  p_acao text,
  p_entidade text default null,
  p_entidade_id text default null,
  p_detalhes jsonb default '{}'::jsonb
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  insert into public.logs_auditoria (empresa_id, usuario_id, acao, entidade, entidade_id, detalhes)
  values (p_empresa_id, auth.uid(), p_acao, p_entidade, p_entidade_id, coalesce(p_detalhes, '{}'::jsonb))
  returning id into v_id;
  return v_id;
end; $$;

create or replace function public.vf_billing_status_empresa(p_empresa_id uuid default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_empresa_id uuid := coalesce(p_empresa_id, public.vf_v15_1_current_empresa_id());
  v_empresa record;
  v_ass record;
  v_block boolean := false;
  v_reason text := null;
begin
  if v_empresa_id is null then
    return jsonb_build_object('ok', false, 'blocked', true, 'reason', 'Usuário sem empresa vinculada.', 'status', 'sem_empresa');
  end if;

  if not public.vf_v15_1_can_access_empresa(v_empresa_id) then
    return jsonb_build_object('ok', false, 'blocked', true, 'reason', 'Acesso a empresa negado.', 'status', 'forbidden');
  end if;

  select * into v_empresa from public.empresas where id = v_empresa_id;
  select * into v_ass from public.assinaturas_saas where empresa_id = v_empresa_id;

  if v_empresa.cobranca_abolida or coalesce(v_ass.cobranca_abolida, false) then
    return jsonb_build_object('ok', true, 'blocked', false, 'status', 'isento_permanente', 'modo_acesso', 'isento_permanente', 'empresa_id', v_empresa_id, 'reason', 'Cobranças abolidas permanentemente pelo Admin Master.');
  end if;

  if coalesce(v_empresa.trial_indeterminado, false) or coalesce(v_ass.trial_indeterminado, false) or coalesce(v_ass.trial_ativo, false) then
    return jsonb_build_object('ok', true, 'blocked', false, 'status', 'trial_manual', 'modo_acesso', 'trial_manual', 'empresa_id', v_empresa_id, 'reason', 'Teste liberado pelo Admin Master até desativação manual.');
  end if;

  if v_ass.id is null then
    v_block := true;
    v_reason := 'Empresa sem assinatura ativa.';
  elsif lower(coalesce(v_ass.status,'')) in ('active','trialing','paid','isento_permanente','trial_manual') then
    v_block := false;
  elsif lower(coalesce(v_ass.status,'')) in ('past_due') then
    v_block := false;
    v_reason := 'Pagamento em atraso. A empresa está em período de tolerância.';
  else
    v_block := true;
    v_reason := coalesce(v_ass.bloqueio_motivo, 'Assinatura inativa ou inadimplente.');
  end if;

  return jsonb_build_object(
    'ok', true,
    'blocked', v_block,
    'status', coalesce(v_ass.status, v_empresa.billing_status, 'sem_assinatura'),
    'modo_acesso', coalesce(v_ass.modo_acesso, 'manual'),
    'empresa_id', v_empresa_id,
    'reason', v_reason,
    'current_period_end', v_ass.current_period_end,
    'trial_indeterminado', coalesce(v_empresa.trial_indeterminado, false) or coalesce(v_ass.trial_indeterminado, false),
    'cobranca_abolida', coalesce(v_empresa.cobranca_abolida, false) or coalesce(v_ass.cobranca_abolida, false)
  );
end; $$;

create or replace function public.vf_master_set_assinatura_trial(p_empresa_id uuid, p_ativo boolean, p_observacao text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_plano uuid; v_ass uuid;
begin
  if not public.vf_v15_1_is_super_admin() then
    raise exception 'Apenas o Admin Master Global pode ativar ou desativar o teste manual.';
  end if;
  select id into v_plano from public.planos_saas where codigo = 'teste' limit 1;
  insert into public.assinaturas_saas (empresa_id, plano_id, plano_codigo, modo_acesso, status, trial_indeterminado, trial_ativo, bloqueada, metadata, updated_by)
  values (p_empresa_id, v_plano, 'teste', 'trial_manual', case when p_ativo then 'trial_manual' else 'trial_desativado' end, p_ativo, p_ativo, not p_ativo, jsonb_build_object('observacao', p_observacao), auth.uid())
  on conflict (empresa_id) do update set
    plano_id = coalesce(v_plano, public.assinaturas_saas.plano_id),
    plano_codigo = case when p_ativo then 'teste' else public.assinaturas_saas.plano_codigo end,
    modo_acesso = case when p_ativo then 'trial_manual' else public.assinaturas_saas.modo_acesso end,
    status = case when p_ativo then 'trial_manual' else 'trial_desativado' end,
    trial_indeterminado = p_ativo,
    trial_ativo = p_ativo,
    trial_desativado_em = case when p_ativo then null else now() end,
    bloqueada = not p_ativo and not public.assinaturas_saas.cobranca_abolida,
    bloqueio_motivo = case when p_ativo then null else 'Teste desativado pelo Admin Master Global.' end,
    metadata = coalesce(public.assinaturas_saas.metadata, '{}'::jsonb) || jsonb_build_object('observacao_trial', p_observacao, 'trial_atualizado_em', now()),
    updated_by = auth.uid(),
    updated_at = now()
  returning id into v_ass;

  update public.empresas set trial_indeterminado = p_ativo, trial_desativado_em = case when p_ativo then null else now() end, billing_status = case when p_ativo then 'trial_manual' else 'trial_desativado' end, billing_bloqueada = not p_ativo, bloqueio_motivo = case when p_ativo then null else 'Teste desativado pelo Admin Master Global.' end, updated_at = now() where id = p_empresa_id;
  perform public.vf_v15_1_registrar_auditoria(p_empresa_id, case when p_ativo then 'billing.trial.ativar' else 'billing.trial.desativar' end, 'assinaturas_saas', v_ass::text, jsonb_build_object('observacao', p_observacao));
  return public.vf_billing_status_empresa(p_empresa_id);
end; $$;

create or replace function public.vf_master_set_cobranca_abolida(p_empresa_id uuid, p_ativo boolean, p_observacao text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_ass uuid;
begin
  if not public.vf_v15_1_is_super_admin() then
    raise exception 'Apenas o Admin Master Global pode abolir cobranças permanentemente.';
  end if;
  insert into public.assinaturas_saas (empresa_id, plano_codigo, modo_acesso, status, cobranca_abolida, cobranca_abolida_em, bloqueada, metadata, updated_by)
  values (p_empresa_id, 'isento', 'isento_permanente', 'isento_permanente', p_ativo, case when p_ativo then now() else null end, false, jsonb_build_object('observacao', p_observacao), auth.uid())
  on conflict (empresa_id) do update set
    modo_acesso = case when p_ativo then 'isento_permanente' else 'manual' end,
    status = case when p_ativo then 'isento_permanente' else 'sem_cobranca_ativa' end,
    cobranca_abolida = p_ativo,
    cobranca_abolida_em = case when p_ativo then now() else null end,
    bloqueada = false,
    bloqueio_motivo = null,
    metadata = coalesce(public.assinaturas_saas.metadata, '{}'::jsonb) || jsonb_build_object('observacao_isencao', p_observacao, 'isencao_atualizada_em', now()),
    updated_by = auth.uid(),
    updated_at = now()
  returning id into v_ass;

  update public.empresas set cobranca_abolida = p_ativo, cobranca_abolida_em = case when p_ativo then now() else null end, billing_status = case when p_ativo then 'isento_permanente' else 'manual' end, billing_bloqueada = false, bloqueio_motivo = null, updated_at = now() where id = p_empresa_id;
  perform public.vf_v15_1_registrar_auditoria(p_empresa_id, case when p_ativo then 'billing.cobranca_abolir' else 'billing.cobranca_restituir' end, 'assinaturas_saas', v_ass::text, jsonb_build_object('observacao', p_observacao));
  return public.vf_billing_status_empresa(p_empresa_id);
end; $$;

-- RLS.
alter table public.planos_saas enable row level security;
alter table public.assinaturas_saas enable row level security;
alter table public.pagamentos_saas enable row level security;
alter table public.stripe_webhook_events enable row level security;
alter table public.permissoes_empresa enable row level security;
alter table public.caixas enable row level security;
alter table public.caixa_movimentos enable row level security;
alter table public.empresa_onboarding enable row level security;
alter table public.diagnostico_checks enable row level security;
alter table public.logs_auditoria enable row level security;

drop policy if exists planos_saas_select_auth on public.planos_saas;
create policy planos_saas_select_auth on public.planos_saas for select to authenticated using (ativo = true or public.vf_v15_1_is_super_admin());
drop policy if exists planos_saas_master_all on public.planos_saas;
create policy planos_saas_master_all on public.planos_saas for all to authenticated using (public.vf_v15_1_is_super_admin()) with check (public.vf_v15_1_is_super_admin());

drop policy if exists assinaturas_saas_tenant_select on public.assinaturas_saas;
create policy assinaturas_saas_tenant_select on public.assinaturas_saas for select to authenticated using (public.vf_v15_1_can_access_empresa(empresa_id));
drop policy if exists assinaturas_saas_master_write on public.assinaturas_saas;
create policy assinaturas_saas_master_write on public.assinaturas_saas for all to authenticated using (public.vf_v15_1_is_super_admin()) with check (public.vf_v15_1_is_super_admin());

drop policy if exists pagamentos_saas_tenant_select on public.pagamentos_saas;
create policy pagamentos_saas_tenant_select on public.pagamentos_saas for select to authenticated using (public.vf_v15_1_can_access_empresa(empresa_id));
drop policy if exists pagamentos_saas_master_all on public.pagamentos_saas;
create policy pagamentos_saas_master_all on public.pagamentos_saas for all to authenticated using (public.vf_v15_1_is_super_admin()) with check (public.vf_v15_1_is_super_admin());

drop policy if exists permissoes_empresa_tenant on public.permissoes_empresa;
create policy permissoes_empresa_tenant on public.permissoes_empresa for select to authenticated using (public.vf_v15_1_can_access_empresa(empresa_id));
drop policy if exists permissoes_empresa_admin_write on public.permissoes_empresa;
create policy permissoes_empresa_admin_write on public.permissoes_empresa for all to authenticated using (public.vf_v15_1_can_access_empresa(empresa_id) and public.vf_v15_1_user_role() in ('super_admin','empresa_admin','administrador','dono')) with check (public.vf_v15_1_can_access_empresa(empresa_id));

drop policy if exists caixas_tenant_all on public.caixas;
create policy caixas_tenant_all on public.caixas for all to authenticated using (public.vf_v15_1_can_access_empresa(empresa_id)) with check (public.vf_v15_1_can_access_empresa(empresa_id));
drop policy if exists caixa_movimentos_tenant_all on public.caixa_movimentos;
create policy caixa_movimentos_tenant_all on public.caixa_movimentos for all to authenticated using (public.vf_v15_1_can_access_empresa(empresa_id)) with check (public.vf_v15_1_can_access_empresa(empresa_id));

drop policy if exists empresa_onboarding_tenant_all on public.empresa_onboarding;
create policy empresa_onboarding_tenant_all on public.empresa_onboarding for all to authenticated using (public.vf_v15_1_can_access_empresa(empresa_id)) with check (public.vf_v15_1_can_access_empresa(empresa_id));

drop policy if exists diagnostico_checks_tenant_all on public.diagnostico_checks;
create policy diagnostico_checks_tenant_all on public.diagnostico_checks for all to authenticated using (empresa_id is null or public.vf_v15_1_can_access_empresa(empresa_id)) with check (empresa_id is null or public.vf_v15_1_can_access_empresa(empresa_id));

drop policy if exists logs_auditoria_tenant_select on public.logs_auditoria;
create policy logs_auditoria_tenant_select on public.logs_auditoria for select to authenticated using (empresa_id is null or public.vf_v15_1_can_access_empresa(empresa_id));
drop policy if exists logs_auditoria_tenant_insert on public.logs_auditoria;
create policy logs_auditoria_tenant_insert on public.logs_auditoria for insert to authenticated with check (empresa_id is null or public.vf_v15_1_can_access_empresa(empresa_id));

-- Webhook events só master no client; service role ignora RLS.
drop policy if exists stripe_webhook_events_master_select on public.stripe_webhook_events;
create policy stripe_webhook_events_master_select on public.stripe_webhook_events for select to authenticated using (public.vf_v15_1_is_super_admin());
