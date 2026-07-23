-- Índices de alta frequência, criados somente quando tabela/coluna existem.
do $$ declare t text; begin
 foreach t in array array['produtos','clientes','vendas','movimentacoes_estoque','contas_pagar','contas_receber','compras','eventos','notificacoes_central','reservas','deliveries','logs_auditoria'] loop
  if to_regclass('public.'||t) is not null and exists(select 1 from information_schema.columns where table_schema='public' and table_name=t and column_name='empresa_id') then
   execute format('create index if not exists %I on public.%I(empresa_id)', 'vf93_'||t||'_empresa_idx', t);
   if exists(select 1 from information_schema.columns where table_schema='public' and table_name=t and column_name='created_at') then execute format('create index if not exists %I on public.%I(empresa_id,created_at desc)','vf93_'||t||'_empresa_created_idx',t); end if;
   if exists(select 1 from information_schema.columns where table_schema='public' and table_name=t and column_name='status') then execute format('create index if not exists %I on public.%I(empresa_id,status)','vf93_'||t||'_empresa_status_idx',t); end if;
  end if;
 end loop;
end $$;
