-- VF Nexus V14 Comercial — mobile app, catálogo público, SaaS comercial e segurança estrutural
-- Execute após as migrations anteriores. Idempotente.

create extension if not exists pgcrypto;

alter table public.empresas
  add column if not exists ramo_comercial text default 'personalizado',
  add column if not exists onboarding_percentual integer default 0,
  add column if not exists catalogo_publico_padrao text,
  add column if not exists whatsapp_comercial text;

create table if not exists public.catalogos_publicos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  cardapio_id uuid not null references public.cardapios(id) on delete cascade,
  slug text not null unique,
  titulo text not null,
  descricao text,
  whatsapp text,
  ativo boolean not null default true,
  visitas integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (empresa_id, cardapio_id)
);

create table if not exists public.importacoes_dados (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid references public.empresas(id) on delete cascade,
  usuario_id uuid,
  tipo text not null,
  arquivo_url text,
  total_linhas integer default 0,
  linhas_validas integer default 0,
  linhas_com_erro integer default 0,
  status text not null default 'validada',
  erros jsonb not null default '[]'::jsonb,
  resumo jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

create table if not exists public.planos_saas (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  nome text not null,
  preco_mensal numeric(12,2) not null default 0,
  limite_produtos integer,
  limite_usuarios integer,
  limite_vendas_mes integer,
  limite_agendamentos_mes integer,
  limite_ia_dia integer,
  modulos text[] not null default array[]::text[],
  recursos jsonb not null default '{}'::jsonb,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.planos_saas (codigo,nome,preco_mensal,limite_produtos,limite_usuarios,limite_vendas_mes,modulos,recursos)
values
  ('basico','Básico',49.90,100,2,500,array['dashboard','produtos','vendas','clientes','financeiro','relatorios'], '{"catalogo_publico":true,"suporte":"padrao"}'::jsonb),
  ('pro','Pro',99.90,500,6,3000,array['dashboard','pdv','produtos','vendas','clientes','estoque','financeiro','relatorios','cardapio','catalogo_publico','importacao'], '{"catalogo_publico":true,"qrcode":true,"relatorios_avancados":true}'::jsonb),
  ('premium','Premium',179.90,2000,15,10000,array['todos'], '{"catalogo_publico":true,"qrcode":true,"integracoes":true,"suporte":"prioritario"}'::jsonb),
  ('enterprise','Enterprise',0,null,null,null,array['todos'], '{"custom":true,"suporte":"dedicado"}'::jsonb)
on conflict (codigo) do update set nome=excluded.nome, preco_mensal=excluded.preco_mensal, modulos=excluded.modulos, recursos=excluded.recursos, ativo=true;

create table if not exists public.assinaturas_saas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  plano_id uuid references public.planos_saas(id),
  status text not null default 'trial',
  data_inicio_trial date default current_date,
  data_fim_trial date default (current_date + interval '14 day')::date,
  data_inicio date default current_date,
  proxima_cobranca date,
  limite_usuarios integer,
  limite_produtos integer,
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.integracoes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid references public.empresas(id) on delete cascade,
  tipo text not null,
  provedor text,
  status text not null default 'desconectado',
  credenciais_ref text,
  configuracao jsonb not null default '{}'::jsonb,
  ultimo_teste timestamptz,
  ultimo_erro text,
  ativo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.integracoes_logs (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid references public.empresas(id) on delete cascade,
  integracao_id uuid references public.integracoes(id) on delete set null,
  evento text not null,
  status text not null default 'info',
  payload jsonb not null default '{}'::jsonb,
  erro text,
  created_at timestamptz not null default now()
);

create table if not exists public.webhooks_config (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid references public.empresas(id) on delete cascade,
  nome text not null,
  url text not null,
  eventos text[] not null default array[]::text[],
  secret_ref text,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.webhooks_eventos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid references public.empresas(id) on delete cascade,
  webhook_id uuid references public.webhooks_config(id) on delete set null,
  evento text not null,
  status text not null default 'pendente',
  payload jsonb not null default '{}'::jsonb,
  resposta text,
  tentativas integer not null default 0,
  created_at timestamptz not null default now(),
  enviado_em timestamptz
);

create table if not exists public.suporte_chamados (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid references public.empresas(id) on delete cascade,
  usuario_id uuid,
  assunto text not null,
  mensagem text not null,
  prioridade text not null default 'media',
  status text not null default 'aberto',
  resposta text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.logs_erro (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid references public.empresas(id) on delete set null,
  usuario_id uuid,
  mensagem text not null,
  contexto jsonb not null default '{}'::jsonb,
  url text,
  user_agent text,
  created_at timestamptz not null default now()
);

create or replace function public.vf_registrar_venda_completa_v14(p_payload jsonb)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_venda jsonb := p_payload->'venda';
  v_itens jsonb := coalesce(p_payload->'itens','[]'::jsonb);
  v_pagamentos jsonb := coalesce(p_payload->'pagamentos','[]'::jsonb);
  v_venda_id uuid;
  v_item jsonb;
  v_pagamento jsonb;
begin
  insert into public.vendas select * from jsonb_populate_record(null::public.vendas, v_venda) returning id into v_venda_id;

  for v_item in select * from jsonb_array_elements(v_itens) loop
    insert into public.venda_itens select * from jsonb_populate_record(null::public.venda_itens, v_item || jsonb_build_object('venda_id', v_venda_id));
    if (v_item ? 'produto_id') and nullif(v_item->>'produto_id','') is not null then
      update public.produto_estoque
      set quantidade_atual = greatest(0, quantidade_atual - coalesce((v_item->>'quantidade')::numeric,0)), updated_at = now()
      where produto_id = (v_item->>'produto_id')::uuid and empresa_id = (v_venda->>'empresa_id')::uuid;
    end if;
  end loop;

  for v_pagamento in select * from jsonb_array_elements(v_pagamentos) loop
    insert into public.venda_pagamentos select * from jsonb_populate_record(null::public.venda_pagamentos, v_pagamento || jsonb_build_object('venda_id', v_venda_id));
  end loop;

  insert into public.lancamentos_financeiros (empresa_id,tipo,descricao,valor,data_vencimento,data_pagamento,forma_pagamento,status,observacoes)
  values ((v_venda->>'empresa_id')::uuid,'receita','Venda #' || left(v_venda_id::text,8),coalesce((v_venda->>'total')::numeric,0),coalesce(v_venda->>'data_venda',current_date::text)::date,coalesce(v_venda->>'data_venda',current_date::text)::date,v_venda->>'forma_pagamento','pago','Lançado automaticamente pela venda transacional V14')
  on conflict do nothing;

  insert into public.logs_auditoria (empresa_id,acao,entidade,entidade_id,detalhes)
  values ((v_venda->>'empresa_id')::uuid,'vendas.criar.transacional.v14','vendas',v_venda_id,jsonb_build_object('itens', jsonb_array_length(v_itens), 'pagamentos', jsonb_array_length(v_pagamentos), 'total', v_venda->>'total'))
  on conflict do nothing;

  return jsonb_build_object('id', v_venda_id, 'status', 'realizada', 'total', v_venda->>'total');
end;
$$;

-- Políticas públicas mínimas para catálogo publicado. Ajuste em produção conforme RLS existente.
alter table public.catalogos_publicos enable row level security;
do $$ begin
  create policy catalogos_publicos_select_ativos on public.catalogos_publicos for select using (ativo = true);
exception when duplicate_object then null; end $$;

create index if not exists idx_catalogos_publicos_slug on public.catalogos_publicos(slug) where ativo = true;
create index if not exists idx_importacoes_empresa on public.importacoes_dados(empresa_id, created_at desc);
create index if not exists idx_suporte_empresa on public.suporte_chamados(empresa_id, created_at desc);
create index if not exists idx_logs_erro_empresa on public.logs_erro(empresa_id, created_at desc);


-- Catálogo público precisa ler itens/produtos/promoções vinculados ao cardápio publicado.
alter table public.cardapio_itens enable row level security;
do $$ begin
  create policy cardapio_itens_select_public_catalogo on public.cardapio_itens for select using (
    exibir = true and exists (
      select 1 from public.catalogos_publicos cp
      where cp.cardapio_id = cardapio_itens.cardapio_id and cp.empresa_id = cardapio_itens.empresa_id and cp.ativo = true
    )
  );
exception when duplicate_object then null; end $$;

alter table public.produtos enable row level security;
do $$ begin
  create policy produtos_select_public_catalogo on public.produtos for select using (
    ativo = true and disponivel = true and exists (
      select 1
      from public.cardapio_itens ci
      join public.catalogos_publicos cp on cp.cardapio_id = ci.cardapio_id and cp.empresa_id = ci.empresa_id
      where ci.produto_id = produtos.id and ci.exibir = true and cp.ativo = true
    )
  );
exception when duplicate_object then null; end $$;

alter table public.promocoes enable row level security;
do $$ begin
  create policy promocoes_select_public_catalogo on public.promocoes for select using (
    status = 'ativa' and exibir_cardapio = true and exists (
      select 1
      from public.cardapio_itens ci
      join public.catalogos_publicos cp on cp.cardapio_id = ci.cardapio_id and cp.empresa_id = ci.empresa_id
      where ci.produto_id = promocoes.produto_id and cp.ativo = true
    )
  );
exception when duplicate_object then null; end $$;
