# VF Nexus — pacote corrigido para GitHub e Vercel

Este pacote foi corrigido para evitar os erros encontrados no deploy:

- `Invalid vercel.json file provided`
- `Node.js 20.x / @supabase/auth-js requires node >=22`
- `npm error Exit handler never called!`
- `package-lock.json` apontando para registry interno
- logos de inicialização e logos internas não carregando por fallback incorreto

## 1. Subir no GitHub

Abra o PowerShell dentro da pasta `vf-app` extraída deste ZIP e rode:

```powershell
cd "CAMINHO_DA_PASTA\vf-app"
git init
git branch -M main
git remote add origin https://github.com/joaomarcoss1/VF-APP.git
git add .
git commit -m "Corrige VF Nexus para deploy Vercel"
git push -u origin main --force-with-lease
```

Caso o remote já exista:

```powershell
git remote set-url origin https://github.com/joaomarcoss1/VF-APP.git
git push -u origin main --force-with-lease
```

## 2. Configuração da Vercel

No projeto correto da Vercel:

- Framework Preset: `Next.js`
- Root Directory: deixe vazio
- Install Command: deixe a Vercel usar o `vercel.json`
- Build Command: deixe a Vercel usar o `vercel.json`
- Node.js Version: `24.x`

O deploy deve mostrar:

```text
Running "install" command: `npm ci --legacy-peer-deps --no-audit --no-fund --registry=https://registry.npmjs.org/`
```

## 3. Variáveis de ambiente

Cadastre na Vercel, no mínimo:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
BILLING_WEBHOOK_SECRET=
```

Se usar IA:

```env
ANTHROPIC_API_KEY=
```

## 4. Logos verificadas

Arquivos conferidos:

- `public/nexlabs-logo.png`
- `public/nexlabs-logo-full.png`
- `public/icon-192.png`
- `public/icon-512.png`

As telas usam o componente `BrandLogo`, com fallback automático para a logo NexLabs caso a empresa ainda não tenha enviado logo própria.
