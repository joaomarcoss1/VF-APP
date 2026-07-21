# Checklist de Deploy — VF Nexus v7

## 1. Ambiente local
- [ ] Usar Node 20: `nvm use 20`.
- [ ] Confirmar npm 10: `npm -v`.
- [ ] Instalar dependências: `npm install`.
- [ ] Conferir `.env.local` baseado em `.env.local.example`.

## 2. Variáveis obrigatórias
- [ ] `NEXT_PUBLIC_SUPABASE_URL`.
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- [ ] `SUPABASE_SERVICE_ROLE_KEY`.
- [ ] `MASTER_ADMIN_EMAILS` ou registro correspondente em `public.master_admins`.

## 3. Variáveis opcionais/reais
- [ ] `ANTHROPIC_API_KEY` para IA real.
- [ ] `ANTHROPIC_MODEL`.
- [ ] `IA_DAILY_LIMIT`.
- [ ] `VAPID_PUBLIC_KEY`.
- [ ] `VAPID_PRIVATE_KEY`.
- [ ] `VAPID_SUBJECT`.
- [ ] `CRON_SECRET`.

## 4. Validação técnica
Executar:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
npm audit --omit=dev --audit-level=high
```

Critério:
- [ ] Typecheck aprovado.
- [ ] Lint sem erros; warnings conhecidos podem ser tratados em sprint posterior.
- [ ] Testes aprovados.
- [ ] Build aprovado.
- [ ] Audit high sem vulnerabilidades.

## 5. Supabase
- [ ] Aplicar todas as migrations até `018_vf_nexus_commercial_readiness.sql`.
- [ ] Executar `supabase/VALIDACAO_BANCO_NOVO.sql`.
- [ ] Confirmar que `master_admins.user_id` existe.
- [ ] Confirmar função `is_master_admin()`.
- [ ] Confirmar função `vf_can(text,text)`.
- [ ] Confirmar função `vf_cancelar_venda(...)`.
- [ ] Confirmar tabelas `comprovantes_historico`, `notificacoes_central`, `equipe_convites`, `impersonar_sessoes`.
- [ ] Confirmar RLS ativo em tabelas críticas.
- [ ] Confirmar policies `vf_*` criadas.

## 6. Validação funcional
- [ ] Login com usuário comum.
- [ ] Usuário comum não acessa Master Admin.
- [ ] Master Admin acessa painel master.
- [ ] Sidebar mostra apenas módulos permitidos.
- [ ] Rota não permitida mostra acesso negado.
- [ ] Cadastrar produto.
- [ ] Registrar venda com múltiplos itens.
- [ ] Registrar venda com múltiplas formas de pagamento.
- [ ] Validar troco em pagamento dinheiro.
- [ ] Cancelar venda com motivo obrigatório.
- [ ] Estornar venda com motivo obrigatório.
- [ ] Conferir auditoria de cancelamento/estorno.
- [ ] Conferir estoque após venda/cancelamento.
- [ ] Conferir financeiro após venda/cancelamento.
- [ ] Registrar compra.
- [ ] Conferir entrada de estoque por compra.
- [ ] Conferir conta a pagar por compra.
- [ ] Gerar relatório.
- [ ] Exportar PDF/CSV.
- [ ] Rodar onboarding.
- [ ] Testar mobile.

## 7. Vercel
- [ ] Configurar Node 20.
- [ ] Usar `npm install`.
- [ ] Usar `npm run build`.
- [ ] Configurar variáveis de ambiente.
- [ ] Confirmar cron de notificações.
- [ ] Fazer deploy em Preview antes da Produção.
- [ ] Validar login e rotas protegidas no Preview.

## 8. Operação
- [ ] Criar usuário Master Admin no Supabase.
- [ ] Cadastrar 1 empresa piloto.
- [ ] Cadastrar módulos por ramo.
- [ ] Rodar primeiro fluxo de venda/financeiro/estoque.
- [ ] Documentar erros reais do piloto.

## Validação adicional v8

- [ ] Aplicar migration `019_vf_nexus_operational_completion.sql` em banco limpo.
- [ ] Validar tabelas `produto_variacoes`, `produto_variacao_estoque` e `movimentacoes_variacao_estoque`.
- [ ] Validar produção em lote com `vf_registrar_producao_lote`.
- [ ] Validar fechamento de inventário com `vf_fechar_inventario`.
- [ ] Validar finalização de OS com `vf_finalizar_ordem_servico`.
- [ ] Validar policies RLS das novas tabelas operacionais.
- [ ] Configurar bucket Supabase Storage antes de usar upload real de fotos/assinaturas de OS.
- [ ] Rodar `npm run test` e confirmar o teste `operacional-v8.test.ts`.

## Checklist adicional v9 — integrações, Storage e billing

- [ ] Aplicar a migration `020_vf_nexus_integrations_storage_billing.sql`.
- [ ] Confirmar criação dos buckets `vf-comprovantes`, `vf-os-anexos`, `vf-assinaturas`, `vf-branding` e `vf-relatorios`.
- [ ] Validar policies de Storage por `empresa_id`.
- [ ] Configurar `BILLING_WEBHOOK_SECRET` em produção.
- [ ] Testar `/api/billing/webhook` com payload assinado HMAC.
- [ ] Confirmar registros em `billing_webhook_eventos`.
- [ ] Confirmar histórico em `assinaturas_historico`.
- [ ] Confirmar registro de exportações em `exportacoes_relatorios`.
- [ ] Configurar credenciais reais apenas quando for ativar provedor externo: Asaas, Mercado Pago, Stripe, Evolution API, SMTP ou Anthropic.
- [ ] Executar `supabase/VALIDACAO_BANCO_NOVO.sql` após aplicar até a migration 020.
