-- VF Nexus V6 — Reservas e Adiantamentos por ramo
create extension if not exists pgcrypto;

alter table if exists public.empresas
  add column if not exists ramo_atividade text,
  add column if not exists codigo_empresa text,
  add column if not exists matricula_empresa text,
  add column if not exists modulos_configurados jsonb default '{}'::jsonb,
  add column if not exists updated_at timestamptz default now();

create table if not exists public.reservation_deposits (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  ramo_atividade text,
  tipo text,
  codigo text,
  cliente_id uuid null,
  cliente_nome text not null,
  cliente_telefone text,
  cliente_email text,
  titulo text not null,
  descricao text,
  produto_id uuid null,
  servico_id uuid null,
  mesa_id uuid null,
  responsavel_id uuid null,
  data_reservada date,
  hora_reservada time,
  valor_total numeric(12,2) not null default 0,
  valor_entrada numeric(12,2) not null default 0,
  valor_restante numeric(12,2) not null default 0,
  forma_pagamento text,
  pix_chave text,
  pix_nome_recebedor text,
  pix_banco text,
  status_pagamento text default 'aguardando_pagamento',
  status_reserva text default 'aguardando_pagamento',
  confirmado_por uuid null,
  confirmado_em timestamptz null,
  cancelado_por uuid null,
  cancelado_em timestamptz null,
  motivo_cancelamento text,
  recibo_emitido_em timestamptz,
  observacao text,
  recibo_custom jsonb default '{}'::jsonb,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint reservation_deposits_valores_chk check (valor_total >= 0 and valor_entrada >= 0 and valor_restante >= 0 and valor_entrada <= valor_total)
);

alter table if exists public.reservation_deposits
  add column if not exists cliente_email text,
  add column if not exists recibo_custom jsonb default '{}'::jsonb;

create table if not exists public.reservation_deposit_notifications (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  reservation_id uuid not null references public.reservation_deposits(id) on delete cascade,
  tipo text not null,
  titulo text not null,
  mensagem text not null,
  target_user_id uuid null,
  target_setor text null,
  notificar_em timestamptz,
  lida_em timestamptz,
  created_at timestamptz default now()
);

create index if not exists reservation_deposits_empresa_idx on public.reservation_deposits(empresa_id);
create index if not exists reservation_deposits_empresa_status_pagamento_idx on public.reservation_deposits(empresa_id, status_pagamento);
create index if not exists reservation_deposits_empresa_status_reserva_idx on public.reservation_deposits(empresa_id, status_reserva);
create index if not exists reservation_deposits_empresa_data_idx on public.reservation_deposits(empresa_id, data_reservada);
create index if not exists reservation_deposits_empresa_codigo_idx on public.reservation_deposits(empresa_id, codigo);
create index if not exists reservation_deposit_notifications_empresa_lida_idx on public.reservation_deposit_notifications(empresa_id, lida_em);
create index if not exists reservation_deposit_notifications_empresa_notificar_idx on public.reservation_deposit_notifications(empresa_id, notificar_em);

alter table if exists public.empresa_modulos
  add column if not exists modulo_codigo text,
  add column if not exists ativo boolean default true,
  add column if not exists liberado_por_master boolean default false,
  add column if not exists ramo_origem text,
  add column if not exists updated_at timestamptz default now();

-- Compatibilidade V9: bancos antigos podem ter coluna modulo NOT NULL.
do $$
declare
  tem_coluna_modulo boolean;
begin
  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'empresa_modulos'
      and column_name = 'modulo'
  ) into tem_coluna_modulo;

  if tem_coluna_modulo then
    update public.empresa_modulos
    set modulo_codigo = coalesce(nullif(modulo_codigo, ''), modulo)
    where modulo_codigo is null or modulo_codigo = '';

    insert into public.empresa_modulos (empresa_id, modulo, modulo_codigo, ramo_origem, ativo, liberado_por_master, created_at, updated_at)
    select e.id, 'reservas_adiantamentos', 'reservas_adiantamentos', coalesce(e.ramo_atividade, e.tipo, 'autonomo'), true, false, now(), now()
    from public.empresas e
    where not exists (
      select 1 from public.empresa_modulos em
      where em.empresa_id = e.id
        and (em.modulo_codigo = 'reservas_adiantamentos' or em.modulo = 'reservas_adiantamentos')
    );
  else
    insert into public.empresa_modulos (empresa_id, modulo_codigo, ramo_origem, ativo, liberado_por_master, created_at, updated_at)
    select e.id, 'reservas_adiantamentos', coalesce(e.ramo_atividade, e.tipo, 'autonomo'), true, false, now(), now()
    from public.empresas e
    where not exists (
      select 1 from public.empresa_modulos em
      where em.empresa_id = e.id and em.modulo_codigo = 'reservas_adiantamentos'
    );
  end if;
end $$;

drop function if exists public.vf_next_reservation_code(uuid, text);
create function public.vf_next_reservation_code(p_empresa_id uuid, p_tipo text default 'RES')
returns text
language plpgsql
security definer
as $$
declare
  prefix text := case
    when upper(coalesce(p_tipo,'')) like 'AGE%' then 'AGE'
    when upper(coalesce(p_tipo,'')) like 'ENT%' then 'ENT'
    else 'RES'
  end;
  seq int;
begin
  select count(*) + 1 into seq
  from public.reservation_deposits
  where empresa_id = p_empresa_id;
  return prefix || '-' || lpad(seq::text, 6, '0');
end;
$$;

drop trigger if exists trg_reservation_deposits_calc on public.reservation_deposits;
drop function if exists public.vf_reservation_deposits_calc();
create function public.vf_reservation_deposits_calc()
returns trigger
language plpgsql
as $$
begin
  new.valor_total := coalesce(new.valor_total, 0);
  new.valor_entrada := coalesce(new.valor_entrada, 0);
  if new.valor_entrada > new.valor_total then
    raise exception 'O valor de entrada não pode ser maior que o valor total.';
  end if;
  new.valor_restante := greatest(0, new.valor_total - new.valor_entrada);
  new.updated_at := now();
  if new.codigo is null or new.codigo = '' then
    new.codigo := public.vf_next_reservation_code(new.empresa_id, coalesce(new.tipo, 'RES'));
  end if;
  return new;
end;
$$;
create trigger trg_reservation_deposits_calc
before insert or update on public.reservation_deposits
for each row execute function public.vf_reservation_deposits_calc();

alter table public.reservation_deposits enable row level security;
alter table public.reservation_deposit_notifications enable row level security;

drop policy if exists reservation_deposits_empresa_select on public.reservation_deposits;
create policy reservation_deposits_empresa_select on public.reservation_deposits for select using (
  exists (select 1 from public.usuarios_empresas ue where ue.empresa_id = reservation_deposits.empresa_id and (ue.profile_id = auth.uid() or ue.usuario_id = auth.uid()) and coalesce(ue.status,'ativo') = 'ativo')
  or exists (select 1 from public.perfis p where p.id = auth.uid() and (p.is_master = true or p.cargo in ('master_admin','super_admin')))
);

drop policy if exists reservation_deposits_empresa_write on public.reservation_deposits;
create policy reservation_deposits_empresa_write on public.reservation_deposits for all using (
  exists (select 1 from public.usuarios_empresas ue where ue.empresa_id = reservation_deposits.empresa_id and (ue.profile_id = auth.uid() or ue.usuario_id = auth.uid()) and coalesce(ue.status,'ativo') = 'ativo')
  or exists (select 1 from public.perfis p where p.id = auth.uid() and (p.is_master = true or p.cargo in ('master_admin','super_admin')))
) with check (
  exists (select 1 from public.usuarios_empresas ue where ue.empresa_id = reservation_deposits.empresa_id and (ue.profile_id = auth.uid() or ue.usuario_id = auth.uid()) and coalesce(ue.status,'ativo') = 'ativo')
  or exists (select 1 from public.perfis p where p.id = auth.uid() and (p.is_master = true or p.cargo in ('master_admin','super_admin')))
);

drop policy if exists reservation_notifications_empresa_all on public.reservation_deposit_notifications;
create policy reservation_notifications_empresa_all on public.reservation_deposit_notifications for all using (
  exists (select 1 from public.usuarios_empresas ue where ue.empresa_id = reservation_deposit_notifications.empresa_id and (ue.profile_id = auth.uid() or ue.usuario_id = auth.uid()) and coalesce(ue.status,'ativo') = 'ativo')
  or exists (select 1 from public.perfis p where p.id = auth.uid() and (p.is_master = true or p.cargo in ('master_admin','super_admin')))
) with check (
  exists (select 1 from public.usuarios_empresas ue where ue.empresa_id = reservation_deposit_notifications.empresa_id and (ue.profile_id = auth.uid() or ue.usuario_id = auth.uid()) and coalesce(ue.status,'ativo') = 'ativo')
  or exists (select 1 from public.perfis p where p.id = auth.uid() and (p.is_master = true or p.cargo in ('master_admin','super_admin')))
);
