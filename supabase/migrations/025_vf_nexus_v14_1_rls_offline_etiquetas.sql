-- VF Nexus V14.1 — RLS reforçado, offline, etiquetas, scanner e venda transacional segura
-- Execute após as migrations 001..024. Idempotente.

create extension if not exists pgcrypto;

create or replace function public.vf_current_empresa_id()
returns uuid
language sql
stable
security definer
as $$
  select empresa_id from public.perfis where id = auth.uid() limit 1
$$;

alter table public.produtos add column if not exists codigo_interno text;
alter table public.produtos add column if not exists etiqueta_preferencial text;
create unique index if not exists idx_produtos_empresa_codigo_barras_unique on public.produtos(empresa_id, codigo_barras) where codigo_barras is not null;
create unique index if not exists idx_produtos_empresa_codigo_interno_unique on public.produtos(empresa_id, codigo_interno) where codigo_interno is not null;

create table if not exists public.codigos_barras_produtos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  produto_id uuid not null references public.produtos(id) on delete cascade,
  codigo text not null,
  tipo_codigo text not null default 'CODE128',
  principal boolean not null default false,
  origem text not null default 'manual',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (empresa_id, codigo)
);

create table if not exists public.etiquetas_lotes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  usuario_id uuid,
  nome text not null,
  tipo_layout text not null default 'produto_preco_codigo',
  formato_papel text not null default 'a4_3_colunas',
  largura_mm numeric(10,2),
  altura_mm numeric(10,2),
  colunas integer default 3,
  linhas integer default 7,
  total_etiquetas integer not null default 0,
  status text not null default 'gerado',
  created_at timestamptz not null default now()
);

create table if not exists public.etiquetas_itens (
  id uuid primary key default gen_random_uuid(),
  lote_id uuid not null references public.etiquetas_lotes(id) on delete cascade,
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  produto_id uuid references public.produtos(id) on delete set null,
  nome_produto text not null,
  preco numeric(12,2) not null default 0,
  codigo_barras text not null,
  quantidade integer not null default 1,
  ordem integer default 0
);

create table if not exists public.operacoes_offline (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  usuario_id uuid,
  tipo text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pendente',
  erro text,
  criado_offline_em timestamptz,
  sincronizado_em timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.vendas_offline_sync (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  usuario_id uuid,
  offline_id text not null,
  venda_id uuid references public.vendas(id) on delete set null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pendente_sync',
  erro text,
  criado_offline_em timestamptz,
  sincronizado_em timestamptz,
  created_at timestamptz not null default now(),
  unique (empresa_id, offline_id)
);

create table if not exists public.pagamentos_assinatura (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid references public.empresas(id) on delete cascade,
  assinatura_id uuid references public.assinaturas_saas(id) on delete set null,
  plano_id uuid references public.planos_saas(id) on delete set null,
  provedor text not null default 'manual',
  provider_payment_id text,
  valor numeric(12,2) not null default 0,
  status text not null default 'pendente',
  payload jsonb not null default '{}'::jsonb,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.eventos_billing (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid references public.empresas(id) on delete set null,
  provedor text not null default 'manual',
  evento text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'recebido',
  erro text,
  created_at timestamptz not null default now()
);

-- Reforços para catálogo público e tabelas comerciais V14
alter table public.catalogos_publicos enable row level security;
alter table public.importacoes_dados enable row level security;
alter table public.planos_saas enable row level security;
alter table public.assinaturas_saas enable row level security;
alter table public.integracoes enable row level security;
alter table public.integracoes_logs enable row level security;
alter table public.webhooks_config enable row level security;
alter table public.webhooks_eventos enable row level security;
alter table public.suporte_chamados enable row level security;
alter table public.logs_erro enable row level security;
alter table public.codigos_barras_produtos enable row level security;
alter table public.etiquetas_lotes enable row level security;
alter table public.etiquetas_itens enable row level security;
alter table public.operacoes_offline enable row level security;
alter table public.vendas_offline_sync enable row level security;
alter table public.pagamentos_assinatura enable row level security;
alter table public.eventos_billing enable row level security;

do $$
declare t text;
begin
  foreach t in array array['catalogos_publicos','importacoes_dados','assinaturas_saas','integracoes','integracoes_logs','webhooks_config','webhooks_eventos','suporte_chamados','logs_erro','codigos_barras_produtos','etiquetas_lotes','etiquetas_itens','operacoes_offline','vendas_offline_sync','pagamentos_assinatura'] loop
    execute format('drop policy if exists %I on public.%I', t || '_select_empresa_v141', t);
    execute format('create policy %I on public.%I for select using (empresa_id = public.vf_current_empresa_id())', t || '_select_empresa_v141', t);
    execute format('drop policy if exists %I on public.%I', t || '_insert_empresa_v141', t);
    execute format('create policy %I on public.%I for insert with check (empresa_id = public.vf_current_empresa_id())', t || '_insert_empresa_v141', t);
    execute format('drop policy if exists %I on public.%I', t || '_update_empresa_v141', t);
    execute format('create policy %I on public.%I for update using (empresa_id = public.vf_current_empresa_id()) with check (empresa_id = public.vf_current_empresa_id())', t || '_update_empresa_v141', t);
    execute format('drop policy if exists %I on public.%I', t || '_delete_empresa_v141', t);
    execute format('create policy %I on public.%I for delete using (empresa_id = public.vf_current_empresa_id())', t || '_delete_empresa_v141', t);
  end loop;
end $$;

drop policy if exists planos_saas_select_auth_v141 on public.planos_saas;
create policy planos_saas_select_auth_v141 on public.planos_saas for select using (auth.uid() is not null and ativo = true);

drop policy if exists catalogos_publicos_select_ativos_public_v141 on public.catalogos_publicos;
create policy catalogos_publicos_select_ativos_public_v141 on public.catalogos_publicos for select using (ativo = true);

drop policy if exists eventos_billing_insert_service_v141 on public.eventos_billing;
create policy eventos_billing_insert_service_v141 on public.eventos_billing for insert with check (true);

-- Policies públicas para catálogo publicado
drop policy if exists cardapio_itens_select_public_catalogo_v141 on public.cardapio_itens;
create policy cardapio_itens_select_public_catalogo_v141 on public.cardapio_itens for select using (
  exibir = true and exists (select 1 from public.catalogos_publicos cp where cp.cardapio_id = cardapio_itens.cardapio_id and cp.empresa_id = cardapio_itens.empresa_id and cp.ativo = true)
);

drop policy if exists produtos_select_public_catalogo_v141 on public.produtos;
create policy produtos_select_public_catalogo_v141 on public.produtos for select using (
  ativo = true and disponivel = true and exists (
    select 1 from public.cardapio_itens ci join public.catalogos_publicos cp on cp.cardapio_id = ci.cardapio_id and cp.empresa_id = ci.empresa_id
    where ci.produto_id = produtos.id and ci.exibir = true and cp.ativo = true
  )
);

drop policy if exists promocoes_select_public_catalogo_v141 on public.promocoes;
create policy promocoes_select_public_catalogo_v141 on public.promocoes for select using (
  status = 'ativa' and exibir_cardapio = true and exists (
    select 1 from public.cardapio_itens ci join public.catalogos_publicos cp on cp.cardapio_id = ci.cardapio_id and cp.empresa_id = ci.empresa_id
    where ci.produto_id = promocoes.produto_id and cp.ativo = true
  )
);

create index if not exists idx_codigos_barras_empresa_codigo on public.codigos_barras_produtos(empresa_id, codigo);
create index if not exists idx_etiquetas_lotes_empresa on public.etiquetas_lotes(empresa_id, created_at desc);
create index if not exists idx_offline_empresa_status on public.vendas_offline_sync(empresa_id, status, created_at desc);
create index if not exists idx_pagamentos_assinatura_empresa on public.pagamentos_assinatura(empresa_id, created_at desc);

create or replace function public.vf_registrar_venda_completa_v14_1(p_payload jsonb)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_venda jsonb := p_payload->'venda';
  v_itens jsonb := coalesce(p_payload->'itens','[]'::jsonb);
  v_pagamentos jsonb := coalesce(p_payload->'pagamentos','[]'::jsonb);
  v_venda_id uuid;
  v_empresa_id uuid := (v_venda->>'empresa_id')::uuid;
  v_item jsonb;
  v_pagamento jsonb;
  v_total numeric := coalesce((v_venda->>'total')::numeric,0);
  v_pago numeric := 0;
  v_estoque numeric;
begin
  if v_empresa_id is null then raise exception 'empresa_id obrigatório'; end if;
  if jsonb_array_length(v_itens) = 0 then raise exception 'Venda sem itens'; end if;

  for v_pagamento in select * from jsonb_array_elements(v_pagamentos) loop
    v_pago := v_pago + coalesce((v_pagamento->>'valor')::numeric,0);
  end loop;
  if v_pago < v_total then raise exception 'Pagamento menor que total da venda'; end if;

  for v_item in select * from jsonb_array_elements(v_itens) loop
    if (v_item ? 'produto_id') and nullif(v_item->>'produto_id','') is not null then
      perform 1 from public.produtos p where p.id = (v_item->>'produto_id')::uuid and p.empresa_id = v_empresa_id and p.ativo = true and p.disponivel = true;
      if not found then raise exception 'Produto inativo, indisponível ou de outra empresa'; end if;
      select quantidade_atual into v_estoque from public.produto_estoque where produto_id = (v_item->>'produto_id')::uuid and empresa_id = v_empresa_id;
      if coalesce(v_estoque, 0) < coalesce((v_item->>'quantidade')::numeric,0) then
        -- Não bloqueia quando não há controle cadastrado, mas bloqueia estoque conhecido insuficiente.
        if v_estoque is not null then raise exception 'Estoque insuficiente para o produto %', v_item->>'produto_nome'; end if;
      end if;
    end if;
  end loop;

  insert into public.vendas select * from jsonb_populate_record(null::public.vendas, v_venda) returning id into v_venda_id;

  for v_item in select * from jsonb_array_elements(v_itens) loop
    insert into public.venda_itens select * from jsonb_populate_record(null::public.venda_itens, v_item || jsonb_build_object('venda_id', v_venda_id));
    if (v_item ? 'produto_id') and nullif(v_item->>'produto_id','') is not null then
      insert into public.movimentacoes_produto_estoque (empresa_id, produto_id, tipo, quantidade, custo_unitario, custo_total, motivo, documento, origem, origem_id)
      values (v_empresa_id, (v_item->>'produto_id')::uuid, 'saida', coalesce((v_item->>'quantidade')::numeric,0), coalesce((v_item->>'custo_unitario')::numeric,0), coalesce((v_item->>'custo_unitario')::numeric,0) * coalesce((v_item->>'quantidade')::numeric,0), 'Venda transacional V14.1', 'venda:' || v_venda_id::text, 'venda', v_venda_id);
    end if;
  end loop;

  for v_pagamento in select * from jsonb_array_elements(v_pagamentos) loop
    insert into public.venda_pagamentos select * from jsonb_populate_record(null::public.venda_pagamentos, v_pagamento || jsonb_build_object('venda_id', v_venda_id));
  end loop;

  insert into public.lancamentos_financeiros (empresa_id,tipo,descricao,valor,data_vencimento,data_pagamento,forma_pagamento,status,observacoes)
  values (v_empresa_id,'receita','Venda #' || left(v_venda_id::text,8),v_total,coalesce(v_venda->>'data_venda',current_date::text)::date,coalesce(v_venda->>'data_venda',current_date::text)::date,v_venda->>'forma_pagamento','pago','Lançado automaticamente pela venda transacional V14.1')
  on conflict do nothing;

  insert into public.logs_auditoria (empresa_id,acao,entidade,entidade_id,detalhes)
  values (v_empresa_id,'vendas.criar.transacional.v14_1','vendas',v_venda_id,jsonb_build_object('itens', jsonb_array_length(v_itens), 'pagamentos', jsonb_array_length(v_pagamentos), 'total', v_total))
  on conflict do nothing;

  return jsonb_build_object('id', v_venda_id, 'venda_id', v_venda_id, 'status', 'realizada', 'total', v_total);
end;
$$;

create or replace function public.vf_estornar_venda_completa_v14_1(p_venda_id uuid, p_motivo text default 'Estorno')
returns jsonb
language plpgsql
security definer
as $$
declare
  v record;
  item record;
begin
  select * into v from public.vendas where id = p_venda_id;
  if not found then raise exception 'Venda não encontrada'; end if;
  update public.vendas set status = 'estornada', motivo_cancelamento = p_motivo, data_cancelamento = now() where id = p_venda_id;
  for item in select * from public.venda_itens where venda_id = p_venda_id loop
    if item.produto_id is not null then
      insert into public.movimentacoes_produto_estoque (empresa_id, produto_id, tipo, quantidade, custo_unitario, custo_total, motivo, documento, origem, origem_id)
      values (item.empresa_id, item.produto_id, 'entrada', item.quantidade, item.custo_unitario, item.custo_unitario * item.quantidade, p_motivo, 'estorno:' || p_venda_id::text, 'estorno', p_venda_id);
    end if;
  end loop;
  insert into public.logs_auditoria (empresa_id,acao,entidade,entidade_id,detalhes) values (v.empresa_id,'vendas.estornar.transacional.v14_1','vendas',p_venda_id,jsonb_build_object('motivo',p_motivo)) on conflict do nothing;
  return jsonb_build_object('id', p_venda_id, 'status', 'estornada');
end;
$$;
