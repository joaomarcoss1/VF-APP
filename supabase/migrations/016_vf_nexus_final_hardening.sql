-- ============================================================
-- 016 — VF Nexus Final Hardening MVP Avançado
-- Objetivo: banco novo estável, RBAC/RLS por ação, venda real,
-- cancelamento/estorno, compra/estoque, financeiro/DRE, OS,
-- onboarding por ramo e auditoria crítica.
-- Idempotente e não destrutivo.
-- ============================================================

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- 1) Compatibilidade de ramos comerciais.
alter table public.empresas drop constraint if exists empresas_tipo_check;
alter table public.empresas alter column tipo set default 'outro';
alter table public.empresas add constraint empresas_tipo_check check (tipo in ('alimenticio','restaurante','bar','hamburgueria','delivery','buffet','cafeteria','lanchonete','confeitaria','roupas','eletronicos','loja_variedades','prestador_servico','barbearia','fotografia','outro'));

-- 2) Perfil/equipe: papéis e permissões reais.
alter table public.perfis add column if not exists cargo text default 'dono';
alter table public.perfis add column if not exists permissoes text[] not null default array[]::text[];
alter table public.perfis add column if not exists ultimo_login timestamptz;

do $$ begin
  alter table public.perfis drop constraint if exists perfis_cargo_check;
  alter table public.perfis add constraint perfis_cargo_check check (cargo in ('dono','administrador','gerente','financeiro','vendedor','atendente','operacional','contador','master_admin'));
exception when others then null;
end $$;

alter table public.equipe_usuarios drop constraint if exists equipe_usuarios_cargo_check;
alter table public.equipe_usuarios add constraint equipe_usuarios_cargo_check check (cargo in ('dono','administrador','gerente','financeiro','vendedor','atendente','operacional','contador','master_admin','outro'));

alter table public.permissoes_equipe drop constraint if exists permissoes_equipe_acao_check;
alter table public.permissoes_equipe add constraint permissoes_equipe_acao_check check (acao in ('ver','criar','editar','excluir','cancelar','estornar','aprovar','exportar','administrar','impersonar'));

-- 3) Master admin canônico.
create table if not exists public.master_admins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nome text,
  email text,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  unique(user_id)
);
alter table public.master_admins enable row level security;
drop policy if exists master_admins_select_self on public.master_admins;
create policy master_admins_select_self on public.master_admins for select using (user_id = auth.uid());

create or replace function public.is_master_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(select 1 from public.master_admins m where m.user_id = auth.uid() and m.ativo = true)
     or exists(select 1 from public.perfis p where p.id = auth.uid() and (p.is_master = true or p.cargo = 'master_admin'));
$$;
grant execute on function public.is_master_admin() to authenticated;

create or replace function public.get_empresa_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select empresa_id from public.perfis where id = auth.uid() limit 1;
$$;
grant execute on function public.get_empresa_id() to authenticated;

create or replace function public.vf_can(p_modulo text, p_acao text, p_empresa_id uuid default public.get_empresa_id())
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_cargo text;
  v_permissoes text[];
begin
  if public.is_master_admin() then return true; end if;
  select cargo, permissoes into v_cargo, v_permissoes from public.perfis where id = auth.uid() and empresa_id = p_empresa_id;
  if v_cargo in ('dono','administrador') then return true; end if;
  if v_permissoes is not null and ('*' = any(v_permissoes) or (p_modulo || ':' || p_acao) = any(v_permissoes)) then return true; end if;

  return exists (
    select 1
    from public.permissoes_equipe pe
    where pe.empresa_id = p_empresa_id
      and pe.modulo = p_modulo
      and pe.acao = p_acao
      and pe.permitido = true
      and (pe.cargo = v_cargo or pe.cargo is null)
  ) or case v_cargo
    when 'gerente' then p_acao in ('ver','criar','editar','cancelar','estornar','aprovar','exportar')
    when 'financeiro' then p_modulo in ('financeiro','relatorios','despesas','vendas','comprovantes','fechamento') and p_acao in ('ver','criar','editar','estornar','aprovar','exportar')
    when 'vendedor' then p_modulo in ('vendas','clientes','produtos','comprovantes','cardapio','promocoes') and p_acao in ('ver','criar','editar')
    when 'atendente' then p_modulo in ('vendas','clientes','agendamentos','comprovantes','produtos','cardapio') and p_acao in ('ver','criar','editar')
    when 'operacional' then p_modulo in ('estoque','produtos','notas-fiscais','fornecedores','ordens-servico','insumos','fichas') and p_acao in ('ver','criar','editar')
    when 'contador' then p_modulo in ('financeiro','relatorios','despesas','vendas','notas-fiscais','comprovantes','fechamento') and p_acao in ('ver','exportar')
    else false
  end;
end;
$$;
grant execute on function public.vf_can(text,text,uuid) to authenticated;

-- 4) Campos operacionais em vendas e pagamentos.
alter table public.vendas add column if not exists status_entrega text not null default 'pendente';
alter table public.vendas add column if not exists valor_recebido numeric(14,2) default 0;
alter table public.vendas add column if not exists troco numeric(14,2) default 0;
alter table public.vendas add column if not exists updated_at timestamptz not null default now();
alter table public.vendas drop constraint if exists vendas_status_entrega_check;
alter table public.vendas add constraint vendas_status_entrega_check check (status_entrega in ('pendente','em_preparo','saiu_entrega','entregue','cancelado'));

alter table public.venda_pagamentos add column if not exists valor_recebido numeric(14,2) default 0;
alter table public.venda_pagamentos add column if not exists troco numeric(14,2) default 0;
alter table public.venda_pagamentos add column if not exists conciliado boolean not null default false;
alter table public.venda_pagamentos add column if not exists conciliado_em timestamptz;

create unique index if not exists ux_lanc_fin_origem_empresa on public.lancamentos_financeiros(empresa_id, origem, origem_id) where origem is not null and origem_id is not null;
create unique index if not exists ux_contas_receber_origem_empresa on public.contas_receber(empresa_id, origem, origem_id) where origem is not null and origem_id is not null;
create unique index if not exists ux_contas_pagar_origem_empresa on public.contas_pagar(empresa_id, origem, origem_id) where origem is not null and origem_id is not null;

-- 5) OS completa.
alter table public.ordens_servico drop constraint if exists ordens_servico_status_check;
alter table public.ordens_servico add constraint ordens_servico_status_check check (status in ('aberta','orcamento','aprovada','aprovado','execucao','em_execucao','aguardando_material','finalizada','concluido','entregue','cancelada','cancelado'));
alter table public.ordens_servico add column if not exists checklist jsonb not null default '[]'::jsonb;
alter table public.ordens_servico add column if not exists materiais jsonb not null default '[]'::jsonb;
alter table public.ordens_servico add column if not exists fotos jsonb not null default '[]'::jsonb;
alter table public.ordens_servico add column if not exists assinaturas jsonb not null default '[]'::jsonb;
alter table public.ordens_servico add column if not exists orcamento_aprovado boolean not null default false;
alter table public.ordens_servico add column if not exists recebimento_status text not null default 'pendente';

-- 6) Varejo/food.
alter table public.produtos add column if not exists grade jsonb not null default '[]'::jsonb;
alter table public.produtos add column if not exists margem_categoria numeric(8,2);
alter table public.produtos add column if not exists validade_dias integer;
alter table public.produtos add column if not exists perdas_percentual numeric(8,2) default 0;
alter table public.produtos add column if not exists producao_lote numeric(14,3) default 0;

alter table public.insumos add column if not exists validade_dias integer;
alter table public.insumos add column if not exists lote text;

-- 7) Tabelas de apoio para inventário, relatórios e deploy.
create table if not exists public.inventarios_estoque (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  data_inventario date not null default current_date,
  status text not null default 'aberto' check (status in ('aberto','conferido','fechado','cancelado')),
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.inventario_itens (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  inventario_id uuid not null references public.inventarios_estoque(id) on delete cascade,
  produto_id uuid references public.produtos(id) on delete set null,
  insumo_id uuid references public.insumos(id) on delete set null,
  quantidade_sistema numeric(14,3) not null default 0,
  quantidade_contada numeric(14,3) not null default 0,
  diferenca numeric(14,3) generated always as (quantidade_contada - quantidade_sistema) stored,
  justificativa text,
  created_at timestamptz not null default now()
);

create table if not exists public.deploy_validacoes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid references public.empresas(id) on delete set null,
  versao text,
  checklist jsonb not null default '{}'::jsonb,
  aprovado boolean not null default false,
  responsavel uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.inventarios_estoque enable row level security;
alter table public.inventario_itens enable row level security;
alter table public.deploy_validacoes enable row level security;

-- 8) Auditoria que não quebra operação.
create or replace function public.vf_auditar(
  p_empresa_id uuid,
  p_acao text,
  p_entidade text default null,
  p_entidade_id uuid default null,
  p_detalhes jsonb default '{}'::jsonb
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.logs_auditoria (empresa_id, usuario_id, acao, entidade, entidade_id, detalhes)
  values (p_empresa_id, auth.uid(), p_acao, p_entidade, p_entidade_id::text, coalesce(p_detalhes, '{}'::jsonb));
exception when others then
  return;
end;
$$;
grant execute on function public.vf_auditar(uuid,text,text,uuid,jsonb) to authenticated;

-- 9) Função segura de cancelamento/estorno de venda.
create or replace function public.vf_cancelar_venda(p_venda_id uuid, p_motivo text, p_estornar boolean default false)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_venda public.vendas%rowtype;
  v_status text;
begin
  if p_motivo is null or length(trim(p_motivo)) < 5 then
    raise exception 'Motivo obrigatório para cancelar/estornar venda.';
  end if;

  select * into v_venda from public.vendas where id = p_venda_id;
  if not found then raise exception 'Venda não encontrada.'; end if;
  if not public.vf_can('vendas', case when p_estornar then 'estornar' else 'cancelar' end, v_venda.empresa_id) then
    raise exception 'Permissão negada para cancelar/estornar venda.';
  end if;
  if v_venda.status in ('cancelada','estornada') then raise exception 'Venda já cancelada/estornada.'; end if;

  v_status := case when p_estornar then 'estornada' else 'cancelada' end;
  update public.vendas
  set status = v_status,
      status_entrega = 'cancelado',
      motivo_cancelamento = trim(p_motivo),
      data_cancelamento = now(),
      updated_at = now()
  where id = p_venda_id;

  update public.venda_pagamentos set status = case when p_estornar then 'estornado' else 'cancelado' end where venda_id = p_venda_id;
  update public.lancamentos_financeiros set status = 'cancelado', updated_at = now() where origem = 'venda' and origem_id = p_venda_id;
  update public.contas_receber set status = 'cancelado', updated_at = now() where origem = 'venda' and origem_id = p_venda_id;

  insert into public.venda_status_historico (empresa_id, venda_id, status_anterior, status_novo, motivo, usuario_id)
  values (v_venda.empresa_id, p_venda_id, coalesce(v_venda.status,'realizada'), v_status, trim(p_motivo), auth.uid());

  perform public.vf_auditar(v_venda.empresa_id, case when p_estornar then 'vendas.estornar' else 'vendas.cancelar' end, 'vendas', p_venda_id, jsonb_build_object('motivo', trim(p_motivo), 'total', v_venda.total));
end;
$$;
grant execute on function public.vf_cancelar_venda(uuid,text,boolean) to authenticated;

-- 10) Triggers para compra/financeiro/estoque.
create or replace function public.vf_compra_after_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(new.gerar_conta_pagar, true) then
    insert into public.contas_pagar (empresa_id, fornecedor_id, descricao, valor, data_vencimento, forma_pagamento, status, origem, origem_id, observacoes)
    values (new.empresa_id, new.fornecedor_id, 'Compra ' || coalesce(new.numero, substring(new.id::text,1,8)), coalesce(new.valor_total,0), coalesce(new.data_compra,current_date), new.forma_pagamento, 'pendente', 'compra', new.id, 'Gerado automaticamente pela compra.')
    on conflict (empresa_id, origem, origem_id) where origem is not null and origem_id is not null do nothing;
  end if;
  perform public.vf_auditar(new.empresa_id, 'compras.criar', 'compras', new.id, jsonb_build_object('valor_total', new.valor_total));
  return new;
end;
$$;

drop trigger if exists trg_vf_compra_after_insert on public.compras;
create trigger trg_vf_compra_after_insert after insert on public.compras for each row execute function public.vf_compra_after_insert();

-- 11) RLS padronizado com RBAC por ação para tabelas principais.
do $$
declare
  rec record;
begin
  for rec in
    select * from (values
      ('vendas','vendas'), ('venda_itens','vendas'), ('venda_pagamentos','vendas'), ('venda_status_historico','vendas'),
      ('lancamentos_financeiros','financeiro'), ('contas_pagar','financeiro'), ('contas_receber','financeiro'),
      ('produto_estoque','estoque'), ('movimentacoes_produto_estoque','estoque'), ('movimentacoes_estoque','estoque'),
      ('compras','notas-fiscais'), ('compra_itens','notas-fiscais'),
      ('ordens_servico','ordens-servico'), ('clientes','clientes'), ('produtos','produtos'),
      ('equipe_usuarios','equipe'), ('permissoes_equipe','equipe'), ('logs_auditoria','auditoria'),
      ('inventarios_estoque','estoque'), ('inventario_itens','estoque'), ('documentos_gerados','relatorios')
    ) as x(tabela, modulo)
  loop
    execute format('alter table public.%I enable row level security', rec.tabela);
    execute format('drop policy if exists %I_select_rbac on public.%I', rec.tabela, rec.tabela);
    execute format('drop policy if exists %I_insert_rbac on public.%I', rec.tabela, rec.tabela);
    execute format('drop policy if exists %I_update_rbac on public.%I', rec.tabela, rec.tabela);
    execute format('drop policy if exists %I_delete_rbac on public.%I', rec.tabela, rec.tabela);
    execute format('create policy %I_select_rbac on public.%I for select using (empresa_id = public.get_empresa_id() or public.is_master_admin())', rec.tabela, rec.tabela);
    execute format('create policy %I_insert_rbac on public.%I for insert with check ((empresa_id = public.get_empresa_id() and public.vf_can(%L, ''criar'', empresa_id)) or public.is_master_admin())', rec.tabela, rec.tabela, rec.modulo);
    execute format('create policy %I_update_rbac on public.%I for update using ((empresa_id = public.get_empresa_id() and public.vf_can(%L, ''editar'', empresa_id)) or public.is_master_admin()) with check ((empresa_id = public.get_empresa_id() and public.vf_can(%L, ''editar'', empresa_id)) or public.is_master_admin())', rec.tabela, rec.tabela, rec.modulo, rec.modulo);
    execute format('create policy %I_delete_rbac on public.%I for delete using ((empresa_id = public.get_empresa_id() and public.vf_can(%L, ''excluir'', empresa_id)) or public.is_master_admin())', rec.tabela, rec.tabela, rec.modulo);
  end loop;
end $$;

-- 12) Índices de relatórios/diagnóstico.
create index if not exists idx_vendas_empresa_data_status on public.vendas(empresa_id, data_venda desc, status);
create index if not exists idx_venda_pagamentos_empresa_data on public.venda_pagamentos(empresa_id, data_recebimento desc, forma_pagamento);
create index if not exists idx_lancamentos_empresa_periodo on public.lancamentos_financeiros(empresa_id, data_vencimento desc, tipo, status);
create index if not exists idx_contas_pagar_empresa_vencimento on public.contas_pagar(empresa_id, data_vencimento, status);
create index if not exists idx_contas_receber_empresa_vencimento on public.contas_receber(empresa_id, data_vencimento, status);
create index if not exists idx_compra_itens_empresa_compra on public.compra_itens(empresa_id, compra_id);

-- 13) Módulos enxutos por ramo.
insert into public.setor_modulos (tipo_empresa, modulo, ativo, ordem)
select tipo, modulo, ativo, ordem
from (values
  -- Food
  ('alimenticio','dashboard',true,1),('alimenticio','produtos',true,2),('alimenticio','vendas',true,3),('alimenticio','estoque',true,4),('alimenticio','insumos',true,5),('alimenticio','fichas',true,6),('alimenticio','cardapio',true,7),('alimenticio','financeiro',true,8),('alimenticio','relatorios',true,9),('alimenticio','diagnostico',true,10),('alimenticio','eventos',true,11),('alimenticio','ordens-servico',false,30),
  ('restaurante','dashboard',true,1),('restaurante','produtos',true,2),('restaurante','vendas',true,3),('restaurante','estoque',true,4),('restaurante','insumos',true,5),('restaurante','fichas',true,6),('restaurante','cardapio',true,7),('restaurante','financeiro',true,8),('restaurante','relatorios',true,9),('restaurante','diagnostico',true,10),('restaurante','eventos',true,11),('restaurante','ordens-servico',false,30),
  ('bar','dashboard',true,1),('bar','produtos',true,2),('bar','vendas',true,3),('bar','estoque',true,4),('bar','insumos',true,5),('bar','fichas',true,6),('bar','cardapio',true,7),('bar','financeiro',true,8),('bar','relatorios',true,9),('bar','diagnostico',true,10),
  ('hamburgueria','dashboard',true,1),('hamburgueria','produtos',true,2),('hamburgueria','vendas',true,3),('hamburgueria','estoque',true,4),('hamburgueria','insumos',true,5),('hamburgueria','fichas',true,6),('hamburgueria','cardapio',true,7),('hamburgueria','financeiro',true,8),('hamburgueria','relatorios',true,9),('hamburgueria','diagnostico',true,10),
  ('delivery','dashboard',true,1),('delivery','produtos',true,2),('delivery','vendas',true,3),('delivery','estoque',true,4),('delivery','insumos',true,5),('delivery','fichas',true,6),('delivery','cardapio',true,7),('delivery','financeiro',true,8),('delivery','relatorios',true,9),('delivery','diagnostico',true,10),
  ('buffet','dashboard',true,1),('buffet','produtos',true,2),('buffet','vendas',true,3),('buffet','estoque',true,4),('buffet','insumos',true,5),('buffet','fichas',true,6),('buffet','eventos',true,7),('buffet','financeiro',true,8),('buffet','relatorios',true,9),('buffet','diagnostico',true,10),
  ('cafeteria','dashboard',true,1),('cafeteria','produtos',true,2),('cafeteria','vendas',true,3),('cafeteria','estoque',true,4),('cafeteria','insumos',true,5),('cafeteria','fichas',true,6),('cafeteria','cardapio',true,7),('cafeteria','financeiro',true,8),('cafeteria','relatorios',true,9),('cafeteria','diagnostico',true,10),
  ('lanchonete','dashboard',true,1),('lanchonete','produtos',true,2),('lanchonete','vendas',true,3),('lanchonete','estoque',true,4),('lanchonete','insumos',true,5),('lanchonete','fichas',true,6),('lanchonete','cardapio',true,7),('lanchonete','financeiro',true,8),('lanchonete','relatorios',true,9),('lanchonete','diagnostico',true,10),
  ('confeitaria','dashboard',true,1),('confeitaria','produtos',true,2),('confeitaria','vendas',true,3),('confeitaria','estoque',true,4),('confeitaria','insumos',true,5),('confeitaria','fichas',true,6),('confeitaria','eventos',true,7),('confeitaria','financeiro',true,8),('confeitaria','relatorios',true,9),('confeitaria','diagnostico',true,10),
  -- Varejo
  ('roupas','dashboard',true,1),('roupas','produtos',true,2),('roupas','vendas',true,3),('roupas','estoque',true,4),('roupas','notas-fiscais',true,5),('roupas','fornecedores',true,6),('roupas','clientes',true,7),('roupas','financeiro',true,8),('roupas','relatorios',true,9),('roupas','diagnostico',true,10),('roupas','insumos',false,30),('roupas','fichas',false,31),('roupas','cardapio',false,32),
  ('eletronicos','dashboard',true,1),('eletronicos','produtos',true,2),('eletronicos','vendas',true,3),('eletronicos','estoque',true,4),('eletronicos','notas-fiscais',true,5),('eletronicos','fornecedores',true,6),('eletronicos','clientes',true,7),('eletronicos','financeiro',true,8),('eletronicos','relatorios',true,9),('eletronicos','diagnostico',true,10),('eletronicos','ordens-servico',true,11),('eletronicos','insumos',false,30),('eletronicos','fichas',false,31),('eletronicos','cardapio',false,32),
  ('loja_variedades','dashboard',true,1),('loja_variedades','produtos',true,2),('loja_variedades','vendas',true,3),('loja_variedades','estoque',true,4),('loja_variedades','notas-fiscais',true,5),('loja_variedades','fornecedores',true,6),('loja_variedades','clientes',true,7),('loja_variedades','financeiro',true,8),('loja_variedades','relatorios',true,9),('loja_variedades','diagnostico',true,10),('loja_variedades','insumos',false,30),('loja_variedades','fichas',false,31),('loja_variedades','cardapio',false,32),
  -- Serviços
  ('prestador_servico','dashboard',true,1),('prestador_servico','produtos',true,2),('prestador_servico','clientes',true,3),('prestador_servico','agendamentos',true,4),('prestador_servico','ordens-servico',true,5),('prestador_servico','vendas',true,6),('prestador_servico','financeiro',true,7),('prestador_servico','relatorios',true,8),('prestador_servico','diagnostico',true,9),('prestador_servico','estoque',false,30),('prestador_servico','insumos',false,31),('prestador_servico','fichas',false,32),
  ('barbearia','dashboard',true,1),('barbearia','produtos',true,2),('barbearia','clientes',true,3),('barbearia','agendamentos',true,4),('barbearia','ordens-servico',true,5),('barbearia','vendas',true,6),('barbearia','financeiro',true,7),('barbearia','relatorios',true,8),('barbearia','diagnostico',true,9),('barbearia','estoque',false,30),('barbearia','insumos',false,31),('barbearia','fichas',false,32),
  ('fotografia','dashboard',true,1),('fotografia','produtos',true,2),('fotografia','clientes',true,3),('fotografia','agendamentos',true,4),('fotografia','ordens-servico',true,5),('fotografia','vendas',true,6),('fotografia','financeiro',true,7),('fotografia','relatorios',true,8),('fotografia','diagnostico',true,9),('fotografia','estoque',false,30),('fotografia','insumos',false,31),('fotografia','fichas',false,32)
) as m(tipo, modulo, ativo, ordem)
on conflict (tipo_empresa, modulo)
do update set ativo = excluded.ativo, ordem = excluded.ordem, updated_at = now();

-- 14) Triggers updated_at defensivos.
drop trigger if exists trg_vendas_updated_at on public.vendas;
create trigger trg_vendas_updated_at before update on public.vendas for each row execute function public.set_updated_at();
drop trigger if exists trg_inventarios_updated_at on public.inventarios_estoque;
create trigger trg_inventarios_updated_at before update on public.inventarios_estoque for each row execute function public.set_updated_at();
