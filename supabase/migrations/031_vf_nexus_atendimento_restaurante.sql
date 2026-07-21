-- VF Nexus Atendimento — bares e restaurantes
-- Implementa comandas, mesas, cozinha, caixa, notificações e impressão com isolamento multiempresa.

create extension if not exists pgcrypto;

alter table if exists public.produtos
  add column if not exists setor_producao text default 'balcao',
  add column if not exists aparece_no_atendimento boolean default true,
  add column if not exists ordem_atendimento int default 0;

create table if not exists public.restaurant_tables (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  numero text not null,
  nome text,
  status text not null default 'livre' check (status in ('livre','ocupada','aguardando_fechamento','em_pagamento','liberada','bloqueada')),
  capacidade int default 4,
  total_atual numeric(12,2) default 0,
  cliente_nome text,
  garcom_nome text,
  tempo_aberta_min int default 0,
  ativo boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (empresa_id, numero)
);

create table if not exists public.restaurant_tabs (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  mesa_id uuid references public.restaurant_tables(id) on delete set null,
  cliente_id uuid,
  operador_id uuid references auth.users(id) on delete set null,
  codigo text not null,
  tipo text not null default 'mesa' check (tipo in ('mesa','balcao','delivery')),
  status text not null default 'aberta' check (status in ('aberta','itens_enviados','aguardando_fechamento','em_pagamento','paga','cancelada')),
  cliente_nome text,
  pessoas int,
  subtotal numeric(12,2) default 0,
  desconto numeric(12,2) default 0,
  taxa_servico numeric(12,2) default 0,
  total numeric(12,2) default 0,
  fechamento_solicitado_at timestamptz,
  opened_at timestamptz default now(),
  closed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (empresa_id, codigo)
);

create table if not exists public.restaurant_tab_items (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  comanda_id uuid not null references public.restaurant_tabs(id) on delete cascade,
  produto_id uuid,
  nome_produto text not null,
  categoria text,
  setor_producao text not null default 'balcao' check (setor_producao in ('cozinha','bar','balcao','nenhum')),
  quantidade numeric(12,3) not null default 1,
  valor_unitario numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  observacao text,
  status text not null default 'pendente' check (status in ('pendente','enviado','preparando','pronto','entregue','cancelado')),
  enviado_at timestamptz,
  cancelado_at timestamptz,
  cancelado_motivo text,
  estoque_baixado boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.restaurant_orders (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  comanda_id uuid not null references public.restaurant_tabs(id) on delete cascade,
  mesa_id uuid references public.restaurant_tables(id) on delete set null,
  setor text not null default 'cozinha' check (setor in ('cozinha','bar')),
  status text not null default 'novo' check (status in ('novo','em_preparo','pronto','retirado','cancelado')),
  started_at timestamptz,
  ready_at timestamptz,
  delivered_at timestamptz,
  operador_preparo_id uuid references auth.users(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.restaurant_order_items (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  order_id uuid not null references public.restaurant_orders(id) on delete cascade,
  tab_item_id uuid not null references public.restaurant_tab_items(id) on delete cascade,
  nome_produto text not null,
  quantidade numeric(12,3) default 1,
  observacao text,
  status text default 'novo',
  created_at timestamptz default now()
);

create table if not exists public.restaurant_cash_sessions (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  operador_id uuid references auth.users(id) on delete set null,
  status text not null default 'aberto' check (status in ('aberto','fechado','divergente','conferido')),
  valor_abertura numeric(12,2) default 0,
  valor_fechamento numeric(12,2),
  valor_esperado_dinheiro numeric(12,2),
  diferenca numeric(12,2),
  observacao text,
  opened_at timestamptz default now(),
  closed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.restaurant_tab_payments (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  comanda_id uuid not null references public.restaurant_tabs(id) on delete cascade,
  caixa_id uuid not null references public.restaurant_cash_sessions(id) on delete restrict,
  forma_pagamento text not null,
  valor numeric(12,2) default 0,
  valor_recebido numeric(12,2),
  troco numeric(12,2) default 0,
  created_at timestamptz default now()
);

create table if not exists public.restaurant_cash_movements (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  caixa_id uuid not null references public.restaurant_cash_sessions(id) on delete cascade,
  tipo text not null check (tipo in ('venda','sangria','reforco','ajuste')),
  forma_pagamento text,
  valor numeric(12,2) default 0,
  descricao text,
  comanda_id uuid references public.restaurant_tabs(id) on delete set null,
  created_at timestamptz default now()
);

create table if not exists public.restaurant_notifications (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  target_sector text,
  target_user_id uuid references auth.users(id) on delete cascade,
  title text not null,
  message text not null,
  type text default 'info',
  entity_type text,
  entity_id uuid,
  read_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists public.restaurant_print_jobs (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  tipo text not null,
  entity_id uuid,
  conteudo jsonb default '{}'::jsonb,
  printed_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists public.restaurant_service_settings (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade unique,
  taxa_servico_percent numeric(6,2) default 10,
  cobrar_taxa_servico boolean default false,
  permitir_desconto_atendimento boolean default false,
  exigir_caixa_aberto boolean default true,
  imprimir_automatico_cozinha boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_restaurant_tables_empresa_status on public.restaurant_tables(empresa_id, status);
create index if not exists idx_restaurant_tabs_empresa_status on public.restaurant_tabs(empresa_id, status, created_at desc);
create index if not exists idx_restaurant_tab_items_empresa_comanda on public.restaurant_tab_items(empresa_id, comanda_id, status);
create index if not exists idx_restaurant_orders_empresa_status on public.restaurant_orders(empresa_id, status, created_at);
create index if not exists idx_restaurant_order_items_order on public.restaurant_order_items(order_id);
create index if not exists idx_restaurant_cash_sessions_empresa_status on public.restaurant_cash_sessions(empresa_id, status, opened_at desc);
create index if not exists idx_restaurant_cash_movements_empresa_caixa on public.restaurant_cash_movements(empresa_id, caixa_id, created_at desc);
create index if not exists idx_restaurant_notifications_target on public.restaurant_notifications(empresa_id, target_sector, read_at, created_at desc);

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
begin
  select empresa_id, coalesce(desconto,0) into v_empresa, v_desconto from public.restaurant_tabs where id = p_comanda_id;
  select coalesce(sum(total),0) into v_subtotal from public.restaurant_tab_items where comanda_id = p_comanda_id and status <> 'cancelado';
  select case when coalesce(rss.cobrar_taxa_servico,false) then round(v_subtotal * coalesce(rss.taxa_servico_percent,0) / 100, 2) else 0 end
    into v_taxa
  from public.restaurant_service_settings rss
  where rss.empresa_id = v_empresa;
  v_taxa := coalesce(v_taxa,0);
  v_total := greatest(0, v_subtotal + v_taxa - coalesce(v_desconto,0));
  update public.restaurant_tabs set subtotal = v_subtotal, taxa_servico = v_taxa, total = v_total, updated_at = now() where id = p_comanda_id;
end $$;

alter table public.restaurant_tables enable row level security;
alter table public.restaurant_tabs enable row level security;
alter table public.restaurant_tab_items enable row level security;
alter table public.restaurant_orders enable row level security;
alter table public.restaurant_order_items enable row level security;
alter table public.restaurant_cash_sessions enable row level security;
alter table public.restaurant_tab_payments enable row level security;
alter table public.restaurant_cash_movements enable row level security;
alter table public.restaurant_notifications enable row level security;
alter table public.restaurant_print_jobs enable row level security;
alter table public.restaurant_service_settings enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array[
    'restaurant_tables','restaurant_tabs','restaurant_tab_items','restaurant_orders','restaurant_order_items','restaurant_cash_sessions','restaurant_tab_payments','restaurant_cash_movements','restaurant_notifications','restaurant_print_jobs','restaurant_service_settings'
  ] loop
    execute format('drop policy if exists %I on public.%I', t || '_tenant_select', t);
    execute format('drop policy if exists %I on public.%I', t || '_tenant_insert', t);
    execute format('drop policy if exists %I on public.%I', t || '_tenant_update', t);
    execute format('drop policy if exists %I on public.%I', t || '_tenant_delete', t);
    execute format('create policy %I on public.%I for select using (empresa_id in (select empresa_id from public.perfis where id = auth.uid()) or exists (select 1 from public.master_admins where user_id = auth.uid() and coalesce(ativo,true)))', t || '_tenant_select', t);
    execute format('create policy %I on public.%I for insert with check (empresa_id in (select empresa_id from public.perfis where id = auth.uid()) or exists (select 1 from public.master_admins where user_id = auth.uid() and coalesce(ativo,true)))', t || '_tenant_insert', t);
    execute format('create policy %I on public.%I for update using (empresa_id in (select empresa_id from public.perfis where id = auth.uid()) or exists (select 1 from public.master_admins where user_id = auth.uid() and coalesce(ativo,true))) with check (empresa_id in (select empresa_id from public.perfis where id = auth.uid()) or exists (select 1 from public.master_admins where user_id = auth.uid() and coalesce(ativo,true)))', t || '_tenant_update', t);
    execute format('create policy %I on public.%I for delete using (empresa_id in (select empresa_id from public.perfis where id = auth.uid()) or exists (select 1 from public.master_admins where user_id = auth.uid() and coalesce(ativo,true)))', t || '_tenant_delete', t);
  end loop;
end $$;
