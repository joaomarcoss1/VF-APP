create extension if not exists pgcrypto;

-- VF Nexus V9.2 - Isolamento tenant para integrações
create table if not exists public.integracoes_configuracoes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid references public.empresas(id) on delete cascade,
  provedor text not null,
  nome text not null,
  status text default 'pendente',
  ambiente text default 'sandbox',
  public_config jsonb default '{}'::jsonb,
  secret_ref text,
  ultimo_erro text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table if exists public.integracoes_configuracoes
  add column if not exists empresa_id uuid references public.empresas(id) on delete cascade,
  add column if not exists public_config jsonb default '{}'::jsonb,
  add column if not exists updated_at timestamptz default now();

create unique index if not exists integracoes_config_empresa_provider_nome_idx
on public.integracoes_configuracoes(empresa_id, provedor, nome);
create index if not exists integracoes_config_empresa_provider_idx
on public.integracoes_configuracoes(empresa_id, provedor);

alter table if exists public.integracoes_configuracoes enable row level security;

drop policy if exists integracoes_tenant_select_v92 on public.integracoes_configuracoes;
create policy integracoes_tenant_select_v92 on public.integracoes_configuracoes for select
using (public.vf_is_master() or public.vf_same_empresa(empresa_id));

drop policy if exists integracoes_tenant_write_v92 on public.integracoes_configuracoes;
create policy integracoes_tenant_write_v92 on public.integracoes_configuracoes for all
using (public.vf_is_master() or public.vf_same_empresa(empresa_id))
with check (public.vf_is_master() or public.vf_same_empresa(empresa_id));
