-- VF Nexus V14.2 — PDV profissional, scanner, etiquetas promocionais e importação avançada
-- Execute após as migrations 001..025. Idempotente e preparado para multiempresa.

create extension if not exists pgcrypto;

create or replace function public.vf_current_empresa_id()
returns uuid
language sql
stable
security definer
as $$
  select empresa_id from public.perfis where id = auth.uid() limit 1
$$;

alter table public.produtos add column if not exists codigo_barras text;
alter table public.produtos add column if not exists sku text;
alter table public.produtos add column if not exists codigo_interno text;
alter table public.produtos add column if not exists estoque_minimo numeric(12,3) default 0;
alter table public.produtos add column if not exists imagem_url text;

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
  tipo_layout text not null default 'simples',
  formato_papel text not null default 'a4_3_colunas',
  largura_mm numeric(10,2),
  altura_mm numeric(10,2),
  colunas integer default 3,
  linhas integer default 7,
  total_etiquetas integer not null default 0,
  configuracao jsonb not null default '{}'::jsonb,
  status text not null default 'gerado',
  created_at timestamptz not null default now()
);

alter table public.etiquetas_lotes add column if not exists configuracao jsonb not null default '{}'::jsonb;

create table if not exists public.etiquetas_itens (
  id uuid primary key default gen_random_uuid(),
  lote_id uuid not null references public.etiquetas_lotes(id) on delete cascade,
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  produto_id uuid references public.produtos(id) on delete set null,
  nome_produto text not null,
  preco numeric(12,2) not null default 0,
  preco_original numeric(12,2),
  preco_promocional numeric(12,2),
  codigo_barras text,
  quantidade integer not null default 1,
  titulo text,
  subtitulo text,
  data_inicio date,
  data_fim date,
  cores jsonb not null default '{}'::jsonb,
  mostrar_logo boolean not null default false,
  mostrar_codigo boolean not null default true,
  mostrar_qr boolean not null default false,
  ordem integer default 0
);

alter table public.etiquetas_itens add column if not exists preco_original numeric(12,2);
alter table public.etiquetas_itens add column if not exists preco_promocional numeric(12,2);
alter table public.etiquetas_itens add column if not exists titulo text;
alter table public.etiquetas_itens add column if not exists subtitulo text;
alter table public.etiquetas_itens add column if not exists data_inicio date;
alter table public.etiquetas_itens add column if not exists data_fim date;
alter table public.etiquetas_itens add column if not exists cores jsonb not null default '{}'::jsonb;
alter table public.etiquetas_itens add column if not exists mostrar_logo boolean not null default false;
alter table public.etiquetas_itens add column if not exists mostrar_codigo boolean not null default true;
alter table public.etiquetas_itens add column if not exists mostrar_qr boolean not null default false;

create table if not exists public.importacoes_estoque (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  usuario_id uuid,
  tipo_arquivo text,
  nome_arquivo text,
  status text not null default 'validada',
  total_linhas integer default 0,
  linhas_validas integer default 0,
  linhas_com_erro integer default 0,
  mapeamento_colunas jsonb not null default '{}'::jsonb,
  erros jsonb not null default '[]'::jsonb,
  resumo jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

create table if not exists public.importacoes_etiquetas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  usuario_id uuid,
  tipo_arquivo text,
  nome_arquivo text,
  status text not null default 'validada',
  total_linhas integer default 0,
  linhas_validas integer default 0,
  linhas_com_erro integer default 0,
  lote_etiqueta_id uuid references public.etiquetas_lotes(id) on delete set null,
  erros jsonb not null default '[]'::jsonb,
  resumo jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

create unique index if not exists idx_produtos_empresa_codigo_barras_v142 on public.produtos(empresa_id, codigo_barras) where codigo_barras is not null;
create index if not exists idx_produtos_empresa_sku_v142 on public.produtos(empresa_id, sku) where sku is not null;
create index if not exists idx_produtos_empresa_codigo_interno_v142 on public.produtos(empresa_id, codigo_interno) where codigo_interno is not null;
create index if not exists idx_codigos_barras_empresa_codigo_v142 on public.codigos_barras_produtos(empresa_id, codigo);
create index if not exists idx_etiquetas_lotes_empresa_created_v142 on public.etiquetas_lotes(empresa_id, created_at desc);
create index if not exists idx_etiquetas_itens_lote_v142 on public.etiquetas_itens(lote_id, ordem);
create index if not exists idx_importacoes_estoque_empresa_created_v142 on public.importacoes_estoque(empresa_id, created_at desc);
create index if not exists idx_importacoes_etiquetas_empresa_created_v142 on public.importacoes_etiquetas(empresa_id, created_at desc);

alter table public.codigos_barras_produtos enable row level security;
alter table public.etiquetas_lotes enable row level security;
alter table public.etiquetas_itens enable row level security;
alter table public.importacoes_estoque enable row level security;
alter table public.importacoes_etiquetas enable row level security;

do $$
declare t text;
begin
  foreach t in array array['codigos_barras_produtos','etiquetas_lotes','etiquetas_itens','importacoes_estoque','importacoes_etiquetas'] loop
    execute format('drop policy if exists %I on public.%I', t || '_select_empresa_v142', t);
    execute format('create policy %I on public.%I for select using (empresa_id = public.vf_current_empresa_id())', t || '_select_empresa_v142', t);
    execute format('drop policy if exists %I on public.%I', t || '_insert_empresa_v142', t);
    execute format('create policy %I on public.%I for insert with check (empresa_id = public.vf_current_empresa_id())', t || '_insert_empresa_v142', t);
    execute format('drop policy if exists %I on public.%I', t || '_update_empresa_v142', t);
    execute format('create policy %I on public.%I for update using (empresa_id = public.vf_current_empresa_id()) with check (empresa_id = public.vf_current_empresa_id())', t || '_update_empresa_v142', t);
    execute format('drop policy if exists %I on public.%I', t || '_delete_empresa_v142', t);
    execute format('create policy %I on public.%I for delete using (empresa_id = public.vf_current_empresa_id())', t || '_delete_empresa_v142', t);
  end loop;
end $$;

-- Produtos também precisam permitir leitura por código dentro da empresa, mantendo policies anteriores.
drop policy if exists produtos_select_empresa_v142 on public.produtos;
create policy produtos_select_empresa_v142 on public.produtos for select using (empresa_id = public.vf_current_empresa_id());

drop policy if exists produtos_update_empresa_v142 on public.produtos;
create policy produtos_update_empresa_v142 on public.produtos for update using (empresa_id = public.vf_current_empresa_id()) with check (empresa_id = public.vf_current_empresa_id());

-- Função de busca segura por código para scanner/PDV.
create or replace function public.vf_buscar_produto_por_codigo_v142(p_codigo text)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_empresa uuid := public.vf_current_empresa_id();
  v_produto jsonb;
begin
  if v_empresa is null then raise exception 'Empresa não identificada'; end if;
  select to_jsonb(p.*) into v_produto
  from public.produtos p
  where p.empresa_id = v_empresa
    and (p.codigo_barras = p_codigo or p.sku = p_codigo or p.codigo_interno = p_codigo)
  limit 1;
  if v_produto is not null then return v_produto; end if;
  select to_jsonb(p.*) into v_produto
  from public.codigos_barras_produtos cb
  join public.produtos p on p.id = cb.produto_id and p.empresa_id = cb.empresa_id
  where cb.empresa_id = v_empresa and cb.codigo = p_codigo
  limit 1;
  return v_produto;
end;
$$;
