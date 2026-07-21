-- VF Nexus Entregas — módulo multiempresa de entregas e portal do entregador
-- Execute após a migration 027. Idempotente e compatível com o padrão empresa_id do VF Nexus.

create extension if not exists pgcrypto;

-- Perfil driver/entregador no cadastro existente
alter table if exists public.perfis
  add column if not exists email text,
  add column if not exists telefone text,
  add column if not exists cargo text,
  add column if not exists permissoes text[] default array[]::text[],
  add column if not exists bloqueado boolean not null default false,
  add column if not exists ultimo_login timestamptz;

-- Empresas com código/matrícula, caso ainda não exista
alter table if exists public.empresas
  add column if not exists codigo_empresa text,
  add column if not exists matricula_empresa text,
  add column if not exists nome_fantasia text,
  add column if not exists razao_social text,
  add column if not exists responsavel text,
  add column if not exists status text not null default 'ativa';

create unique index if not exists idx_empresas_codigo_empresa_unique on public.empresas(lower(codigo_empresa)) where codigo_empresa is not null;
create unique index if not exists idx_empresas_matricula_empresa_unique on public.empresas(lower(matricula_empresa)) where matricula_empresa is not null;

create table if not exists public.delivery_drivers (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  profile_id uuid references public.perfis(id) on delete set null,
  name text not null,
  phone text,
  email text,
  document text,
  pix_key text,
  vehicle_type text not null default 'moto',
  vehicle_plate text,
  base_delivery_fee numeric(12,2) not null default 0,
  status text not null default 'ativo',
  observations text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint delivery_drivers_status_chk check (status in ('ativo','inativo','bloqueado'))
);

create table if not exists public.deliveries (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  order_id uuid,
  code text not null default ('ENT-' || upper(substr(gen_random_uuid()::text,1,8))),
  customer_name text not null,
  customer_phone text,
  order_type text not null default 'outro',
  order_description text,
  pickup_address text,
  delivery_address text not null,
  delivery_neighborhood text,
  delivery_city text,
  delivery_state text,
  delivery_complement text,
  delivery_reference text,
  delivery_lat numeric(11,8),
  delivery_lng numeric(11,8),
  delivery_fee numeric(12,2) not null default 0,
  priority text not null default 'normal',
  status text not null default 'offered',
  assigned_driver_id uuid references public.delivery_drivers(id) on delete set null,
  created_by uuid,
  accepted_at timestamptz,
  picked_up_at timestamptz,
  on_route_at timestamptz,
  delivered_at_reported timestamptz,
  synced_at timestamptz,
  canceled_at timestamptz,
  failed_at timestamptz,
  failure_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint deliveries_status_chk check (status in ('pending','offered','accepted','picked_up','on_route','delivered','canceled','failed','sync_pending')),
  constraint deliveries_priority_chk check (priority in ('normal','urgente'))
);

create table if not exists public.delivery_offers (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  delivery_id uuid not null references public.deliveries(id) on delete cascade,
  driver_id uuid references public.delivery_drivers(id) on delete cascade,
  status text not null default 'sent',
  sent_at timestamptz not null default now(),
  viewed_at timestamptz,
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  constraint delivery_offers_status_chk check (status in ('sent','viewed','accepted','rejected','expired'))
);

create table if not exists public.delivery_status_history (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  delivery_id uuid not null references public.deliveries(id) on delete cascade,
  driver_id uuid references public.delivery_drivers(id) on delete set null,
  old_status text,
  new_status text not null,
  changed_by uuid,
  change_source text not null default 'web',
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.delivery_earnings (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  driver_id uuid not null references public.delivery_drivers(id) on delete cascade,
  delivery_id uuid not null references public.deliveries(id) on delete cascade,
  amount numeric(12,2) not null default 0,
  earning_date date not null default current_date,
  status text not null default 'pending',
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  constraint delivery_earnings_status_chk check (status in ('pending','approved','paid','canceled')),
  unique (empresa_id, delivery_id)
);

create table if not exists public.delivery_receipts (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  driver_id uuid not null references public.delivery_drivers(id) on delete cascade,
  period_type text not null default 'periodo',
  period_start date not null,
  period_end date not null,
  total_deliveries integer not null default 0,
  total_amount numeric(12,2) not null default 0,
  pdf_url text,
  signed_at timestamptz,
  signature_url text,
  status text not null default 'generated',
  created_by uuid,
  created_at timestamptz not null default now(),
  constraint delivery_receipts_status_chk check (status in ('generated','signed','paid','canceled'))
);

create table if not exists public.delivery_sync_queue (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  driver_id uuid not null references public.delivery_drivers(id) on delete cascade,
  delivery_id uuid not null references public.deliveries(id) on delete cascade,
  action_type text not null,
  payload jsonb not null default '{}'::jsonb,
  local_created_at timestamptz not null,
  synced_at timestamptz,
  sync_status text not null default 'pending',
  error_message text,
  created_at timestamptz not null default now(),
  constraint delivery_sync_queue_status_chk check (sync_status in ('pending','synced','failed'))
);

create table if not exists public.delivery_driver_devices (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  driver_id uuid references public.delivery_drivers(id) on delete cascade,
  profile_id uuid references public.perfis(id) on delete cascade,
  fcm_token text,
  platform text,
  device_name text,
  notifications_enabled boolean not null default true,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  unique (empresa_id, profile_id, fcm_token)
);

-- Funções de segurança auxiliares sem depender de policies do front-end
create or replace function public.vf_delivery_current_driver_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select dd.id
  from public.delivery_drivers dd
  where dd.profile_id = auth.uid()
     or lower(dd.email) = lower(coalesce((select email from public.perfis where id = auth.uid()), ''))
  order by dd.created_at desc
  limit 1
$$;

create or replace function public.vf_delivery_is_driver()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.perfis p
    where p.id = auth.uid()
      and lower(coalesce(p.cargo,'')) in ('driver','entregador')
  ) or public.vf_delivery_current_driver_id() is not null
$$;

create or replace function public.vf_delivery_can_manage_company(p_empresa_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.is_super_admin(), false)
     or exists (
       select 1 from public.perfis p
       where p.id = auth.uid()
         and p.empresa_id = p_empresa_id
         and lower(coalesce(p.cargo,'')) in ('dono','administrador','empresa_admin','gerente','financeiro','operacional')
     )
$$;

create or replace function public.vf_delivery_finish(
  p_delivery_id uuid,
  p_reported_at timestamptz,
  p_source text default 'portal_entregador',
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_driver uuid := public.vf_delivery_current_driver_id();
  v_delivery public.deliveries%rowtype;
  v_old text;
  v_amount numeric(12,2);
begin
  if v_driver is null then
    raise exception 'Entregador não encontrado para este usuário.';
  end if;

  select * into v_delivery
  from public.deliveries
  where id = p_delivery_id
    and assigned_driver_id = v_driver
    and status in ('accepted','picked_up','on_route','sync_pending')
  for update;

  if not found then
    raise exception 'Entrega não encontrada ou não pertence ao entregador logado.';
  end if;

  v_old := v_delivery.status;
  v_amount := coalesce(nullif(v_delivery.delivery_fee,0), (select base_delivery_fee from public.delivery_drivers where id = v_driver), 0);

  update public.deliveries
     set status = 'delivered',
         delivered_at_reported = coalesce(p_reported_at, now()),
         synced_at = now(),
         updated_at = now()
   where id = p_delivery_id;

  insert into public.delivery_status_history (empresa_id, delivery_id, driver_id, old_status, new_status, changed_by, change_source, notes)
  values (v_delivery.empresa_id, p_delivery_id, v_driver, v_old, 'delivered', auth.uid(), p_source, p_notes);

  insert into public.delivery_earnings (empresa_id, driver_id, delivery_id, amount, earning_date, status)
  values (v_delivery.empresa_id, v_driver, p_delivery_id, v_amount, coalesce(p_reported_at::date, current_date), 'approved')
  on conflict (empresa_id, delivery_id) do update
    set amount = excluded.amount,
        earning_date = excluded.earning_date,
        status = case when public.delivery_earnings.status = 'paid' then 'paid' else 'approved' end;

  return jsonb_build_object('id', p_delivery_id, 'status', 'delivered', 'driver_id', v_driver, 'amount', v_amount, 'reported_at', p_reported_at, 'synced_at', now());
end;
$$;

create or replace function public.vf_delivery_accept(p_delivery_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_driver uuid := public.vf_delivery_current_driver_id();
  v_delivery public.deliveries%rowtype;
begin
  if v_driver is null then
    raise exception 'Entregador não encontrado para este usuário.';
  end if;

  select * into v_delivery
  from public.deliveries
  where id = p_delivery_id
    and status in ('pending','offered')
    and (assigned_driver_id is null or assigned_driver_id = v_driver)
    and empresa_id = (select empresa_id from public.delivery_drivers where id = v_driver)
  for update;

  if not found then
    raise exception 'Entrega indisponível ou já aceita por outro entregador.';
  end if;

  update public.deliveries
     set assigned_driver_id = v_driver,
         status = 'accepted',
         accepted_at = now(),
         updated_at = now()
   where id = p_delivery_id;

  update public.delivery_offers
     set status = case when driver_id = v_driver or driver_id is null then 'accepted' else 'expired' end,
         responded_at = now()
   where delivery_id = p_delivery_id;

  insert into public.delivery_status_history (empresa_id, delivery_id, driver_id, old_status, new_status, changed_by, change_source, notes)
  values (v_delivery.empresa_id, p_delivery_id, v_driver, v_delivery.status, 'accepted', auth.uid(), 'portal_entregador', 'Entrega aceita pelo portal do entregador.');

  return jsonb_build_object('id', p_delivery_id, 'status', 'accepted', 'driver_id', v_driver);
end;
$$;

-- Índices
create index if not exists idx_delivery_drivers_empresa_status on public.delivery_drivers(empresa_id, status);
create index if not exists idx_delivery_drivers_profile on public.delivery_drivers(profile_id);
create index if not exists idx_deliveries_empresa_status on public.deliveries(empresa_id, status, created_at desc);
create index if not exists idx_deliveries_driver_status on public.deliveries(assigned_driver_id, status, created_at desc);
create index if not exists idx_delivery_offers_driver_status on public.delivery_offers(driver_id, status, sent_at desc);
create index if not exists idx_delivery_history_delivery on public.delivery_status_history(delivery_id, created_at desc);
create index if not exists idx_delivery_earnings_driver_date on public.delivery_earnings(driver_id, earning_date desc);
create index if not exists idx_delivery_receipts_driver_period on public.delivery_receipts(driver_id, period_start, period_end);
create index if not exists idx_delivery_sync_pending on public.delivery_sync_queue(driver_id, sync_status, created_at);

-- RLS
alter table public.delivery_drivers enable row level security;
alter table public.deliveries enable row level security;
alter table public.delivery_offers enable row level security;
alter table public.delivery_status_history enable row level security;
alter table public.delivery_earnings enable row level security;
alter table public.delivery_receipts enable row level security;
alter table public.delivery_sync_queue enable row level security;
alter table public.delivery_driver_devices enable row level security;

do $$ begin
  create policy delivery_drivers_select_tenant on public.delivery_drivers for select using (
    public.vf_delivery_can_manage_company(empresa_id) or profile_id = auth.uid() or id = public.vf_delivery_current_driver_id()
  );
exception when duplicate_object then null; end $$;
do $$ begin
  create policy delivery_drivers_write_manage on public.delivery_drivers for all using (public.vf_delivery_can_manage_company(empresa_id)) with check (public.vf_delivery_can_manage_company(empresa_id));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy deliveries_select_tenant_or_driver on public.deliveries for select using (
    public.vf_delivery_can_manage_company(empresa_id)
    or (public.vf_delivery_is_driver() and empresa_id = public.current_empresa_id() and (assigned_driver_id = public.vf_delivery_current_driver_id() or (assigned_driver_id is null and status in ('pending','offered'))))
  );
exception when duplicate_object then null; end $$;
do $$ begin
  create policy deliveries_insert_manage on public.deliveries for insert with check (public.vf_delivery_can_manage_company(empresa_id));
exception when duplicate_object then null; end $$;
do $$ begin
  create policy deliveries_update_manage_or_driver on public.deliveries for update using (
    public.vf_delivery_can_manage_company(empresa_id) or assigned_driver_id = public.vf_delivery_current_driver_id()
  ) with check (
    public.vf_delivery_can_manage_company(empresa_id) or assigned_driver_id = public.vf_delivery_current_driver_id()
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy delivery_offers_tenant on public.delivery_offers for select using (public.vf_delivery_can_manage_company(empresa_id) or driver_id = public.vf_delivery_current_driver_id() or driver_id is null);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy delivery_offers_write_manage on public.delivery_offers for all using (public.vf_delivery_can_manage_company(empresa_id)) with check (public.vf_delivery_can_manage_company(empresa_id));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy delivery_history_tenant on public.delivery_status_history for select using (public.vf_delivery_can_manage_company(empresa_id) or driver_id = public.vf_delivery_current_driver_id());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy delivery_history_insert_tenant on public.delivery_status_history for insert with check (public.vf_delivery_can_manage_company(empresa_id) or driver_id = public.vf_delivery_current_driver_id());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy delivery_earnings_tenant on public.delivery_earnings for select using (public.vf_delivery_can_manage_company(empresa_id) or driver_id = public.vf_delivery_current_driver_id());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy delivery_earnings_write_manage on public.delivery_earnings for all using (public.vf_delivery_can_manage_company(empresa_id)) with check (public.vf_delivery_can_manage_company(empresa_id));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy delivery_receipts_tenant on public.delivery_receipts for select using (public.vf_delivery_can_manage_company(empresa_id) or driver_id = public.vf_delivery_current_driver_id());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy delivery_receipts_write_manage on public.delivery_receipts for all using (public.vf_delivery_can_manage_company(empresa_id)) with check (public.vf_delivery_can_manage_company(empresa_id));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy delivery_sync_queue_driver on public.delivery_sync_queue for select using (public.vf_delivery_can_manage_company(empresa_id) or driver_id = public.vf_delivery_current_driver_id());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy delivery_sync_queue_write_driver on public.delivery_sync_queue for all using (public.vf_delivery_can_manage_company(empresa_id) or driver_id = public.vf_delivery_current_driver_id()) with check (public.vf_delivery_can_manage_company(empresa_id) or driver_id = public.vf_delivery_current_driver_id());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy delivery_driver_devices_tenant on public.delivery_driver_devices for all using (public.vf_delivery_can_manage_company(empresa_id) or profile_id = auth.uid() or driver_id = public.vf_delivery_current_driver_id()) with check (public.vf_delivery_can_manage_company(empresa_id) or profile_id = auth.uid() or driver_id = public.vf_delivery_current_driver_id());
exception when duplicate_object then null; end $$;
