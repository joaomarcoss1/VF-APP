-- ============================================================
-- VF Nexus — Validação rápida para banco novo
-- Execute após aplicar todas as migrations 001–017.
-- ============================================================

-- 1. Tabelas críticas existentes.
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'empresas','perfis','produtos','clientes','vendas','venda_itens','venda_pagamentos','venda_status_historico',
    'lancamentos_financeiros','contas_pagar','contas_receber','produto_estoque','movimentacoes_produto_estoque',
    'compras','compra_itens','ordens_servico','logs_auditoria','permissoes_equipe','master_admins','inventarios_estoque',
    'notas_fiscais','nota_fiscal_itens','eventos','evento_itens','cardapios','cardapio_itens','fechamentos_diarios'
  )
order by table_name;

-- 2. Funções e triggers críticas.
select routine_name
from information_schema.routines
where routine_schema = 'public'
  and routine_name in ('get_empresa_id','is_master_admin','vf_can','vf_auditar','vf_cancelar_venda','vf_venda_after_insert','vf_compra_after_insert','vf_compra_item_after_insert')
order by routine_name;

select tgname as trigger_name, relname as tabela
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
where not tgisinternal
  and tgname in ('tr_vf_venda_after_insert','tr_vf_venda_item_after_insert','tr_vf_compra_after_insert','tr_vf_compra_item_after_insert','tr_vf_os_after_update')
order by relname, tgname;

-- 3. RLS ligado nas tabelas críticas.
select relname as tabela, relrowsecurity as rls_ativo
from pg_class
where relnamespace = 'public'::regnamespace
  and relname in ('vendas','venda_itens','venda_pagamentos','lancamentos_financeiros','contas_pagar','contas_receber','produto_estoque','compras','ordens_servico','logs_auditoria','permissoes_equipe','notas_fiscais','nota_fiscal_itens','eventos','evento_itens')
order by relname;

-- 4. Policies RBAC/action granulares criadas.
select tablename, policyname, cmd
from pg_policies
where schemaname = 'public'
  and (policyname like '%_rbac' or policyname like 'vf_%')
order by tablename, policyname;

-- 5. Colunas novas de venda/cancelamento/pagamento/itens.
select table_name, column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and ((table_name = 'vendas' and column_name in ('status_entrega','valor_recebido','troco','motivo_cancelamento','data_cancelamento'))
    or (table_name = 'venda_pagamentos' and column_name in ('valor_recebido','troco','conciliado','conciliado_em'))
    or (table_name = 'ordens_servico' and column_name in ('checklist','materiais','fotos','assinaturas','orcamento_aprovado','recebimento_status'))
    or (table_name in ('nota_fiscal_itens','evento_itens') and column_name = 'empresa_id'))
order by table_name, column_name;

-- 6. Índices de origem para evitar duplicidades.
select indexname
from pg_indexes
where schemaname='public'
  and indexname in ('ux_lanc_fin_origem_empresa','ux_contas_receber_origem_empresa','ux_contas_pagar_origem_empresa','idx_vendas_empresa_data_status','idx_venda_pagamentos_empresa_data','idx_nota_fiscal_itens_empresa','idx_evento_itens_empresa')
order by indexname;

-- 7. Módulos por ramo principais.
select tipo_empresa, modulo, ativo, ordem
from public.setor_modulos
where tipo_empresa in ('restaurante','roupas','prestador_servico')
order by tipo_empresa, ordem;

-- 8. Teste lógico de permissão do usuário autenticado atual.
select public.get_empresa_id() as empresa_atual,
       public.is_master_admin() as master_admin,
       public.vf_can('vendas','criar') as pode_criar_venda,
       public.vf_can('vendas','cancelar') as pode_cancelar_venda,
       public.vf_can('master-admin','impersonar') as pode_impersonar;

-- 9. Validação complementar da versão 018.
select table_name
from information_schema.tables
where table_schema='public'
  and table_name in ('comprovantes_historico','notificacoes_central','equipe_convites','impersonar_sessoes')
order by table_name;

select column_name, data_type
from information_schema.columns
where table_schema='public' and table_name='master_admins' and column_name in ('user_id','email','ativo','updated_at')
order by column_name;

select routine_name
from information_schema.routines
where routine_schema='public'
  and routine_name in ('is_master_admin','vf_can','vf_iniciar_impersonar','vf_encerrar_impersonar','vf_cancelar_venda')
order by routine_name;

select tablename, count(*) as policies_rbac
from pg_policies
where schemaname='public' and policyname like 'vf_%'
group by tablename
order by tablename;

select versao, aprovado, checklist
from public.deploy_validacoes
where versao in ('016','017','018')
order by versao;

-- ============================================================
-- Validações VF Nexus v8 / migration 019
-- ============================================================
select '019_tabelas_operacionais' as validacao, count(*) as encontrados
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'produto_variacoes','produto_variacao_estoque','movimentacoes_variacao_estoque',
    'producoes_lote','producao_lote_itens','orcamentos_servico',
    'ordens_servico_checklist','ordens_servico_materiais','ordens_servico_fotos','ordens_servico_assinaturas',
    'inventarios_estoque','inventario_itens'
  );

select '019_funcoes_operacionais' as validacao, count(*) as encontrados
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('vf_registrar_producao_lote','vf_finalizar_ordem_servico','vf_fechar_inventario','aplicar_movimentacao_variacao_estoque');

select '019_rls_operacional' as validacao, tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in ('produto_variacoes','producoes_lote','orcamentos_servico','inventarios_estoque','inventario_itens')
order by tablename;

select '019_policies_operacionais' as validacao, tablename, count(*) as policies
from pg_policies
where schemaname = 'public'
  and tablename in ('produto_variacoes','produto_variacao_estoque','movimentacoes_variacao_estoque','producoes_lote','producao_lote_itens','orcamentos_servico','ordens_servico_checklist','ordens_servico_materiais','ordens_servico_fotos','ordens_servico_assinaturas','inventarios_estoque','inventario_itens')
group by tablename
order by tablename;

-- ============================================================
-- Validações VF Nexus v9 / migration 020
-- ============================================================
select '020_tabelas_integracoes_billing' as validacao, count(*) as encontrados
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'integracoes_configuracoes','billing_webhook_eventos','assinaturas_historico','exportacoes_relatorios','deploy_validacoes'
  );

select '020_colunas_assinaturas_saas' as validacao, column_name
from information_schema.columns
where table_schema='public' and table_name='assinaturas'
  and column_name in ('provider','provider_customer_id','provider_subscription_id','trial_ate','cancelada_em','bloqueada_em','metadata')
order by column_name;

select '020_funcoes_integracoes' as validacao, p.proname
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('vf_registrar_billing_webhook','vf_registrar_exportacao_relatorio','vf_registrar_deploy_validacao')
order by p.proname;

select '020_rls_integracoes' as validacao, tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in ('integracoes_configuracoes','billing_webhook_eventos','assinaturas_historico','exportacoes_relatorios','deploy_validacoes')
order by tablename;

select '020_policies_integracoes' as validacao, schemaname, tablename, count(*) as policies
from pg_policies
where (schemaname = 'public' and tablename in ('integracoes_configuracoes','billing_webhook_eventos','assinaturas_historico','exportacoes_relatorios','deploy_validacoes'))
   or (schemaname = 'storage' and tablename = 'objects' and policyname like 'vf_storage_%')
group by schemaname, tablename
order by schemaname, tablename;

select '020_buckets_storage' as validacao, id, public
from storage.buckets
where id in ('vf-comprovantes','vf-os-anexos','vf-assinaturas','vf-branding','vf-relatorios')
order by id;
