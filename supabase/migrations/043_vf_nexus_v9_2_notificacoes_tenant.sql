create extension if not exists pgcrypto;

-- VF Nexus V9.2 - Isolamento tenant para notificações centrais
create table if not exists public.notificacoes_central (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid references public.empresas(id) on delete cascade,
  tipo text not null default 'info',
  titulo text not null,
  mensagem text not null,
  prioridade text default 'media',
  entidade text,
  entidade_id uuid,
  lida boolean default false,
  lida_em timestamptz,
  created_at timestamptz default now()
);

alter table if exists public.notificacoes_central
  add column if not exists empresa_id uuid references public.empresas(id) on delete cascade,
  add column if not exists lida boolean default false,
  add column if not exists lida_em timestamptz;

create index if not exists notificacoes_central_empresa_created_idx on public.notificacoes_central(empresa_id, created_at desc);
create index if not exists notificacoes_central_empresa_lida_idx on public.notificacoes_central(empresa_id, lida);

alter table if exists public.notificacoes_central enable row level security;

drop policy if exists notificacoes_tenant_select_v92 on public.notificacoes_central;
create policy notificacoes_tenant_select_v92 on public.notificacoes_central for select
using (public.vf_is_master() or public.vf_same_empresa(empresa_id));

drop policy if exists notificacoes_tenant_write_v92 on public.notificacoes_central;
create policy notificacoes_tenant_write_v92 on public.notificacoes_central for all
using (public.vf_is_master() or public.vf_same_empresa(empresa_id))
with check (public.vf_is_master() or public.vf_same_empresa(empresa_id));
