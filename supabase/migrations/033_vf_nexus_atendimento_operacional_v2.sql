-- VF Nexus Atendimento V2 — correções estruturais para operação real de bares e restaurantes
-- Corrige mesas enumeradas, funcionários por setor, itens editáveis, isolamento por empresa e índices operacionais.

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

alter table if exists public.produtos
  add column if not exists setor_producao text default 'balcao',
  add column if not exists aparece_no_atendimento boolean default true,
  add column if not exists ordem_atendimento int default 0;

create table if not exists public.restaurant_staff (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  nome text not null,
  cpf text,
  cpf_normalizado text not null,
  setor text not null check (setor in ('atendimento','cozinha','caixa','gerente')),
  cargo text,
  pin_hash text,
  ativo boolean default true,
  ultimo_acesso_em timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (empresa_id, cpf_normalizado)
);

alter table if exists public.restaurant_tables
  add column if not exists comanda_aberta_id uuid,
  add column if not exists total_atual numeric(12,2) default 0,
  add column if not exists cliente_nome text,
  add column if not exists garcom_nome text;

alter table if exists public.restaurant_tabs
  add column if not exists staff_id uuid references public.restaurant_staff(id) on delete set null;

alter table if exists public.restaurant_orders
  add column if not exists staff_preparo_id uuid references public.restaurant_staff(id) on delete set null;

alter table if exists public.restaurant_tab_items
  add column if not exists estoque_baixado boolean default false,
  add column if not exists cancelado_motivo text,
  add column if not exists cancelado_at timestamptz;

create index if not exists restaurant_staff_empresa_setor_idx on public.restaurant_staff(empresa_id, setor, ativo);
create index if not exists restaurant_staff_empresa_cpf_idx on public.restaurant_staff(empresa_id, cpf_normalizado);
create index if not exists restaurant_tables_empresa_numero_idx on public.restaurant_tables(empresa_id, numero);
create index if not exists restaurant_tabs_empresa_mesa_status_idx on public.restaurant_tabs(empresa_id, mesa_id, status);
create index if not exists restaurant_items_empresa_tab_status_idx on public.restaurant_tab_items(empresa_id, comanda_id, status);
create index if not exists produtos_atendimento_empresa_idx on public.produtos(empresa_id, ativo, aparece_no_atendimento, ordem_atendimento, nome);

alter table public.restaurant_staff enable row level security;

drop policy if exists restaurant_staff_tenant_select on public.restaurant_staff;
drop policy if exists restaurant_staff_tenant_insert on public.restaurant_staff;
drop policy if exists restaurant_staff_tenant_update on public.restaurant_staff;
drop policy if exists restaurant_staff_tenant_delete on public.restaurant_staff;

create policy restaurant_staff_tenant_select on public.restaurant_staff
for select using (
  empresa_id in (select empresa_id from public.perfis where id = auth.uid())
  or exists (select 1 from public.master_admins where user_id = auth.uid() and coalesce(ativo,true))
);

create policy restaurant_staff_tenant_insert on public.restaurant_staff
for insert with check (
  empresa_id in (select empresa_id from public.perfis where id = auth.uid())
  or exists (select 1 from public.master_admins where user_id = auth.uid() and coalesce(ativo,true))
);

create policy restaurant_staff_tenant_update on public.restaurant_staff
for update using (
  empresa_id in (select empresa_id from public.perfis where id = auth.uid())
  or exists (select 1 from public.master_admins where user_id = auth.uid() and coalesce(ativo,true))
) with check (
  empresa_id in (select empresa_id from public.perfis where id = auth.uid())
  or exists (select 1 from public.master_admins where user_id = auth.uid() and coalesce(ativo,true))
);

create policy restaurant_staff_tenant_delete on public.restaurant_staff
for delete using (
  empresa_id in (select empresa_id from public.perfis where id = auth.uid())
  or exists (select 1 from public.master_admins where user_id = auth.uid() and coalesce(ativo,true))
);

create or replace function public.vf_restaurante_recalcular_comanda(p_comanda_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_subtotal numeric(12,2);
  v_taxa numeric(12,2);
  v_desconto numeric(12,2);
  v_total numeric(12,2);
  v_empresa uuid;
  v_mesa uuid;
begin
  select empresa_id, mesa_id, coalesce(desconto,0) into v_empresa, v_mesa, v_desconto
  from public.restaurant_tabs where id = p_comanda_id;

  select coalesce(sum(total),0) into v_subtotal
  from public.restaurant_tab_items
  where comanda_id = p_comanda_id and status <> 'cancelado';

  select case when coalesce(rss.cobrar_taxa_servico,false)
    then round(v_subtotal * coalesce(rss.taxa_servico_percent,0) / 100, 2)
    else 0 end
  into v_taxa
  from public.restaurant_service_settings rss
  where rss.empresa_id = v_empresa;

  v_taxa := coalesce(v_taxa,0);
  v_total := greatest(0, v_subtotal + v_taxa - coalesce(v_desconto,0));

  update public.restaurant_tabs
  set subtotal = v_subtotal, taxa_servico = v_taxa, total = v_total, updated_at = now()
  where id = p_comanda_id;

  if v_mesa is not null then
    update public.restaurant_tables set total_atual = v_total, updated_at = now() where id = v_mesa;
  end if;
end $$;

-- Cria 12 mesas padrão para empresas que ainda não possuem mapa de salão.
insert into public.restaurant_tables (empresa_id, numero, nome, status, capacidade, ativo)
select e.id, lpad(gs::text, 2, '0'), 'Mesa ' || lpad(gs::text, 2, '0'), 'livre', 4, true
from public.empresas e
cross join generate_series(1,12) gs
where not exists (select 1 from public.restaurant_tables rt where rt.empresa_id = e.id)
on conflict do nothing;

create or replace function public.vf_restaurante_login_staff(p_nome text, p_cpf text, p_codigo_empresa text default null)
returns table (
  id uuid,
  empresa_id uuid,
  nome text,
  cpf text,
  cpf_normalizado text,
  setor text,
  cargo text,
  ativo boolean,
  ultimo_acesso_em timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select s.id, s.empresa_id, s.nome, s.cpf, s.cpf_normalizado, s.setor, s.cargo, s.ativo, s.ultimo_acesso_em
  from public.restaurant_staff s
  join public.empresas e on e.id = s.empresa_id
  where s.ativo = true
    and s.cpf_normalizado = regexp_replace(coalesce(p_cpf,''), '[^0-9]', '', 'g')
    and (p_codigo_empresa is null or lower(e.codigo_empresa) = lower(p_codigo_empresa) or lower(e.matricula_empresa) = lower(p_codigo_empresa))
    and (p_nome is null or lower(s.nome) like '%' || lower(split_part(trim(p_nome), ' ', 1)) || '%')
  order by s.updated_at desc
  limit 1;
end $$;

grant execute on function public.vf_restaurante_login_staff(text, text, text) to anon, authenticated;
