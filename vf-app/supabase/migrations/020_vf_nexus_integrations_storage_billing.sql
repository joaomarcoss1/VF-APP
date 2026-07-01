-- ============================================================
-- 020 — VF Nexus Integrations, Storage and Billing Readiness
-- Objetivo: fechar pendências que dependiam de estrutura real, mas não de
-- credenciais externas: buckets/policies de Storage, configurações de
-- integrações, billing webhooks auditáveis, exportações rastreáveis e
-- validações de operação SaaS.
-- ============================================================

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- 1) Buckets reais de Storage. Não habilita integração falsa: apenas prepara
-- os buckets e policies para anexos/assinaturas/logos/PDFs quando o Supabase
-- Storage estiver disponível.
do $$
begin
  if to_regclass('storage.buckets') is not null then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values
      ('vf-comprovantes', 'vf-comprovantes', false, 10485760, array['application/pdf','image/png','image/jpeg','image/webp','text/csv']),
      ('vf-os-anexos', 'vf-os-anexos', false, 15728640, array['image/png','image/jpeg','image/webp','application/pdf']),
      ('vf-assinaturas', 'vf-assinaturas', false, 5242880, array['image/png','image/jpeg','image/webp','application/pdf']),
      ('vf-branding', 'vf-branding', true, 5242880, array['image/png','image/jpeg','image/webp','image/svg+xml']),
      ('vf-relatorios', 'vf-relatorios', false, 20971520, array['application/pdf','text/csv','application/json'])
    on conflict (id) do update set
      public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
  end if;
end $$;

-- Policies de Storage por convenção de caminho: primeiro segmento do path deve
-- ser o empresa_id. Exemplo: <empresa_id>/ordens-servico/<id>/foto.jpg
do $$
declare
  pol record;
begin
  if to_regclass('storage.objects') is null then
    return;
  end if;

  for pol in select policyname from pg_policies where schemaname='storage' and tablename='objects' and policyname like 'vf_storage_%' loop
    execute format('drop policy if exists %I on storage.objects', pol.policyname);
  end loop;

  execute $p$
    create policy vf_storage_select_empresa on storage.objects
    for select using (
      bucket_id in ('vf-comprovantes','vf-os-anexos','vf-assinaturas','vf-relatorios')
      and (public.is_master_admin() or (split_part(name, '/', 1) ~* '^[0-9a-f-]{36}$' and split_part(name, '/', 1)::uuid = public.get_empresa_id()))
    )
  $p$;

  execute $p$
    create policy vf_storage_insert_empresa on storage.objects
    for insert with check (
      bucket_id in ('vf-comprovantes','vf-os-anexos','vf-assinaturas','vf-relatorios')
      and split_part(name, '/', 1) ~* '^[0-9a-f-]{36}$' and split_part(name, '/', 1)::uuid = public.get_empresa_id()
      and (
        public.vf_can('comprovantes','criar', public.get_empresa_id())
        or public.vf_can('ordens-servico','editar', public.get_empresa_id())
        or public.vf_can('relatorios','exportar', public.get_empresa_id())
      )
    )
  $p$;

  execute $p$
    create policy vf_storage_update_empresa on storage.objects
    for update using (
      bucket_id in ('vf-comprovantes','vf-os-anexos','vf-assinaturas','vf-relatorios','vf-branding')
      and (public.is_master_admin() or (split_part(name, '/', 1) ~* '^[0-9a-f-]{36}$' and split_part(name, '/', 1)::uuid = public.get_empresa_id()))
    ) with check (
      bucket_id in ('vf-comprovantes','vf-os-anexos','vf-assinaturas','vf-relatorios','vf-branding')
      and (public.is_master_admin() or (split_part(name, '/', 1) ~* '^[0-9a-f-]{36}$' and split_part(name, '/', 1)::uuid = public.get_empresa_id()))
    )
  $p$;

  execute $p$
    create policy vf_storage_delete_empresa on storage.objects
    for delete using (
      bucket_id in ('vf-comprovantes','vf-os-anexos','vf-assinaturas','vf-relatorios','vf-branding')
      and (public.is_master_admin() or (split_part(name, '/', 1) ~* '^[0-9a-f-]{36}$' and split_part(name, '/', 1)::uuid = public.get_empresa_id()))
    )
  $p$;

  execute $p$
    create policy vf_storage_branding_public_select on storage.objects
    for select using (bucket_id = 'vf-branding')
  $p$;

  execute $p$
    create policy vf_storage_branding_admin_write on storage.objects
    for insert with check (
      bucket_id = 'vf-branding'
      and split_part(name, '/', 1) ~* '^[0-9a-f-]{36}$' and split_part(name, '/', 1)::uuid = public.get_empresa_id()
      and public.vf_can('configuracoes','editar', public.get_empresa_id())
    )
  $p$;
end $$;

-- 2) Configurações reais de integrações. Valores sensíveis devem ficar em
-- ambiente/secret manager. A tabela guarda somente status, metadados e chaves
-- públicas/identificadores necessários para operação.
create table if not exists public.integracoes_configuracoes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  provedor text not null check (provedor in ('asaas','mercado_pago','stripe','whatsapp_evolution','anthropic','supabase_storage','smtp','outro')),
  nome text not null,
  status text not null default 'pendente' check (status in ('pendente','ativa','erro','desativada')),
  ambiente text not null default 'sandbox' check (ambiente in ('sandbox','producao')),
  public_config jsonb not null default '{}'::jsonb,
  secret_ref text,
  ultimo_erro text,
  ultimo_evento_em timestamptz,
  configurado_por uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (empresa_id, provedor, nome)
);
create index if not exists idx_integracoes_empresa_provedor on public.integracoes_configuracoes(empresa_id, provedor, status);
alter table public.integracoes_configuracoes enable row level security;

-- 3) Billing SaaS preparado para webhooks reais, sem cobrar nada fictício.
create table if not exists public.billing_webhook_eventos (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('asaas','mercado_pago','stripe','manual','outro')),
  event_id text,
  event_type text,
  assinatura_id uuid references public.assinaturas(id) on delete set null,
  empresa_id uuid references public.empresas(id) on delete set null,
  payload jsonb not null default '{}'::jsonb,
  signature_hash text,
  status text not null default 'recebido' check (status in ('recebido','processado','ignorado','erro')),
  erro text,
  recebido_em timestamptz not null default now(),
  processado_em timestamptz,
  unique (provider, event_id)
);
create index if not exists idx_billing_webhooks_empresa on public.billing_webhook_eventos(empresa_id, recebido_em desc);
create index if not exists idx_billing_webhooks_status on public.billing_webhook_eventos(status, recebido_em desc);
alter table public.billing_webhook_eventos enable row level security;

create table if not exists public.assinaturas_historico (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  assinatura_id uuid references public.assinaturas(id) on delete set null,
  evento_id uuid references public.billing_webhook_eventos(id) on delete set null,
  acao text not null,
  status_anterior text,
  status_novo text,
  valor_anterior numeric(14,2),
  valor_novo numeric(14,2),
  detalhes jsonb not null default '{}'::jsonb,
  usuario_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists idx_assinaturas_historico_empresa on public.assinaturas_historico(empresa_id, created_at desc);
alter table public.assinaturas_historico enable row level security;

alter table if exists public.assinaturas add column if not exists provider text;
alter table if exists public.assinaturas add column if not exists provider_customer_id text;
alter table if exists public.assinaturas add column if not exists provider_subscription_id text;
alter table if exists public.assinaturas add column if not exists trial_ate date;
alter table if exists public.assinaturas add column if not exists cancelada_em timestamptz;
alter table if exists public.assinaturas add column if not exists bloqueada_em timestamptz;
alter table if exists public.assinaturas add column if not exists metadata jsonb not null default '{}'::jsonb;

-- 4) Exportações reais rastreáveis.
create table if not exists public.exportacoes_relatorios (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  usuario_id uuid references auth.users(id) on delete set null,
  tipo text not null,
  formato text not null check (formato in ('pdf','csv','json')),
  status text not null default 'gerado' check (status in ('processando','gerado','erro','expirado')),
  periodo_inicio date,
  periodo_fim date,
  storage_bucket text,
  storage_path text,
  total_linhas integer not null default 0,
  parametros jsonb not null default '{}'::jsonb,
  erro text,
  expira_em timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_exportacoes_empresa on public.exportacoes_relatorios(empresa_id, created_at desc, tipo);
alter table public.exportacoes_relatorios enable row level security;

-- 5) Validações de deploy e operação para registrar evidências sem depender de
-- plataforma externa.
create table if not exists public.deploy_validacoes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid references public.empresas(id) on delete set null,
  versao text,
  checklist jsonb not null default '{}'::jsonb,
  aprovado boolean not null default false,
  responsavel uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.deploy_validacoes add column if not exists ambiente text not null default 'manual';
alter table public.deploy_validacoes add column if not exists commit_sha text;
alter table public.deploy_validacoes add column if not exists status text not null default 'pendente';
alter table public.deploy_validacoes add column if not exists checks jsonb not null default '{}'::jsonb;
alter table public.deploy_validacoes add column if not exists executado_por uuid references auth.users(id) on delete set null;
alter table public.deploy_validacoes add column if not exists observacoes text;
do $$ begin
  alter table public.deploy_validacoes drop constraint if exists deploy_validacoes_status_check;
  alter table public.deploy_validacoes add constraint deploy_validacoes_status_check check (status in ('pendente','aprovado','falhou'));
exception when duplicate_object then null;
end $$;
alter table public.deploy_validacoes enable row level security;

-- 6) RLS para as novas tabelas.
do $$
declare
  rec record;
  pol record;
begin
  for rec in select * from (values
    ('integracoes_configuracoes','configuracoes'),
    ('billing_webhook_eventos','master-admin'),
    ('assinaturas_historico','master-admin'),
    ('exportacoes_relatorios','relatorios'),
    ('deploy_validacoes','master-admin')
  ) as x(tabela, modulo)
  loop
    if to_regclass(format('public.%I', rec.tabela)) is null then continue; end if;
    for pol in select policyname from pg_policies where schemaname='public' and tablename=rec.tabela loop
      execute format('drop policy if exists %I on public.%I', pol.policyname, rec.tabela);
    end loop;
    execute format('alter table public.%I enable row level security', rec.tabela);

    if rec.modulo = 'master-admin' then
      execute format('create policy %I on public.%I for select using (public.is_master_admin())', 'vf_'||rec.tabela||'_select', rec.tabela);
      execute format('create policy %I on public.%I for insert with check (public.is_master_admin())', 'vf_'||rec.tabela||'_insert', rec.tabela);
      execute format('create policy %I on public.%I for update using (public.is_master_admin()) with check (public.is_master_admin())', 'vf_'||rec.tabela||'_update', rec.tabela);
      execute format('create policy %I on public.%I for delete using (public.is_master_admin())', 'vf_'||rec.tabela||'_delete', rec.tabela);
    else
      execute format('create policy %I on public.%I for select using (public.is_master_admin() or (empresa_id = public.get_empresa_id() and public.vf_can(%L, ''ver'', empresa_id)))', 'vf_'||rec.tabela||'_select', rec.tabela, rec.modulo);
      execute format('create policy %I on public.%I for insert with check (public.is_master_admin() or (empresa_id = public.get_empresa_id() and public.vf_can(%L, case when %L = ''relatorios'' then ''exportar'' else ''editar'' end, empresa_id)))', 'vf_'||rec.tabela||'_insert', rec.tabela, rec.modulo, rec.modulo);
      execute format('create policy %I on public.%I for update using (public.is_master_admin() or (empresa_id = public.get_empresa_id() and public.vf_can(%L, ''editar'', empresa_id))) with check (public.is_master_admin() or (empresa_id = public.get_empresa_id() and public.vf_can(%L, ''editar'', empresa_id)))', 'vf_'||rec.tabela||'_update', rec.tabela, rec.modulo, rec.modulo);
      execute format('create policy %I on public.%I for delete using (public.is_master_admin() or (empresa_id = public.get_empresa_id() and public.vf_can(%L, ''excluir'', empresa_id)))', 'vf_'||rec.tabela||'_delete', rec.tabela, rec.modulo);
    end if;
  end loop;
end $$;

-- 7) RPCs seguras.
create or replace function public.vf_registrar_billing_webhook(
  p_provider text,
  p_event_id text,
  p_event_type text,
  p_payload jsonb,
  p_signature_hash text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_empresa uuid;
  v_assinatura uuid;
  v_status text;
  v_valor numeric;
begin
  if p_provider is null or trim(p_provider) = '' then raise exception 'Provider obrigatório.'; end if;
  if p_payload is null then p_payload := '{}'::jsonb; end if;

  v_empresa := nullif(coalesce(p_payload->>'empresa_id', p_payload#>>'{data,empresa_id}', p_payload#>>'{customer,metadata,empresa_id}'), '')::uuid;
  v_assinatura := nullif(coalesce(p_payload->>'assinatura_id', p_payload#>>'{data,assinatura_id}', p_payload#>>'{subscription,metadata,assinatura_id}'), '')::uuid;
  v_status := lower(coalesce(p_payload->>'status', p_payload#>>'{data,status}', p_payload#>>'{subscription,status}', 'recebido'));
  v_valor := nullif(coalesce(p_payload->>'valor', p_payload#>>'{data,value}', p_payload#>>'{subscription,value}'), '')::numeric;

  insert into public.billing_webhook_eventos (provider, event_id, event_type, assinatura_id, empresa_id, payload, signature_hash, status)
  values (p_provider, nullif(p_event_id,''), nullif(p_event_type,''), v_assinatura, v_empresa, p_payload, p_signature_hash, 'recebido')
  on conflict (provider, event_id) do update set payload = excluded.payload, signature_hash = excluded.signature_hash, recebido_em = now()
  returning id into v_id;

  if v_assinatura is not null then
    insert into public.assinaturas_historico (empresa_id, assinatura_id, evento_id, acao, status_anterior, status_novo, valor_novo, detalhes)
    select coalesce(v_empresa, a.empresa_id), a.id, v_id, 'webhook.' || p_provider, a.status, v_status, coalesce(v_valor, a.valor), p_payload
    from public.assinaturas a where a.id = v_assinatura;

    update public.assinaturas
    set status = case
      when v_status in ('paid','received','confirmed','active','ativa','pago') then 'ativa'
      when v_status in ('overdue','vencida','past_due') then 'vencida'
      when v_status in ('blocked','bloqueada','suspended') then 'bloqueada'
      when v_status in ('cancelled','canceled','cancelada') then 'cancelada'
      else status
    end,
    valor = coalesce(v_valor, valor),
    metadata = coalesce(metadata,'{}'::jsonb) || jsonb_build_object('last_webhook_event_id', v_id, 'last_webhook_provider', p_provider),
    updated_at = now()
    where id = v_assinatura;
  end if;

  update public.billing_webhook_eventos set status = 'processado', processado_em = now() where id = v_id;
  if v_empresa is not null then
    perform public.vf_auditar(v_empresa, 'billing.webhook.processado', 'billing_webhook_eventos', v_id, jsonb_build_object('provider', p_provider, 'event_id', p_event_id, 'event_type', p_event_type));
  end if;
  return v_id;
exception when others then
  insert into public.billing_webhook_eventos (provider, event_id, event_type, payload, signature_hash, status, erro)
  values (coalesce(p_provider,'outro'), nullif(p_event_id,''), nullif(p_event_type,''), coalesce(p_payload,'{}'::jsonb), p_signature_hash, 'erro', sqlerrm)
  on conflict (provider, event_id) do update set status = 'erro', erro = excluded.erro, payload = excluded.payload
  returning id into v_id;
  return v_id;
end;
$$;
grant execute on function public.vf_registrar_billing_webhook(text,text,text,jsonb,text) to service_role;

create or replace function public.vf_registrar_exportacao_relatorio(
  p_tipo text,
  p_formato text,
  p_periodo_inicio date,
  p_periodo_fim date,
  p_storage_bucket text,
  p_storage_path text,
  p_total_linhas integer default 0,
  p_parametros jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_empresa uuid := public.get_empresa_id();
  v_id uuid;
begin
  if v_empresa is null then raise exception 'Empresa não identificada.'; end if;
  if not public.vf_can('relatorios','exportar',v_empresa) then raise exception 'Permissão negada para exportar relatório.'; end if;
  insert into public.exportacoes_relatorios (empresa_id, usuario_id, tipo, formato, periodo_inicio, periodo_fim, storage_bucket, storage_path, total_linhas, parametros, expira_em)
  values (v_empresa, auth.uid(), p_tipo, p_formato, p_periodo_inicio, p_periodo_fim, p_storage_bucket, p_storage_path, coalesce(p_total_linhas,0), coalesce(p_parametros,'{}'::jsonb), now() + interval '30 days')
  returning id into v_id;
  perform public.vf_auditar(v_empresa, 'relatorio.exportar', 'exportacoes_relatorios', v_id, jsonb_build_object('tipo', p_tipo, 'formato', p_formato, 'storage_path', p_storage_path));
  return v_id;
end;
$$;
grant execute on function public.vf_registrar_exportacao_relatorio(text,text,date,date,text,text,integer,jsonb) to authenticated;

create or replace function public.vf_registrar_deploy_validacao(p_ambiente text, p_versao text, p_commit_sha text, p_status text, p_checks jsonb, p_observacoes text default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if not public.is_master_admin() then raise exception 'Apenas master admin pode registrar validação de deploy.'; end if;
  insert into public.deploy_validacoes (ambiente, versao, commit_sha, status, checks, checklist, aprovado, executado_por, responsavel, observacoes)
  values (coalesce(p_ambiente,'manual'), p_versao, p_commit_sha, coalesce(p_status,'pendente'), coalesce(p_checks,'{}'::jsonb), coalesce(p_checks,'{}'::jsonb), coalesce(p_status,'pendente') = 'aprovado', auth.uid(), auth.uid(), p_observacoes)
  returning id into v_id;
  return v_id;
end;
$$;
grant execute on function public.vf_registrar_deploy_validacao(text,text,text,text,jsonb,text) to authenticated;
