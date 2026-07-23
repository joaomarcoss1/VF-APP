# Guia de deploy — VF Nexus V9.4

## 1. Homologação local

```powershell
Copy-Item .env.local.example .env.local
.\VALIDAR_V9_4.ps1
npm run dev
```

Teste ao menos duas empresas, um usuário comum, um administrador de empresa e o Admin Master.

## 2. Supabase

1. Faça backup.
2. Execute `048_vf_nexus_v9_4_security_tenant_hardening.sql`.
3. Execute `DIAGNOSTICO_SEGURANCA_V9_4.sql`.
4. Confirme helpers, RLS, policies, índices e ausência de registros críticos sem empresa.

## 3. Vercel

- Framework: Next.js.
- Root Directory: vazio.
- Install Command:

```text
npm ci --legacy-peer-deps --no-audit --no-fund --registry=https://registry.npmjs.org/
```

- Build Command: `npm run build`.
- Output: `.next`.
- Node: 22.x.

Configure variáveis públicas e privadas conforme `.env.local.example`.

## 4. Stripe

- Configure `STRIPE_SECRET_KEY` e `STRIPE_WEBHOOK_SECRET`.
- Registre o endpoint correto.
- Envie evento de teste assinado.
- Confirme idempotência e atualização da assinatura.

Sem secret, o endpoint deve retornar erro de configuração.

## 5. WhatsApp

- Configure provider e credenciais no servidor.
- Teste texto e PDF.
- Confirme fallback quando o provider estiver indisponível.
- Confirme que tokens não aparecem no bundle client.

## 6. Pós-deploy

- Teste login e troca de empresa.
- Teste Admin Master operando uma empresa.
- Teste venda, estoque, financeiro e recibo.
- Instale o PWA e verifique atualização manual.
- Acompanhe logs, webhooks, fila WhatsApp e auditoria.
