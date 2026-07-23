-- VF Nexus V9.4
-- Correção do erro 42P01:
-- relation "public.whatsapp_messages" does not exist
--
-- Execute este patch ANTES de executar novamente a migration 048 corrigida.
-- É idempotente: pode ser executado mais de uma vez.

begin;

create extension if not exists pgcrypto;

create table if not exists public.whatsapp_messages (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  usuario_id uuid references auth.users(id) on delete set null,

  provider text not null default 'fallback',
  telefone text not null,
  tipo text not null default 'texto',
  entidade text,
  entidade_id uuid,

  mensagem text,
  arquivo_url text,
  arquivo_nome text,

  status text not null default 'pendente',
  provider_message_id text,
  idempotency_key text,

  tentativas integer not null default 0,
  consentimento boolean not null default false,

  processando_em timestamptz,
  enviado_em timestamptz,
  entregue_em timestamptz,
  lido_em timestamptz,

  ultimo_erro text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Compatibilidade com bancos em que a tabela já exista parcialmente.
alter table public.whatsapp_messages
  add column if not exists empresa_id uuid,
  add column if not exists usuario_id uuid,
  add column if not exists provider text default 'fallback',
  add column if not exists telefone text,
  add column if not exists tipo text default 'texto',
  add column if not exists entidade text,
  add column if not exists entidade_id uuid,
  add column if not exists mensagem text,
  add column if not exists arquivo_url text,
  add column if not exists arquivo_nome text,
  add column if not exists status text default 'pendente',
  add column if not exists provider_message_id text,
  add column if not exists idempotency_key text,
  add column if not exists tentativas integer default 0,
  add column if not exists consentimento boolean default false,
  add column if not exists processando_em timestamptz,
  add column if not exists enviado_em timestamptz,
  add column if not exists entregue_em timestamptz,
  add column if not exists lido_em timestamptz,
  add column if not exists ultimo_erro text,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

-- Defaults seguros para registros legados.
update public.whatsapp_messages
set
  provider = coalesce(provider, 'fallback'),
  tipo = coalesce(tipo, 'texto'),
  status = coalesce(status, 'pendente'),
  tentativas = coalesce(tentativas, 0),
  consentimento = coalesce(consentimento, false),
  created_at = coalesce(created_at, now()),
  updated_at = coalesce(updated_at, now())
where
  provider is null
  or tipo is null
  or status is null
  or tentativas is null
  or consentimento is null
  or created_at is null
  or updated_at is null;

create index if not exists whatsapp_messages_empresa_status_idx
  on public.whatsapp_messages (empresa_id, status, created_at desc);

create index if not exists whatsapp_messages_empresa_entidade_idx
  on public.whatsapp_messages (empresa_id, entidade, entidade_id);

create index if not exists whatsapp_messages_provider_message_idx
  on public.whatsapp_messages (provider, provider_message_id)
  where provider_message_id is not null;

create unique index if not exists whatsapp_messages_idempotency_unique
  on public.whatsapp_messages (empresa_id, idempotency_key)
  where idempotency_key is not null;

alter table public.whatsapp_messages enable row level security;

grant select, insert, update, delete
on public.whatsapp_messages
to authenticated;

-- Policies são criadas somente se os helpers V9.4 já existirem.
-- A migration 048 também aplicará a policy restritiva geral depois.
do $policies$
begin
  if to_regprocedure('public.vf_effective_empresa_id()') is not null then
    execute 'drop policy if exists vf_v94_whatsapp_messages_select on public.whatsapp_messages';
    execute 'drop policy if exists vf_v94_whatsapp_messages_insert on public.whatsapp_messages';
    execute 'drop policy if exists vf_v94_whatsapp_messages_update on public.whatsapp_messages';
    execute 'drop policy if exists vf_v94_whatsapp_messages_delete on public.whatsapp_messages';

    execute $sql$
      create policy vf_v94_whatsapp_messages_select
      on public.whatsapp_messages
      for select
      to authenticated
      using (
        empresa_id is not null
        and empresa_id = public.vf_effective_empresa_id()
      )
    $sql$;

    execute $sql$
      create policy vf_v94_whatsapp_messages_insert
      on public.whatsapp_messages
      for insert
      to authenticated
      with check (
        empresa_id is not null
        and empresa_id = public.vf_effective_empresa_id()
      )
    $sql$;

    execute $sql$
      create policy vf_v94_whatsapp_messages_update
      on public.whatsapp_messages
      for update
      to authenticated
      using (
        empresa_id is not null
        and empresa_id = public.vf_effective_empresa_id()
      )
      with check (
        empresa_id is not null
        and empresa_id = public.vf_effective_empresa_id()
      )
    $sql$;

    execute $sql$
      create policy vf_v94_whatsapp_messages_delete
      on public.whatsapp_messages
      for delete
      to authenticated
      using (
        empresa_id is not null
        and empresa_id = public.vf_effective_empresa_id()
      )
    $sql$;
  end if;
end;
$policies$;

commit;

-- Verificação final.
select
  to_regclass('public.whatsapp_messages') as tabela_criada,
  count(*) as total_registros
from public.whatsapp_messages;

select
  column_name,
  data_type,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'whatsapp_messages'
order by ordinal_position;