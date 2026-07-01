# VF Nexus — comandos corretos para rodar no VS Code

Use Node 20 pelo fnm antes de instalar dependências.

```powershell
cd C:\Users\joaom\Downloads\vf-nexus-auditado-corrigido-funcional-v2\vf-app
fnm use 20
node -v
npm -v
npm install
npm run typecheck
npm run lint
npm run build
npm run dev
```

Se não houver `.env.local`, crie na pasta `vf-app`:

```powershell
notepad .env.local
```

Variáveis esperadas:

```env
NEXT_PUBLIC_SUPABASE_URL=https://pvethzuhxhcvrygqenzk.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=SUA_CHAVE_PUBLICA
SUPABASE_SERVICE_ROLE_KEY=SUA_SERVICE_ROLE_KEY
MASTER_ADMIN_EMAILS=joaomarcosgpp@hotmail.com,joaomarcosgpexp@gmail.com
VAPID_PUBLIC_KEY=SUA_VAPID_PUBLIC_KEY
VAPID_PRIVATE_KEY=SUA_VAPID_PRIVATE_KEY
VAPID_SUBJECT=mailto:joaomarcosgpp@hotmail.com
CRON_SECRET=vfapp_jdev_120400
ANTHROPIC_MODEL=claude-sonnet-4-6
IA_DAILY_LIMIT=50
```
