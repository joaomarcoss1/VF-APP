-- ============================================================
-- VF Nexus V11 — Endurecimento comercial, mobile, paleta e fiscal
-- Execute após a migration 021.
-- ============================================================

alter table public.empresas
  add column if not exists cor_sucesso text default '#16A34A',
  add column if not exists cor_alerta text default '#F59E0B',
  add column if not exists cor_erro text default '#DC2626',
  add column if not exists cor_info text default '#0A8DFF',
  add column if not exists modo_tema text default 'light';

do $$ begin
  alter table public.empresas add constraint empresas_modo_tema_check check (modo_tema in ('light','dark','custom'));
exception when duplicate_object then null; end $$;

alter table public.configuracoes
  add column if not exists cor_superficie text,
  add column if not exists cor_superficie2 text,
  add column if not exists cor_borda text,
  add column if not exists cor_menu text,
  add column if not exists cor_card text,
  add column if not exists cor_muted text,
  add column if not exists cor_sucesso text,
  add column if not exists cor_alerta text,
  add column if not exists cor_erro text,
  add column if not exists cor_info text,
  add column if not exists modo_tema text default 'light';

create table if not exists public.integracoes_fiscais_config (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  provedor text not null default 'outro',
  ambiente text not null default 'homologacao',
  certificado_configurado boolean not null default false,
  cnpj text,
  inscricao_estadual text,
  inscricao_municipal text,
  regime_tributario text,
  cnae text,
  serie_nfe text default '1',
  serie_nfce text default '1',
  serie_nfse text default '1',
  token_homologacao text,
  token_producao text,
  status text not null default 'nao_configurada',
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (empresa_id)
);

create table if not exists public.documentos_fiscais (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  venda_id uuid null references public.vendas(id) on delete set null,
  cliente_id uuid null references public.clientes(id) on delete set null,
  tipo text not null default 'nfe',
  status text not null default 'rascunho',
  chave_acesso text,
  numero text,
  serie text,
  xml_url text,
  danfe_url text,
  mensagem_retorno text,
  payload_envio jsonb default '{}'::jsonb,
  payload_retorno jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_integracoes_fiscais_empresa on public.integracoes_fiscais_config(empresa_id);
create index if not exists idx_documentos_fiscais_empresa on public.documentos_fiscais(empresa_id, created_at desc);
create index if not exists idx_documentos_fiscais_venda on public.documentos_fiscais(venda_id);

do $$ begin
  alter table public.integracoes_fiscais_config add constraint integracoes_fiscais_config_ambiente_check check (ambiente in ('homologacao','producao'));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.integracoes_fiscais_config add constraint integracoes_fiscais_config_status_check check (status in ('nao_configurada','homologacao','ativa','erro'));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.documentos_fiscais add constraint documentos_fiscais_tipo_check check (tipo in ('nfe','nfce','nfse'));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.documentos_fiscais add constraint documentos_fiscais_status_check check (status in ('rascunho','emitindo','autorizada','rejeitada','cancelada','inutilizada'));
exception when duplicate_object then null; end $$;

alter table public.integracoes_fiscais_config enable row level security;
alter table public.documentos_fiscais enable row level security;

-- Policies tolerantes a ambientes em que funções auxiliares ainda não existam.
do $$ begin
  create policy integracoes_fiscais_config_select_empresa on public.integracoes_fiscais_config
    for select using (empresa_id in (select empresa_id from public.perfis where id = auth.uid()));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy integracoes_fiscais_config_all_empresa on public.integracoes_fiscais_config
    for all using (empresa_id in (select empresa_id from public.perfis where id = auth.uid()))
    with check (empresa_id in (select empresa_id from public.perfis where id = auth.uid()));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy documentos_fiscais_select_empresa on public.documentos_fiscais
    for select using (empresa_id in (select empresa_id from public.perfis where id = auth.uid()));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy documentos_fiscais_all_empresa on public.documentos_fiscais
    for all using (empresa_id in (select empresa_id from public.perfis where id = auth.uid()))
    with check (empresa_id in (select empresa_id from public.perfis where id = auth.uid()));
exception when duplicate_object then null; end $$;

create or replace function public.vf_registrar_documento_fiscal_rascunho(
  p_tipo text,
  p_venda_id uuid default null,
  p_cliente_id uuid default null,
  p_payload jsonb default '{}'::jsonb
) returns uuid language plpgsql security definer as $$
declare
  v_empresa uuid;
  v_id uuid;
begin
  select empresa_id into v_empresa from public.perfis where id = auth.uid();
  if v_empresa is null then raise exception 'Perfil sem empresa vinculada'; end if;
  insert into public.documentos_fiscais(empresa_id, tipo, venda_id, cliente_id, status, payload_envio)
  values (v_empresa, coalesce(p_tipo,'nfe'), p_venda_id, p_cliente_id, 'rascunho', coalesce(p_payload,'{}'::jsonb))
  returning id into v_id;
  return v_id;
end; $$;

-- Checklist operacional em JSON para diagnóstico rápido da empresa.
create or replace function public.vf_empresa_prontidao_v11()
returns jsonb language plpgsql security definer as $$
declare
  v_empresa uuid;
  result jsonb;
begin
  select empresa_id into v_empresa from public.perfis where id = auth.uid();
  if v_empresa is null then return jsonb_build_object('ok', false, 'erro', 'Perfil sem empresa'); end if;
  select jsonb_build_object(
    'empresa_id', v_empresa,
    'produtos', (select count(*) from public.produtos where empresa_id = v_empresa),
    'vendas', (select count(*) from public.vendas where empresa_id = v_empresa),
    'clientes', (select count(*) from public.clientes where empresa_id = v_empresa),
    'cardapios', (select count(*) from public.cardapios where empresa_id = v_empresa),
    'fiscal_configurada', exists(select 1 from public.integracoes_fiscais_config where empresa_id = v_empresa and status in ('homologacao','ativa'))
  ) into result;
  return result;
end; $$;
