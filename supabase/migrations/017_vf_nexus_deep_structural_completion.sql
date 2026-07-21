-- ============================================================
-- 017 — VF Nexus Deep Structural Completion
-- Objetivo: concluir pontos estruturais que ficaram parciais na v5:
-- - remover geração duplicada de pagamento da trigger de venda;
-- - fortalecer RLS em tabelas de módulos reais;
-- - garantir empresa_id em itens de NF/eventos para isolamento;
-- - padronizar funções críticas para cancelamento/estorno, auditoria e RBAC.
-- Idempotente e não destrutivo.
-- ============================================================

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- 1) Itens operacionais com empresa_id para RLS direto.
alter table public.nota_fiscal_itens add column if not exists empresa_id uuid references public.empresas(id) on delete cascade;
update public.nota_fiscal_itens nfi
set empresa_id = nf.empresa_id
from public.notas_fiscais nf
where nfi.nota_id = nf.id and nfi.empresa_id is null;
create index if not exists idx_nota_fiscal_itens_empresa on public.nota_fiscal_itens(empresa_id, nota_id);

alter table public.evento_itens add column if not exists empresa_id uuid references public.empresas(id) on delete cascade;
update public.evento_itens ei
set empresa_id = e.empresa_id
from public.eventos e
where ei.evento_id = e.id and ei.empresa_id is null;
create index if not exists idx_evento_itens_empresa on public.evento_itens(empresa_id, evento_id);

-- 2) Trigger de venda corrigida: pagamentos ficam sob responsabilidade do service,
-- permitindo múltiplas formas de pagamento sem duplicidade automática.
create or replace function public.vf_venda_after_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_forma text := coalesce(NEW.forma_pagamento, 'multiplos');
  v_descricao text := 'Venda ' || coalesce('#' || NEW.numero::text, substring(NEW.id::text, 1, 8)) || ' — ' || coalesce(NEW.produto_nome, 'Venda');
begin
  insert into public.lancamentos_financeiros (
    empresa_id, tipo, descricao, categoria, valor, data_vencimento, data_pagamento,
    forma_pagamento, status, origem, origem_id, observacoes
  ) values (
    NEW.empresa_id, 'receita', v_descricao, 'Vendas', coalesce(NEW.total, 0),
    coalesce(NEW.data_venda, current_date), coalesce(NEW.data_venda, current_date),
    v_forma, 'pago', 'venda', NEW.id, 'Gerado automaticamente pela venda.'
  ) on conflict (empresa_id, origem, origem_id) where origem is not null and origem_id is not null do nothing;

  insert into public.contas_receber (
    empresa_id, cliente_id, venda_id, descricao, valor, data_vencimento, data_recebimento,
    forma_pagamento, status, origem, origem_id, observacoes
  ) values (
    NEW.empresa_id, NEW.cliente_id, NEW.id, v_descricao, coalesce(NEW.total, 0),
    coalesce(NEW.data_venda, current_date), coalesce(NEW.data_venda, current_date),
    v_forma, 'recebido', 'venda', NEW.id, 'Liquidada automaticamente pela venda.'
  ) on conflict (empresa_id, origem, origem_id) where origem is not null and origem_id is not null do nothing;

  insert into public.venda_status_historico (empresa_id, venda_id, status_anterior, status_novo, motivo, usuario_id)
  values (NEW.empresa_id, NEW.id, null, coalesce(NEW.status, 'realizada'), 'Venda registrada', auth.uid());

  update public.clientes
  set total_compras = coalesce(total_compras, 0) + coalesce(NEW.total, 0),
      ultima_interacao = now(),
      updated_at = now()
  where id = NEW.cliente_id and empresa_id = NEW.empresa_id;

  perform public.vf_auditar(NEW.empresa_id, 'venda.criar', 'vendas', NEW.id, jsonb_build_object('total', NEW.total, 'cliente_id', NEW.cliente_id));
  return NEW;
end;
$$;

drop trigger if exists tr_vf_venda_after_insert on public.vendas;
create trigger tr_vf_venda_after_insert
after insert on public.vendas
for each row execute function public.vf_venda_after_insert();

-- 3) Função segura de cancelamento/estorno com validação centralizada.
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
    raise exception 'Usuário sem permissão para cancelar/estornar venda.';
  end if;
  if coalesce(v_venda.status, 'realizada') in ('cancelada','estornada') then
    raise exception 'Venda já está %.', v_venda.status;
  end if;

  v_status := case when p_estornar then 'estornada' else 'cancelada' end;

  update public.vendas
  set status = v_status,
      status_entrega = 'cancelado',
      motivo_cancelamento = trim(p_motivo),
      data_cancelamento = now(),
      updated_at = now()
  where id = p_venda_id;

  update public.venda_pagamentos
  set status = case when p_estornar then 'estornado' else 'cancelado' end
  where venda_id = p_venda_id and status <> case when p_estornar then 'estornado' else 'cancelado' end;

  update public.lancamentos_financeiros
  set status = 'cancelado', updated_at = now()
  where origem = 'venda' and origem_id = p_venda_id;

  update public.contas_receber
  set status = 'cancelado', updated_at = now()
  where origem = 'venda' and origem_id = p_venda_id;

  insert into public.venda_status_historico (empresa_id, venda_id, status_anterior, status_novo, motivo, usuario_id)
  values (v_venda.empresa_id, p_venda_id, v_venda.status, v_status, trim(p_motivo), auth.uid());

  perform public.vf_auditar(v_venda.empresa_id, case when p_estornar then 'venda.estornar' else 'venda.cancelar' end, 'vendas', p_venda_id, jsonb_build_object('motivo', trim(p_motivo)));
end;
$$;
grant execute on function public.vf_cancelar_venda(uuid,text,boolean) to authenticated;

-- 4) RLS por módulo em tabelas que ainda podiam ficar apenas com policy antiga ou sem ação granular.
do $$
declare
  rec record;
begin
  for rec in select * from (values
    ('agendamentos','agendamentos'),
    ('notas_fiscais','notas-fiscais'),
    ('nota_fiscal_itens','notas-fiscais'),
    ('fornecedores','fornecedores'),
    ('promocoes','promocoes'),
    ('cardapios','cardapio'),
    ('cardapio_itens','cardapio'),
    ('eventos','eventos'),
    ('evento_itens','eventos'),
    ('despesas','despesas'),
    ('fechamentos_diarios','fechamento'),
    ('push_subscriptions','configuracoes'),
    ('notificacoes_agendadas','agendamentos'),
    ('inventarios_estoque','estoque'),
    ('inventario_itens','estoque'),
    ('deploy_validacoes','auditoria')
  ) as x(tabela, modulo)
  loop
    if to_regclass(format('public.%I', rec.tabela)) is null then
      continue;
    end if;

    execute format('alter table public.%I enable row level security', rec.tabela);
    execute format('drop policy if exists %I on public.%I', 'vf_' || rec.tabela || '_select', rec.tabela);
    execute format('drop policy if exists %I on public.%I', 'vf_' || rec.tabela || '_insert', rec.tabela);
    execute format('drop policy if exists %I on public.%I', 'vf_' || rec.tabela || '_update', rec.tabela);
    execute format('drop policy if exists %I on public.%I', 'vf_' || rec.tabela || '_delete', rec.tabela);

    execute format('create policy %I on public.%I for select using (public.is_master_admin() or (empresa_id = public.get_empresa_id() and public.vf_can(%L, %L, empresa_id)))',
      'vf_' || rec.tabela || '_select', rec.tabela, rec.modulo, 'ver');
    execute format('create policy %I on public.%I for insert with check (public.is_master_admin() or (empresa_id = public.get_empresa_id() and public.vf_can(%L, %L, empresa_id)))',
      'vf_' || rec.tabela || '_insert', rec.tabela, rec.modulo, 'criar');
    execute format('create policy %I on public.%I for update using (public.is_master_admin() or (empresa_id = public.get_empresa_id() and public.vf_can(%L, %L, empresa_id))) with check (public.is_master_admin() or (empresa_id = public.get_empresa_id() and public.vf_can(%L, %L, empresa_id)))',
      'vf_' || rec.tabela || '_update', rec.tabela, rec.modulo, 'editar', rec.modulo, 'editar');
    execute format('create policy %I on public.%I for delete using (public.is_master_admin() or (empresa_id = public.get_empresa_id() and public.vf_can(%L, %L, empresa_id)))',
      'vf_' || rec.tabela || '_delete', rec.tabela, rec.modulo, 'excluir');
  end loop;
end $$;

-- 5) Atualiza validação de banco novo com a própria 017.
insert into public.deploy_validacoes (versao, checklist, aprovado, responsavel)
select '017', jsonb_build_object(
  'api_monolitico', 'src/lib/api.ts deve ficar apenas como compatibilidade',
  'servicos_reais', true,
  'venda_pagamentos_sem_duplicidade_trigger', true,
  'rls_modulos', true,
  'empresa_id_itens_nf_evento', true
), true, auth.uid()
where to_regclass('public.deploy_validacoes') is not null
on conflict do nothing;
