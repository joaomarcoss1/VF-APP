create table if not exists public.whatsapp_messages (
 id uuid primary key default gen_random_uuid(), empresa_id uuid not null references public.empresas(id) on delete cascade,
 provider text not null default 'fallback', telefone text not null, tipo text not null default 'texto', entidade text, entidade_id uuid,
 mensagem text not null, arquivo_url text, status text not null default 'pendente' check(status in('pendente','processando','enviado','entregue','lido','falhou','cancelado')),
 provider_message_id text, tentativas integer not null default 0, ultimo_erro text, enviado_em timestamptz, entregue_em timestamptz, lido_em timestamptz,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create index if not exists whatsapp_messages_empresa_status_idx on public.whatsapp_messages(empresa_id,status,created_at desc);
alter table public.whatsapp_messages enable row level security;
drop policy if exists vf_tenant_select_whatsapp_messages on public.whatsapp_messages;
create policy vf_tenant_select_whatsapp_messages on public.whatsapp_messages for select using(public.vf_is_master() or public.vf_same_empresa(empresa_id));
drop policy if exists vf_tenant_write_whatsapp_messages on public.whatsapp_messages;
create policy vf_tenant_write_whatsapp_messages on public.whatsapp_messages for all using(public.vf_is_master() or public.vf_same_empresa(empresa_id)) with check(public.vf_is_master() or public.vf_same_empresa(empresa_id));
