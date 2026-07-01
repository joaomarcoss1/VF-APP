# Guia de Integrações VF Nexus v9

## Princípio

A v9 não cria integração falsa. Os módulos abaixo ficam prontos para uso real, mas só ativam funcionamento externo quando as variáveis de ambiente e credenciais verdadeiras forem configuradas.

## Supabase Storage

Buckets esperados pela migration 020:

- `vf-comprovantes`
- `vf-os-anexos`
- `vf-assinaturas`
- `vf-branding`
- `vf-relatorios`

Convenção de path:

```text
<empresa_id>/<modulo>/<timestamp>-<arquivo>
```

Exemplo:

```text
11111111-1111-1111-1111-111111111111/ordens-servico/2026-06-30T20-00-00-foto.jpg
```

As policies usam o primeiro segmento do path como `empresa_id`.

## Billing Webhook

Endpoint:

```text
POST /api/billing/webhook
```

Variável obrigatória:

```env
BILLING_WEBHOOK_SECRET=
```

Assinatura aceita:

- `x-vf-signature`
- `x-hub-signature-256`
- `stripe-signature`
- `x-signature`

O payload precisa ser assinado com HMAC SHA-256 usando o conteúdo bruto do body.

A RPC `vf_registrar_billing_webhook` registra o evento em `billing_webhook_eventos` e, quando o payload contém `assinatura_id`, atualiza o histórico em `assinaturas_historico`.

## Tabelas de integração

- `integracoes_configuracoes`: status/metadados de provedores por empresa.
- `billing_webhook_eventos`: eventos externos recebidos.
- `assinaturas_historico`: trilha de mudanças de assinatura.
- `exportacoes_relatorios`: histórico de relatórios exportados.
- `deploy_validacoes`: evidências de validação antes do deploy.

## Variáveis opcionais documentadas

```env
ASAAS_API_KEY=
MERCADO_PAGO_ACCESS_TOKEN=
STRIPE_SECRET_KEY=
EVOLUTION_API_URL=
EVOLUTION_API_KEY=
SMTP_HOST=
SMTP_USER=
SMTP_PASSWORD=
```

Essas variáveis não foram usadas para simular cobrança, WhatsApp ou e-mail. Elas apenas documentam o caminho correto para ativação real.
