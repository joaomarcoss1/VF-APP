# Auditoria de melhorias — VF Nexus v9

## Objetivo desta rodada

A v9 continua a v8 sem criar tela falsa ou integração simulada. O foco foi fechar pendências que dependiam de estrutura real, mas não de credenciais externas: Storage, billing/webhooks, integrações configuráveis, rastreio de exportações e validação de deploy.

## O que foi aplicado

### 1. Migration 020

Criado o arquivo:

- `supabase/migrations/020_vf_nexus_integrations_storage_billing.sql`

Essa migration adiciona:

- buckets reais de Supabase Storage:
  - `vf-comprovantes`;
  - `vf-os-anexos`;
  - `vf-assinaturas`;
  - `vf-branding`;
  - `vf-relatorios`.
- policies de Storage por `empresa_id` no primeiro segmento do path;
- tabela `integracoes_configuracoes`;
- tabela `billing_webhook_eventos`;
- tabela `assinaturas_historico`;
- tabela `exportacoes_relatorios`;
- ampliação de `assinaturas` com campos de provider, trial, cancelamento, bloqueio e metadata;
- ampliação de `deploy_validacoes` sem quebrar compatibilidade com migrations antigas;
- RPC `vf_registrar_billing_webhook`;
- RPC `vf_registrar_exportacao_relatorio`;
- RPC `vf_registrar_deploy_validacao`.

### 2. Storage real preparado

Criado:

- `src/services/storage.ts`

O service usa Supabase Storage real para:

- gerar path seguro por empresa;
- upload;
- URL assinada;
- listagem;
- registro auditável de exportação.

Nada foi simulado. Sem bucket configurado no Supabase, a operação falhará corretamente.

### 3. Integrações configuráveis

Criado:

- `src/services/integracoes.ts`

A tabela e o service permitem registrar status/metadados de provedores como:

- Asaas;
- Mercado Pago;
- Stripe;
- Evolution API;
- Anthropic;
- SMTP;
- Supabase Storage.

Segredos não são gravados diretamente no banco. O campo `secret_ref` existe apenas para referência segura a variáveis de ambiente/secret manager.

### 4. Billing/webhook real preparado

Criado:

- `src/app/api/billing/webhook/route.ts`
- `src/services/billing.ts`
- `src/lib/integration-rules.ts`

O endpoint exige `BILLING_WEBHOOK_SECRET`. Se a variável não existir, retorna erro 503 para evitar webhook falso.

O endpoint:

- valida assinatura HMAC;
- registra payload real via RPC;
- atualiza assinatura quando o payload contém `assinatura_id`;
- registra histórico de assinatura;
- gera auditoria quando existe `empresa_id`.

### 5. Regras testáveis de integrações

Criado:

- `src/tests/integracoes-v9.test.ts`

Cobre:

- assinatura HMAC;
- bloqueio de assinatura inválida;
- normalização de status de billing;
- cálculo de métricas SaaS;
- geração de path de Storage por empresa.

### 6. Variáveis de ambiente documentadas

Atualizado:

- `.env.local.example`

Inclui variáveis para billing e provedores externos. As integrações permanecem desativadas até que credenciais reais sejam configuradas.

### 7. Validação de banco atualizada

Atualizado:

- `supabase/VALIDACAO_BANCO_NOVO.sql`

Agora valida também a migration 020.

## O que continua dependendo de configuração externa

Não foi inventada integração falsa para:

- cobrança real Asaas/Mercado Pago/Stripe;
- envio WhatsApp Evolution API;
- SMTP real;
- IA Anthropic real;
- push real com VAPID;
- execução de migrations em Supabase remoto.

O código e banco estão preparados, mas esses itens exigem credenciais reais, endpoints reais e configuração de produção.

## Comandos recomendados

```bash
nvm use 20
npm ci
npm run validate
```

Depois, no Supabase limpo, aplicar migrations até a 020 e rodar:

```sql
supabase/VALIDACAO_BANCO_NOVO.sql
```

## Limite honesto da v9

A v9 aprofunda infraestrutura real de operação SaaS, anexos, exportações e billing. Ela não transforma automaticamente o sistema em um produto comercial final com gateways externos funcionando, porque isso exigiria credenciais e contratos de provedores. O que foi feito foi deixar a base pronta e auditável, sem simulação enganosa.
