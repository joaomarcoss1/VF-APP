-- VF Nexus — correção estrutural de isolamento multiempresa e edição de produtos/fichas
-- Esta migration reforça empresa_id/matrícula por empresa e torna ficha_tecnica explicitamente multiempresa.

create extension if not exists pgcrypto;

alter table if exists public.empresas
  add column if not exists codigo_empresa text,
  add column if not exists matricula_empresa text;

update public.empresas
set codigo_empresa = coalesce(nullif(codigo_empresa,''), 'VF-' || upper(substr(replace(id::text,'-',''), 1, 6)))
where codigo_empresa is null or codigo_empresa = '';

update public.empresas
set matricula_empresa = coalesce(nullif(matricula_empresa,''), codigo_empresa)
where matricula_empresa is null or matricula_empresa = '';

create index if not exists empresas_codigo_empresa_idx
on public.empresas(lower(codigo_empresa))
where codigo_empresa is not null;

create index if not exists empresas_matricula_empresa_idx
on public.empresas(lower(matricula_empresa))
where matricula_empresa is not null;

alter table if exists public.produtos
  add column if not exists setor_producao text default 'balcao',
  add column if not exists aparece_no_atendimento boolean default true,
  add column if not exists ordem_atendimento int default 0;

create index if not exists idx_produtos_empresa_atendimento
on public.produtos(empresa_id, ativo, aparece_no_atendimento, ordem_atendimento, nome);

-- Ficha técnica passa a carregar empresa_id próprio, além da proteção por produto/insumo.
alter table if exists public.ficha_tecnica
  add column if not exists empresa_id uuid references public.empresas(id) on delete cascade,
  add column if not exists updated_at timestamptz default now();

update public.ficha_tecnica ft
set empresa_id = p.empresa_id
from public.produtos p
where ft.produto_id = p.id
  and ft.empresa_id is null;

-- Remove linhas órfãs sem empresa, que não podem ser isoladas com segurança.
delete from public.ficha_tecnica
where empresa_id is null;

alter table public.ficha_tecnica
  alter column empresa_id set not null;

create index if not exists idx_ficha_tecnica_empresa_produto
on public.ficha_tecnica(empresa_id, produto_id);

create index if not exists idx_ficha_tecnica_empresa_insumo
on public.ficha_tecnica(empresa_id, insumo_id);

create unique index if not exists ficha_tecnica_empresa_produto_insumo_unique_idx
on public.ficha_tecnica(empresa_id, produto_id, insumo_id);

alter table public.ficha_tecnica enable row level security;

drop policy if exists ficha_select on public.ficha_tecnica;
drop policy if exists ficha_insert on public.ficha_tecnica;
drop policy if exists ficha_update on public.ficha_tecnica;
drop policy if exists ficha_delete on public.ficha_tecnica;
drop policy if exists ficha_tecnica_tenant_select on public.ficha_tecnica;
drop policy if exists ficha_tecnica_tenant_insert on public.ficha_tecnica;
drop policy if exists ficha_tecnica_tenant_update on public.ficha_tecnica;
drop policy if exists ficha_tecnica_tenant_delete on public.ficha_tecnica;

create policy ficha_tecnica_tenant_select on public.ficha_tecnica
for select using (
  empresa_id = public.get_empresa_id()
  or public.is_master_admin()
);

create policy ficha_tecnica_tenant_insert on public.ficha_tecnica
for insert with check (
  (
    empresa_id = public.get_empresa_id()
    and produto_id in (select id from public.produtos where empresa_id = public.get_empresa_id())
    and insumo_id in (select id from public.insumos where empresa_id = public.get_empresa_id())
  )
  or public.is_master_admin()
);

create policy ficha_tecnica_tenant_update on public.ficha_tecnica
for update using (
  empresa_id = public.get_empresa_id()
  or public.is_master_admin()
) with check (
  (
    empresa_id = public.get_empresa_id()
    and produto_id in (select id from public.produtos where empresa_id = public.get_empresa_id())
    and insumo_id in (select id from public.insumos where empresa_id = public.get_empresa_id())
  )
  or public.is_master_admin()
);

create policy ficha_tecnica_tenant_delete on public.ficha_tecnica
for delete using (
  empresa_id = public.get_empresa_id()
  or public.is_master_admin()
);

-- Reforço de índices operacionais em tabelas que alimentam estoque/produtos/notas.
do $$
begin
  if to_regclass('public.insumos') is not null then
    create index if not exists idx_insumos_empresa_ativo_nome on public.insumos(empresa_id, ativo, nome);
  end if;
  if to_regclass('public.produto_estoque') is not null then
    create index if not exists idx_produto_estoque_empresa_produto on public.produto_estoque(empresa_id, produto_id);
  end if;
  if to_regclass('public.movimentacoes_estoque') is not null then
    create index if not exists idx_movimentacoes_estoque_empresa_created on public.movimentacoes_estoque(empresa_id, created_at desc);
  end if;
  if to_regclass('public.notas_fiscais') is not null then
    create index if not exists idx_notas_fiscais_empresa_created on public.notas_fiscais(empresa_id, created_at desc);
  end if;
end $$;

-- Validação rápida para auditoria pós-migration.
create or replace view public.vf_auditoria_isolamento_empresas as
select
  e.id as empresa_id,
  e.nome,
  e.codigo_empresa,
  e.matricula_empresa,
  (select count(*) from public.produtos p where p.empresa_id = e.id) as produtos,
  (select count(*) from public.insumos i where i.empresa_id = e.id) as insumos,
  (select count(*) from public.ficha_tecnica ft where ft.empresa_id = e.id) as fichas,
  (select count(*) from public.restaurant_tabs rt where rt.empresa_id = e.id) as comandas
from public.empresas e;
