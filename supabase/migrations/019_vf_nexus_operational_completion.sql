-- ============================================================
-- 019 — VF Nexus Operational Completion
-- Objetivo: fechar pendências de domínio que ainda estavam parciais:
-- - variações/grade de varejo com estoque por variação;
-- - produção em lote para Food com baixa de insumos e entrada de produto;
-- - OS completa com checklist, materiais, fotos, assinatura e orçamento;
-- - inventário com contagem, divergência, fechamento e ajuste auditado;
-- - RPCs seguras para produção, fechamento de inventário e finalização de OS.
-- ============================================================

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- 1) Varejo: variações reais de produto e estoque por variação.
create table if not exists public.produto_variacoes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  produto_id uuid not null references public.produtos(id) on delete cascade,
  sku text,
  codigo_barras text,
  tamanho text,
  cor text,
  modelo text,
  preco_venda numeric(14,2),
  custo_medio numeric(14,2) not null default 0,
  margem_categoria numeric(8,2),
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (empresa_id, sku),
  unique (empresa_id, codigo_barras)
);
create index if not exists idx_produto_variacoes_empresa_produto on public.produto_variacoes(empresa_id, produto_id, ativo);
alter table public.produto_variacoes enable row level security;

create table if not exists public.produto_variacao_estoque (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  variacao_id uuid not null references public.produto_variacoes(id) on delete cascade,
  quantidade_atual numeric(14,3) not null default 0,
  estoque_minimo numeric(14,3) not null default 0,
  localizacao text,
  custo_medio numeric(14,2) not null default 0,
  updated_at timestamptz not null default now(),
  unique (empresa_id, variacao_id)
);
create index if not exists idx_variacao_estoque_empresa on public.produto_variacao_estoque(empresa_id, quantidade_atual, estoque_minimo);
alter table public.produto_variacao_estoque enable row level security;

create table if not exists public.movimentacoes_variacao_estoque (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  variacao_id uuid not null references public.produto_variacoes(id) on delete cascade,
  tipo text not null check (tipo in ('entrada','saida','ajuste','perda','transferencia')),
  quantidade numeric(14,3) not null,
  custo_unitario numeric(14,2) not null default 0,
  custo_total numeric(14,2) not null default 0,
  motivo text not null,
  documento text,
  usuario_id uuid references auth.users(id) on delete set null,
  origem text,
  origem_id uuid,
  created_at timestamptz not null default now()
);
create index if not exists idx_mov_variacao_empresa on public.movimentacoes_variacao_estoque(empresa_id, created_at desc);
create index if not exists idx_mov_variacao_doc on public.movimentacoes_variacao_estoque(documento, tipo);
alter table public.movimentacoes_variacao_estoque enable row level security;

create or replace function public.aplicar_movimentacao_variacao_estoque()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_fator numeric := case when new.tipo in ('entrada','ajuste') then 1 else -1 end;
  v_saldo_atual numeric;
  v_custo_atual numeric;
begin
  if new.quantidade <= 0 then raise exception 'Quantidade da movimentação precisa ser maior que zero.'; end if;
  if new.tipo = 'ajuste' then
    insert into public.produto_variacao_estoque (empresa_id, variacao_id, quantidade_atual, custo_medio, updated_at)
    values (new.empresa_id, new.variacao_id, new.quantidade, coalesce(new.custo_unitario,0), now())
    on conflict (empresa_id, variacao_id) do update set quantidade_atual = excluded.quantidade_atual, custo_medio = excluded.custo_medio, updated_at = now();
    return new;
  end if;

  select quantidade_atual, custo_medio into v_saldo_atual, v_custo_atual
  from public.produto_variacao_estoque
  where empresa_id = new.empresa_id and variacao_id = new.variacao_id
  for update;

  if not found then
    v_saldo_atual := 0; v_custo_atual := 0;
  end if;

  insert into public.produto_variacao_estoque (empresa_id, variacao_id, quantidade_atual, custo_medio, updated_at)
  values (
    new.empresa_id,
    new.variacao_id,
    greatest(0, v_saldo_atual + (new.quantidade * v_fator)),
    case when new.tipo = 'entrada' and coalesce(new.custo_unitario,0) > 0 and (v_saldo_atual + new.quantidade) > 0
      then round(((v_saldo_atual * coalesce(v_custo_atual,0)) + (new.quantidade * new.custo_unitario)) / (v_saldo_atual + new.quantidade), 2)
      else coalesce(v_custo_atual,0)
    end,
    now()
  )
  on conflict (empresa_id, variacao_id) do update set
    quantidade_atual = excluded.quantidade_atual,
    custo_medio = excluded.custo_medio,
    updated_at = now();
  return new;
end;
$$;
drop trigger if exists trg_aplicar_mov_variacao_estoque on public.movimentacoes_variacao_estoque;
create trigger trg_aplicar_mov_variacao_estoque after insert on public.movimentacoes_variacao_estoque for each row execute function public.aplicar_movimentacao_variacao_estoque();

-- 2) Food: produção em lote.
create table if not exists public.producoes_lote (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  produto_id uuid not null references public.produtos(id) on delete restrict,
  quantidade_produzida numeric(14,3) not null,
  custo_total numeric(14,2) not null default 0,
  custo_unitario numeric(14,2) not null default 0,
  perdas_percentual numeric(8,2) not null default 0,
  data_producao date not null default current_date,
  validade date,
  lote text,
  motivo text not null,
  status text not null default 'finalizada' check (status in ('rascunho','finalizada','cancelada')),
  usuario_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_producoes_lote_empresa on public.producoes_lote(empresa_id, data_producao desc, produto_id);
alter table public.producoes_lote enable row level security;

create table if not exists public.producao_lote_itens (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  producao_id uuid not null references public.producoes_lote(id) on delete cascade,
  insumo_id uuid not null references public.insumos(id) on delete restrict,
  quantidade_consumida numeric(14,3) not null,
  custo_unitario numeric(14,4) not null default 0,
  custo_total numeric(14,2) not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_producao_lote_itens_prod on public.producao_lote_itens(empresa_id, producao_id);
alter table public.producao_lote_itens enable row level security;

-- 3) Serviços: OS completa, orçamento, checklist, materiais, fotos e assinatura.
alter table public.ordens_servico add column if not exists checklist jsonb not null default '[]'::jsonb;
alter table public.ordens_servico add column if not exists materiais jsonb not null default '[]'::jsonb;
alter table public.ordens_servico add column if not exists fotos jsonb not null default '[]'::jsonb;
alter table public.ordens_servico add column if not exists assinaturas jsonb not null default '[]'::jsonb;
alter table public.ordens_servico add column if not exists orcamento_aprovado boolean not null default false;
alter table public.ordens_servico add column if not exists recebimento_status text not null default 'pendente';
alter table public.ordens_servico add column if not exists conta_receber_id uuid references public.contas_receber(id) on delete set null;
do $$ begin
  alter table public.ordens_servico drop constraint if exists ordens_servico_status_check;
  alter table public.ordens_servico add constraint ordens_servico_status_check check (status in ('aberta','orcamento','aprovada','aprovado','execucao','em_execucao','aguardando_material','finalizada','concluido','entregue','cancelada','cancelado'));
exception when duplicate_object then null;
end $$;

create table if not exists public.orcamentos_servico (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  cliente_id uuid references public.clientes(id) on delete set null,
  ordem_servico_id uuid references public.ordens_servico(id) on delete set null,
  titulo text not null,
  descricao text,
  valor_servico numeric(14,2) not null default 0,
  valor_materiais numeric(14,2) not null default 0,
  taxa_deslocamento numeric(14,2) not null default 0,
  desconto numeric(14,2) not null default 0,
  valor_total numeric(14,2) not null default 0,
  status text not null default 'rascunho' check (status in ('rascunho','enviado','aprovado','recusado','cancelado')),
  aprovado_em timestamptz,
  validade date,
  dados jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_orcamentos_servico_empresa on public.orcamentos_servico(empresa_id, status, created_at desc);
alter table public.orcamentos_servico enable row level security;

create table if not exists public.ordens_servico_checklist (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  ordem_servico_id uuid not null references public.ordens_servico(id) on delete cascade,
  titulo text not null,
  concluido boolean not null default false,
  concluido_em timestamptz,
  ordem integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_os_checklist_empresa_os on public.ordens_servico_checklist(empresa_id, ordem_servico_id, ordem);
alter table public.ordens_servico_checklist enable row level security;

create table if not exists public.ordens_servico_materiais (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  ordem_servico_id uuid not null references public.ordens_servico(id) on delete cascade,
  produto_id uuid references public.produtos(id) on delete set null,
  insumo_id uuid references public.insumos(id) on delete set null,
  nome text not null,
  quantidade numeric(14,3) not null default 1,
  custo_unitario numeric(14,2) not null default 0,
  custo_total numeric(14,2) not null default 0,
  baixar_estoque boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists idx_os_materiais_empresa_os on public.ordens_servico_materiais(empresa_id, ordem_servico_id);
alter table public.ordens_servico_materiais enable row level security;

create table if not exists public.ordens_servico_fotos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  ordem_servico_id uuid not null references public.ordens_servico(id) on delete cascade,
  storage_path text not null,
  descricao text,
  tipo text default 'foto',
  created_at timestamptz not null default now()
);
alter table public.ordens_servico_fotos enable row level security;

create table if not exists public.ordens_servico_assinaturas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  ordem_servico_id uuid not null references public.ordens_servico(id) on delete cascade,
  nome text not null,
  papel text default 'cliente',
  assinatura_url text,
  assinado_em timestamptz not null default now(),
  created_at timestamptz not null default now()
);
alter table public.ordens_servico_assinaturas enable row level security;

-- 4) Inventário completo.
create table if not exists public.inventarios_estoque (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  titulo text not null,
  status text not null default 'aberto' check (status in ('aberto','em_contagem','fechado','cancelado')),
  iniciado_em timestamptz not null default now(),
  fechado_em timestamptz,
  motivo_fechamento text,
  usuario_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.inventarios_estoque enable row level security;

create table if not exists public.inventario_itens (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  inventario_id uuid not null references public.inventarios_estoque(id) on delete cascade,
  item_tipo text not null check (item_tipo in ('produto','insumo','variacao')),
  produto_id uuid references public.produtos(id) on delete set null,
  insumo_id uuid references public.insumos(id) on delete set null,
  variacao_id uuid references public.produto_variacoes(id) on delete set null,
  nome text not null,
  quantidade_sistema numeric(14,3) not null default 0,
  quantidade_contada numeric(14,3) not null default 0,
  saldo_sistema numeric(14,3) not null default 0,
  saldo_contado numeric(14,3) not null default 0,
  divergencia numeric(14,3) not null default 0,
  custo_medio numeric(14,2) not null default 0,
  valor_divergencia numeric(14,2) not null default 0,
  justificativa text,
  ajustado boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.inventario_itens enable row level security;

-- Compatibilidade com a tabela de inventário criada em migrations anteriores.
alter table public.inventarios_estoque add column if not exists titulo text not null default 'Inventário';
alter table public.inventarios_estoque add column if not exists iniciado_em timestamptz not null default now();
alter table public.inventarios_estoque add column if not exists fechado_em timestamptz;
alter table public.inventarios_estoque add column if not exists motivo_fechamento text;
alter table public.inventarios_estoque add column if not exists usuario_id uuid references auth.users(id) on delete set null;
do $$ begin
  alter table public.inventarios_estoque drop constraint if exists inventarios_estoque_status_check;
  alter table public.inventarios_estoque add constraint inventarios_estoque_status_check check (status in ('aberto','em_contagem','conferido','fechado','cancelado'));
exception when duplicate_object then null;
end $$;

alter table public.inventario_itens add column if not exists item_tipo text not null default 'produto';
alter table public.inventario_itens add column if not exists variacao_id uuid references public.produto_variacoes(id) on delete set null;
alter table public.inventario_itens add column if not exists nome text not null default 'Item';
alter table public.inventario_itens add column if not exists quantidade_sistema numeric(14,3) not null default 0;
alter table public.inventario_itens add column if not exists quantidade_contada numeric(14,3) not null default 0;
alter table public.inventario_itens add column if not exists saldo_sistema numeric(14,3) not null default 0;
alter table public.inventario_itens add column if not exists saldo_contado numeric(14,3) not null default 0;
alter table public.inventario_itens add column if not exists divergencia numeric(14,3) not null default 0;
alter table public.inventario_itens add column if not exists custo_medio numeric(14,2) not null default 0;
alter table public.inventario_itens add column if not exists valor_divergencia numeric(14,2) not null default 0;
alter table public.inventario_itens add column if not exists ajustado boolean not null default false;
alter table public.inventario_itens add column if not exists updated_at timestamptz not null default now();
do $$ begin
  alter table public.inventario_itens drop constraint if exists inventario_itens_item_tipo_check;
  alter table public.inventario_itens add constraint inventario_itens_item_tipo_check check (item_tipo in ('produto','insumo','variacao'));
exception when duplicate_object then null;
end $$;

create or replace function public.vf_sync_inventario_item()
returns trigger
language plpgsql
as $$
begin
  new.saldo_sistema := coalesce(new.saldo_sistema, new.quantidade_sistema, 0);
  new.saldo_contado := coalesce(new.saldo_contado, new.quantidade_contada, 0);
  new.divergencia := coalesce(new.saldo_contado,0) - coalesce(new.saldo_sistema,0);
  new.valor_divergencia := round(new.divergencia * coalesce(new.custo_medio,0), 2);
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists trg_vf_sync_inventario_item on public.inventario_itens;
create trigger trg_vf_sync_inventario_item before insert or update on public.inventario_itens for each row execute function public.vf_sync_inventario_item();

create index if not exists idx_inventarios_empresa_status on public.inventarios_estoque(empresa_id, status, iniciado_em desc);
create index if not exists idx_inventario_itens_empresa_inv on public.inventario_itens(empresa_id, inventario_id, item_tipo);

-- 5) RLS RBAC para novas tabelas.
do $$
declare
  rec record;
  pol record;
begin
  for rec in select * from (values
    ('produto_variacoes','produtos'),('produto_variacao_estoque','estoque'),('movimentacoes_variacao_estoque','estoque'),
    ('producoes_lote','fichas'),('producao_lote_itens','fichas'),
    ('orcamentos_servico','ordens-servico'),('ordens_servico_checklist','ordens-servico'),('ordens_servico_materiais','ordens-servico'),('ordens_servico_fotos','ordens-servico'),('ordens_servico_assinaturas','ordens-servico'),
    ('inventarios_estoque','estoque'),('inventario_itens','estoque')
  ) as x(tabela, modulo)
  loop
    if to_regclass(format('public.%I', rec.tabela)) is null then continue; end if;
    for pol in select policyname from pg_policies where schemaname='public' and tablename=rec.tabela loop
      execute format('drop policy if exists %I on public.%I', pol.policyname, rec.tabela);
    end loop;
    execute format('alter table public.%I enable row level security', rec.tabela);
    execute format('create policy %I on public.%I for select using (public.is_master_admin() or (empresa_id = public.get_empresa_id() and public.vf_can(%L, ''ver'', empresa_id)))', 'vf_'||rec.tabela||'_select', rec.tabela, rec.modulo);
    execute format('create policy %I on public.%I for insert with check (public.is_master_admin() or (empresa_id = public.get_empresa_id() and public.vf_can(%L, ''criar'', empresa_id)))', 'vf_'||rec.tabela||'_insert', rec.tabela, rec.modulo);
    execute format('create policy %I on public.%I for update using (public.is_master_admin() or (empresa_id = public.get_empresa_id() and public.vf_can(%L, ''editar'', empresa_id))) with check (public.is_master_admin() or (empresa_id = public.get_empresa_id() and public.vf_can(%L, ''editar'', empresa_id)))', 'vf_'||rec.tabela||'_update', rec.tabela, rec.modulo, rec.modulo);
    execute format('create policy %I on public.%I for delete using (public.is_master_admin() or (empresa_id = public.get_empresa_id() and public.vf_can(%L, ''excluir'', empresa_id)))', 'vf_'||rec.tabela||'_delete', rec.tabela, rec.modulo);
  end loop;
end $$;

-- 6) RPC: produção em lote finalizada com baixa de insumos e entrada de produto.
create or replace function public.vf_registrar_producao_lote(p_produto_id uuid, p_quantidade numeric, p_motivo text, p_lote text default null, p_validade date default null, p_perdas_percentual numeric default 0)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_empresa uuid := public.get_empresa_id();
  v_id uuid;
  v_ft record;
  v_qtd_consumida numeric;
  v_custo_unitario numeric;
  v_custo_total numeric := 0;
  v_doc text;
begin
  if v_empresa is null then raise exception 'Empresa não identificada.'; end if;
  if not public.vf_can('fichas','criar',v_empresa) then raise exception 'Permissão negada para registrar produção.'; end if;
  if p_quantidade <= 0 then raise exception 'Quantidade produzida precisa ser maior que zero.'; end if;
  if p_motivo is null or length(trim(p_motivo)) < 5 then raise exception 'Motivo obrigatório para produção em lote.'; end if;

  insert into public.producoes_lote (empresa_id, produto_id, quantidade_produzida, perdas_percentual, lote, validade, motivo, usuario_id)
  values (v_empresa, p_produto_id, p_quantidade, coalesce(p_perdas_percentual,0), p_lote, p_validade, trim(p_motivo), auth.uid())
  returning id into v_id;
  v_doc := 'producao:' || v_id::text;

  for v_ft in select ft.insumo_id, ft.quantidade, i.unidade_compra, coalesce(i.custo_por_unidade, i.custo_por_kg, i.custo_por_litro, i.valor_compra, 0) as custo from public.ficha_tecnica ft join public.insumos i on i.id = ft.insumo_id where ft.produto_id = p_produto_id loop
    v_qtd_consumida := (coalesce(v_ft.quantidade,0) * p_quantidade) * (1 + coalesce(p_perdas_percentual,0) / 100);
    v_custo_unitario := coalesce(v_ft.custo,0);
    insert into public.producao_lote_itens (empresa_id, producao_id, insumo_id, quantidade_consumida, custo_unitario, custo_total)
    values (v_empresa, v_id, v_ft.insumo_id, v_qtd_consumida, v_custo_unitario, round(v_qtd_consumida * v_custo_unitario,2));
    insert into public.movimentacoes_estoque (empresa_id, insumo_id, tipo, quantidade, unidade, custo_unitario, custo_total, motivo, documento, usuario_id)
    values (v_empresa, v_ft.insumo_id, 'saida', v_qtd_consumida, coalesce(v_ft.unidade_compra,'unidade'), v_custo_unitario, round(v_qtd_consumida * v_custo_unitario,2), 'Produção em lote', v_doc, auth.uid());
    v_custo_total := v_custo_total + round(v_qtd_consumida * v_custo_unitario,2);
  end loop;

  update public.producoes_lote set custo_total = v_custo_total, custo_unitario = case when p_quantidade > 0 then round(v_custo_total / p_quantidade, 2) else 0 end, updated_at = now() where id = v_id;
  insert into public.movimentacoes_produto_estoque (empresa_id, produto_id, tipo, quantidade, custo_unitario, custo_total, motivo, documento, usuario_id, origem, origem_id)
  values (v_empresa, p_produto_id, 'entrada', p_quantidade, case when p_quantidade > 0 then round(v_custo_total / p_quantidade,2) else 0 end, v_custo_total, trim(p_motivo), v_doc, auth.uid(), 'producao', v_id);

  perform public.vf_auditar(v_empresa, 'food.producao_lote.registrar', 'producoes_lote', v_id, jsonb_build_object('produto_id', p_produto_id, 'quantidade', p_quantidade, 'custo_total', v_custo_total));
  return v_id;
end;
$$;
grant execute on function public.vf_registrar_producao_lote(uuid,numeric,text,text,date,numeric) to authenticated;

-- 7) RPC: finalizar OS com recebimento real e materiais baixados.
create or replace function public.vf_finalizar_ordem_servico(p_os_id uuid, p_motivo text default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_os record;
  v_conta_id uuid;
  v_mat record;
  v_doc text;
begin
  select * into v_os from public.ordens_servico where id = p_os_id for update;
  if not found then raise exception 'Ordem de serviço não encontrada.'; end if;
  if not public.vf_can('ordens-servico','editar',v_os.empresa_id) then raise exception 'Permissão negada para finalizar OS.'; end if;
  if v_os.status in ('cancelada','cancelado') then raise exception 'OS cancelada não pode ser finalizada.'; end if;
  v_doc := 'os:' || p_os_id::text;

  for v_mat in select * from public.ordens_servico_materiais where ordem_servico_id = p_os_id and empresa_id = v_os.empresa_id and baixar_estoque = true loop
    if v_mat.produto_id is not null then
      insert into public.movimentacoes_produto_estoque (empresa_id, produto_id, tipo, quantidade, custo_unitario, custo_total, motivo, documento, usuario_id, origem, origem_id)
      values (v_os.empresa_id, v_mat.produto_id, 'saida', v_mat.quantidade, v_mat.custo_unitario, v_mat.custo_total, 'Material usado na OS', v_doc, auth.uid(), 'ordem_servico', p_os_id);
    elsif v_mat.insumo_id is not null then
      insert into public.movimentacoes_estoque (empresa_id, insumo_id, tipo, quantidade, unidade, custo_unitario, custo_total, motivo, documento, usuario_id)
      values (v_os.empresa_id, v_mat.insumo_id, 'saida', v_mat.quantidade, 'unidade', v_mat.custo_unitario, v_mat.custo_total, 'Material usado na OS', v_doc, auth.uid());
    end if;
  end loop;

  if coalesce(v_os.valor_final, v_os.valor_orcado, 0) > 0 and v_os.conta_receber_id is null then
    insert into public.contas_receber (empresa_id, cliente_id, descricao, valor, data_vencimento, status, origem, origem_id, observacoes)
    values (v_os.empresa_id, v_os.cliente_id, 'Recebimento OS #' || coalesce(v_os.numero::text, p_os_id::text), coalesce(v_os.valor_final, v_os.valor_orcado, 0), current_date, 'pendente', 'ordem_servico', p_os_id, 'Gerado ao finalizar OS')
    returning id into v_conta_id;
  else
    v_conta_id := v_os.conta_receber_id;
  end if;

  update public.ordens_servico
  set status = 'finalizada', data_finalizacao = current_date, recebimento_status = case when v_conta_id is null then 'recebido' else 'pendente' end, conta_receber_id = v_conta_id, observacoes = coalesce(v_os.observacoes,'') || case when p_motivo is not null then E'\nFinalização: ' || trim(p_motivo) else '' end, updated_at = now()
  where id = p_os_id;

  perform public.vf_auditar(v_os.empresa_id, 'ordem_servico.finalizar', 'ordens_servico', p_os_id, jsonb_build_object('conta_receber_id', v_conta_id, 'motivo', p_motivo));
  return v_conta_id;
end;
$$;
grant execute on function public.vf_finalizar_ordem_servico(uuid,text) to authenticated;

-- 8) RPC: fechar inventário e gerar ajustes reais.
create or replace function public.vf_fechar_inventario(p_inventario_id uuid, p_motivo text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inv record;
  v_item record;
  v_tipo text;
begin
  select * into v_inv from public.inventarios_estoque where id = p_inventario_id for update;
  if not found then raise exception 'Inventário não encontrado.'; end if;
  if not public.vf_can('estoque','editar',v_inv.empresa_id) then raise exception 'Permissão negada para fechar inventário.'; end if;
  if p_motivo is null or length(trim(p_motivo)) < 5 then raise exception 'Justificativa obrigatória para fechar inventário.'; end if;
  if v_inv.status = 'fechado' then raise exception 'Inventário já fechado.'; end if;

  for v_item in select * from public.inventario_itens where inventario_id = p_inventario_id and empresa_id = v_inv.empresa_id loop
    if abs(coalesce(v_item.divergencia,0)) > 0.0001 then
      v_tipo := 'ajuste';
      if v_item.item_tipo = 'produto' and v_item.produto_id is not null then
        insert into public.movimentacoes_produto_estoque (empresa_id, produto_id, tipo, quantidade, custo_unitario, custo_total, motivo, documento, usuario_id, origem, origem_id)
        values (v_inv.empresa_id, v_item.produto_id, v_tipo, v_item.saldo_contado, v_item.custo_medio, round(v_item.saldo_contado * v_item.custo_medio,2), trim(p_motivo), 'inventario:' || p_inventario_id::text, auth.uid(), 'inventario', p_inventario_id);
      elsif v_item.item_tipo = 'insumo' and v_item.insumo_id is not null then
        insert into public.movimentacoes_estoque (empresa_id, insumo_id, tipo, quantidade, unidade, custo_unitario, custo_total, motivo, documento, usuario_id)
        values (v_inv.empresa_id, v_item.insumo_id, v_tipo, v_item.saldo_contado, 'unidade', v_item.custo_medio, round(v_item.saldo_contado * v_item.custo_medio,2), trim(p_motivo), 'inventario:' || p_inventario_id::text, auth.uid());
      elsif v_item.item_tipo = 'variacao' and v_item.variacao_id is not null then
        insert into public.movimentacoes_variacao_estoque (empresa_id, variacao_id, tipo, quantidade, custo_unitario, custo_total, motivo, documento, usuario_id, origem, origem_id)
        values (v_inv.empresa_id, v_item.variacao_id, v_tipo, v_item.saldo_contado, v_item.custo_medio, round(v_item.saldo_contado * v_item.custo_medio,2), trim(p_motivo), 'inventario:' || p_inventario_id::text, auth.uid(), 'inventario', p_inventario_id);
      end if;
      update public.inventario_itens set ajustado = true, justificativa = coalesce(justificativa, trim(p_motivo)), updated_at = now() where id = v_item.id;
    end if;
  end loop;

  update public.inventarios_estoque set status = 'fechado', fechado_em = now(), motivo_fechamento = trim(p_motivo), updated_at = now() where id = p_inventario_id;
  perform public.vf_auditar(v_inv.empresa_id, 'estoque.inventario.fechar', 'inventarios_estoque', p_inventario_id, jsonb_build_object('motivo', trim(p_motivo)));
end;
$$;
grant execute on function public.vf_fechar_inventario(uuid,text) to authenticated;
