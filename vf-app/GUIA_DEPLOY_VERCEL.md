# Guia Deploy Vercel — VF Nexus

## Projeto
- Framework: Next.js
- Root Directory: `vf-app`
- Build Command: `npm run build`
- Install Command: `npm install`
- Output Directory: padrão/vazio

## Variáveis necessárias
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `MASTER_ADMIN_EMAILS`
- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT`
- `CRON_SECRET`
- `ANTHROPIC_API_KEY` opcional
- `ANTHROPIC_MODEL` opcional
- `IA_DAILY_LIMIT` opcional

Depois de mudar variáveis, faça Redeploy.
