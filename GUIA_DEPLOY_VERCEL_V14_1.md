# Guia Deploy Vercel V14.1

Configuração:

```text
Root Directory: vazio
Framework Preset: Next.js
Install Command: npm ci --legacy-peer-deps --no-audit --no-fund --registry=https://registry.npmjs.org/
Build Command: npm run build
Output Directory: .next
```

Variáveis recomendadas:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SITE_URL=
BILLING_PROVIDER=manual
BILLING_WEBHOOK_SECRET=
MERCADOPAGO_ACCESS_TOKEN=
STRIPE_SECRET_KEY=
NEXT_PUBLIC_ALLOW_NON_TRANSACTIONAL_DEV_FALLBACK=false
```
