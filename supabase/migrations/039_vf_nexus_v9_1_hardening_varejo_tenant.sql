-- VF Nexus V9.1 — hardening multiempresa para varejo/variações
-- Garante empresa_id em variações e estoque de variações, sem depender apenas de RLS.

create extension if not exists pgcrypto;

alter table if exists public.produto_variacoes
  add column if not exists empresa_id uuid references public.empresas(id) on delete cascade;

update public.produto_variacoes pv
set empresa_id = p.empresa_id
from public.produtos p
where pv.produto_id = p.id
  and pv.empresa_id is null
  and p.empresa_id is not null;

alter table if exists public.produto_variacao_estoque
  add column if not exists empresa_id uuid references public.empresas(id) on delete cascade;

update public.produto_variacao_estoque pve
set empresa_id = pv.empresa_id
from public.produto_variacoes pv
where pve.variacao_id = pv.id
  and pve.empresa_id is null
  and pv.empresa_id is not null;

alter table if exists public.movimentacoes_variacao_estoque
  add column if not exists empresa_id uuid references public.empresas(id) on delete cascade;

update public.movimentacoes_variacao_estoque mve
set empresa_id = pv.empresa_id
from public.produto_variacoes pv
where mve.variacao_id = pv.id
  and mve.empresa_id is null
  and pv.empresa_id is not null;

create index if not exists produto_variacoes_empresa_produto_v91_idx
  on public.produto_variacoes(empresa_id, produto_id);

create index if not exists produto_variacao_estoque_empresa_variacao_v91_idx
  on public.produto_variacao_estoque(empresa_id, variacao_id);

create index if not exists movimentacoes_variacao_estoque_empresa_variacao_v91_idx
  on public.movimentacoes_variacao_estoque(empresa_id, variacao_id, created_at desc);

alter table if exists public.produto_variacoes enable row level security;
alter table if exists public.produto_variacao_estoque enable row level security;
alter table if exists public.movimentacoes_variacao_estoque enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['produto_variacoes','produto_variacao_estoque','movimentacoes_variacao_estoque'] loop
    execute format('drop policy if exists %I on public.%I', 'vf_v91_tenant_select_' || t, t);
    execute format('create policy %I on public.%I for select using (public.vf_is_master() or empresa_id = public.vf_current_empresa_id())', 'vf_v91_tenant_select_' || t, t);
    execute format('drop policy if exists %I on public.%I', 'vf_v91_tenant_all_' || t, t);
    execute format('create policy %I on public.%I for all using (public.vf_is_master() or empresa_id = public.vf_current_empresa_id()) with check (public.vf_is_master() or empresa_id = public.vf_current_empresa_id())', 'vf_v91_tenant_all_' || t, t);
  end loop;
end $$;
