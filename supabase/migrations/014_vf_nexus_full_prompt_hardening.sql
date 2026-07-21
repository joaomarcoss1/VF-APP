-- ============================================================
-- 014 — VF Nexus Full Prompt Hardening
-- Objetivo: concluir bases comerciais para financeiro, RBAC, OS,
-- documentos, auditoria, compras, permissões e relatórios.
-- Migration incremental e não destrutiva.
-- ============================================================

create extension if not exists "pgcrypto";

-- Ordens de serviço para ramos de serviços/assistência/fotografia
create table if not exists public.ordens_servico (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  cliente_id uuid references public.clientes(id) on delete set null,
  agendamento_id uuid references public.agendamentos(id) on delete set null,
  numero bigserial,
  titulo text not null,
  descricao text,
  status text not null default 'aberta' check (status in ('aberta','orcamento','aprovada','execucao','finalizada','cancelada')),
  valor_orcado numeric(14,2) default 0,
  valor_final numeric(14,2) default 0,
  data_abertura date not null default current_date,
  data_previsao date,
  data_finalizacao date,
  observacoes text,
  anexos jsonb default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.ordens_servico enable row level security;
create index if not exists idx_ordens_servico_empresa_status on public.ordens_servico(empresa_id, status);
create index if not exists idx_ordens_servico_empresa_data on public.ordens_servico(empresa_id, data_abertura desc);

do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='ordens_servico' and policyname='ordens_servico_select_empresa') then
    create policy ordens_servico_select_empresa on public.ordens_servico for select using (empresa_id in (select empresa_id from public.perfis where id = auth.uid()) or exists (select 1 from public.master_admins where user_id = auth.uid()));
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='ordens_servico' and policyname='ordens_servico_insert_empresa') then
    create policy ordens_servico_insert_empresa on public.ordens_servico for insert with check (empresa_id in (select empresa_id from public.perfis where id = auth.uid()) or exists (select 1 from public.master_admins where user_id = auth.uid()));
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='ordens_servico' and policyname='ordens_servico_update_empresa') then
    create policy ordens_servico_update_empresa on public.ordens_servico for update using (empresa_id in (select empresa_id from public.perfis where id = auth.uid()) or exists (select 1 from public.master_admins where user_id = auth.uid())) with check (empresa_id in (select empresa_id from public.perfis where id = auth.uid()) or exists (select 1 from public.master_admins where user_id = auth.uid()));
  end if;
end $$;

-- Histórico de status de venda para cancelamento/estorno/auditoria
create table if not exists public.venda_status_historico (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  venda_id uuid not null references public.vendas(id) on delete cascade,
  status_anterior text,
  status_novo text not null,
  motivo text,
  usuario_id uuid,
  created_at timestamptz not null default now()
);
alter table public.venda_status_historico enable row level security;
create index if not exists idx_venda_status_empresa_venda on public.venda_status_historico(empresa_id, venda_id, created_at desc);

do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='venda_status_historico' and policyname='venda_status_select_empresa') then
    create policy venda_status_select_empresa on public.venda_status_historico for select using (empresa_id in (select empresa_id from public.perfis where id = auth.uid()) or exists (select 1 from public.master_admins where user_id = auth.uid()));
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='venda_status_historico' and policyname='venda_status_insert_empresa') then
    create policy venda_status_insert_empresa on public.venda_status_historico for insert with check (empresa_id in (select empresa_id from public.perfis where id = auth.uid()) or exists (select 1 from public.master_admins where user_id = auth.uid()));
  end if;
end $$;

-- Documentos gerados: PDFs, relatórios, recibos, orçamentos e OS
create table if not exists public.documentos_gerados (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  tipo text not null,
  titulo text not null,
  entidade text,
  entidade_id uuid,
  numero text,
  url_pdf text,
  dados jsonb default '{}'::jsonb,
  branding jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.documentos_gerados enable row level security;
create index if not exists idx_documentos_empresa_tipo on public.documentos_gerados(empresa_id, tipo, created_at desc);

do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='documentos_gerados' and policyname='documentos_select_empresa') then
    create policy documentos_select_empresa on public.documentos_gerados for select using (empresa_id in (select empresa_id from public.perfis where id = auth.uid()) or exists (select 1 from public.master_admins where user_id = auth.uid()));
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='documentos_gerados' and policyname='documentos_insert_empresa') then
    create policy documentos_insert_empresa on public.documentos_gerados for insert with check (empresa_id in (select empresa_id from public.perfis where id = auth.uid()) or exists (select 1 from public.master_admins where user_id = auth.uid()));
  end if;
end $$;

-- Endurecimento de planos e limites por empresa
create table if not exists public.plano_limites_empresa (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade unique,
  plano_codigo text not null default 'free',
  limite_produtos integer,
  limite_usuarios integer,
  limite_vendas_mes integer,
  limite_agendamentos_mes integer,
  limite_ia_dia integer,
  modulos text[] default array['dashboard','produtos','vendas','clientes','financeiro','configuracoes'],
  bloqueado boolean not null default false,
  motivo_bloqueio text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.plano_limites_empresa enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='plano_limites_empresa' and policyname='plano_limites_select_empresa') then
    create policy plano_limites_select_empresa on public.plano_limites_empresa for select using (empresa_id in (select empresa_id from public.perfis where id = auth.uid()) or exists (select 1 from public.master_admins where user_id = auth.uid()));
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='plano_limites_empresa' and policyname='plano_limites_master_write') then
    create policy plano_limites_master_write on public.plano_limites_empresa for all using (exists (select 1 from public.master_admins where user_id = auth.uid())) with check (exists (select 1 from public.master_admins where user_id = auth.uid()));
  end if;
end $$;

-- Campos complementares, seguros e incrementais
alter table public.empresas add column if not exists razao_social text;
alter table public.empresas add column if not exists documento text;
alter table public.empresas add column if not exists whatsapp text;
alter table public.empresas add column if not exists slogan text;
alter table public.empresas add column if not exists tema_preferido text default 'nexlabs_light';
alter table public.empresas add column if not exists onboarding_checklist jsonb default '{}'::jsonb;

alter table public.clientes add column if not exists data_nascimento date;
alter table public.clientes add column if not exists tags text[] default '{}';
alter table public.clientes add column if not exists ticket_medio numeric(14,2) default 0;
alter table public.clientes add column if not exists ultima_compra date;

alter table public.produtos add column if not exists comissao_percentual numeric(8,2) default 0;
alter table public.produtos add column if not exists impostos_estimados numeric(8,2) default 0;
alter table public.produtos add column if not exists perdas_percentual numeric(8,2) default 0;
alter table public.produtos add column if not exists garantia text;
alter table public.produtos add column if not exists materiais_usados jsonb default '[]'::jsonb;
alter table public.produtos add column if not exists preco_promocional numeric(14,2);

-- Módulo de OS nos perfis setoriais se a tabela existir
insert into public.setor_modulos (tipo_empresa, modulo, ativo, ordem)
select tipo, 'ordens-servico', true, 99
from (values ('prestador_servico'),('barbearia'),('fotografia'),('eletronicos'),('outro')) as v(tipo)
where exists (select 1 from information_schema.tables where table_schema='public' and table_name='setor_modulos')
on conflict do nothing;

-- Trigger genérico de updated_at, se ainda não existir
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_ordens_servico_updated_at') then
    create trigger trg_ordens_servico_updated_at before update on public.ordens_servico for each row execute function public.set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'trg_plano_limites_updated_at') then
    create trigger trg_plano_limites_updated_at before update on public.plano_limites_empresa for each row execute function public.set_updated_at();
  end if;
end $$;
