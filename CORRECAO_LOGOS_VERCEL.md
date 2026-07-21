# Correção definitiva das logos na Vercel

## Causa encontrada

As logos estavam fisicamente corretas em `public/`, porém o `middleware.ts` interceptava requisições para arquivos públicos como:

- `/nexlabs-logo.png`
- `/nexlabs-logo-full.png`
- `/icon-192.png`
- `/icon-512.png`
- `/sw.js`

Quando o usuário não estava autenticado, o middleware redirecionava essas URLs para `/auth`. O navegador esperava uma imagem PNG, mas recebia HTML da página de login, então mostrava a imagem como quebrada.

## Correção aplicada

O middleware agora libera qualquer arquivo público/estático antes da validação de sessão:

- caminhos com extensão, como `.png`, `.svg`, `.js`, `.json`, `.ico`, etc.;
- `/_next/`;
- `/manifest.json`;
- `/sw.js`;
- `/favicon.ico`.

## Logos verificadas

Arquivos existentes e válidos:

- `public/nexlabs-logo.png` — PNG 512x512
- `public/nexlabs-logo-full.png` — PNG 1024x1024
- `public/icon-192.png` — PNG 192x192
- `public/icon-512.png` — PNG 512x512

## Configuração Vercel recomendada

Como este ZIP está com o projeto na raiz:

- Root Directory: vazio
- Framework Preset: Next.js
- Install Command: `npm ci --legacy-peer-deps --no-audit --no-fund --registry=https://registry.npmjs.org/`
- Build Command: `npm run build`
- Output Directory: `.next`
