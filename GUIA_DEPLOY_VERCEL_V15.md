# Guia Deploy Vercel V15

Configurações recomendadas:

- Root Directory: vazio
- Framework Preset: Next.js
- Install Command: `npm ci --legacy-peer-deps --no-audit --no-fund --registry=https://registry.npmjs.org/`
- Build Command: `npm run build`
- Output Directory: `.next`

Variáveis obrigatórias:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SITE_URL=
BILLING_PROVIDER=manual
BILLING_WEBHOOK_SECRET=
```

Após push, usar `Redeploy without Build Cache`.
