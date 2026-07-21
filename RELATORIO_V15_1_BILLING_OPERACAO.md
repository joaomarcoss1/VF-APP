# VF Nexus V15.1 — Billing Stripe e Operação Comercial

Esta versão adiciona uma camada operacional para preparar o VF Nexus para testes com empresas reais:

- controle de pagamento das empresas;
- bloqueio automático por inadimplência;
- planos SaaS configuráveis;
- assinatura de teste sem prazo até desativação manual pelo Admin Master Global;
- isenção permanente de cobrança por empresa, visível somente ao Admin Master Global;
- diagnóstico técnico;
- auditoria visível;
- matriz visual de permissões;
- fechamento de caixa;
- onboarding empresarial ampliado;
- segurança reforçada por empresa_id.

## Migration

Aplique no Supabase:

```sql
supabase/migrations/030_vf_nexus_v15_1_billing_operacao.sql
```

## Stripe

Configure no `.env.local` e na Vercel:

```env
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_STARTER=price_...
STRIPE_PRICE_PROFISSIONAL=price_...
STRIPE_PRICE_PREMIUM=price_...
SUPABASE_SERVICE_ROLE_KEY=...
```

Webhook Stripe:

```text
https://SEU_DOMINIO/api/stripe/webhook
```

Eventos recomendados:

- checkout.session.completed
- customer.subscription.created
- customer.subscription.updated
- customer.subscription.deleted
- invoice.paid
- invoice.payment_failed

## Regras especiais de assinatura

### Teste sem prazo

O Admin Master Global pode ativar o modo `trial_manual`. A empresa usa o sistema até o teste ser desativado manualmente.

### Cobranças abolidas para sempre

O Admin Master Global pode ativar `isento_permanente`. A empresa fica liberada permanentemente sem depender da Stripe.

Essas funções aparecem somente em `/master/assinaturas`.
