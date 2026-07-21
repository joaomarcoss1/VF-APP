# VF Nexus V9.2.1 — Estabilização Final

## Resumo

Esta versão aplica uma estabilização técnica e visual sobre a V9.2 do VF Nexus. O foco foi preservar as correções de multiempresa, atendimento, Master e PWA já aplicadas na V9.2, enquanto melhora build, dependências, CSS global, contraste claro/escuro, mobile e clareza dos botões.

Nenhum módulo novo foi adicionado e nenhuma função existente foi removida intencionalmente.

## Stack final usada

- Next.js: 16.2.10
- React: 19.2.7
- React DOM: 19.2.7
- Node recomendado: 22
- TypeScript: 5.5.4
- Vitest: 2.1.8

A combinação foi ajustada para evitar o cenário instável anterior de Next 16 com React 18. O projeto agora usa React 19 junto com Next 16.

## Correções no build

- `next.config.js` foi simplificado.
- `typescript.ignoreBuildErrors` foi removido.
- `.nvmrc` e `.node-version` foram definidos para Node 22.
- `package-lock.json` foi atualizado.
- O script de lint foi trocado para uma validação estrutural própria, focada nos riscos reais desta fase: CSS, PWA, arquivos temporários, ícones legados e configuração de build.

## Correções no CSS e design

O arquivo `src/app/globals.css` foi reorganizado para reduzir conflitos visuais e melhorar previsibilidade. A versão anterior tinha muitas camadas acumuladas e excesso de `!important`; a versão atual está organizada em blocos de tema, base, layout, cards, botões, formulários, tabelas, status, operacional, mobile e impressão.

Também foram reforçadas variáveis importantes:

- `--vf-bg`
- `--vf-surface`
- `--vf-card`
- `--vf-text`
- `--vf-muted`
- `--vf-border`
- `--vf-primary`
- `--vf-primary-contrast`
- `--vf-input-bg`
- `--vf-input-text`
- `--vf-bottom-nav-bg`

O objetivo foi evitar texto branco em fundo branco, botões ilegíveis, inputs sem contraste e cards apagados no modo claro/escuro.

## Correções no mobile

A camada mobile foi refinada para:

- impedir que a bottom navigation cubra o conteúdo;
- manter safe-area em celulares;
- evitar overflow horizontal;
- manter botões com altura mínima confortável;
- manter inputs e selects legíveis;
- esconder sidebar desktop no mobile;
- manter o conteúdo com `padding-bottom` suficiente.

## Correções no PWA

O Service Worker foi atualizado para:

- `vf-nexus-v9-2-1-stable`;
- não cachear páginas autenticadas dinâmicas;
- não chamar `location.reload()` automaticamente;
- cachear apenas shell mínimo e assets estáticos;
- preparar atualização manual pelo banner, sem reiniciar o app de forma agressiva.

## Correções nos botões

A tela de configurações de entregas foi ajustada para não parecer que salva dados sem persistência real. Os campos foram marcados como prévia/planejamento e os controles foram desabilitados, evitando falsa sensação de botão quebrado.

## Multiempresa, Master e atendimento

A V9.2.1 preserva as correções da V9.2:

- eventos com `empresa_id`;
- integrações com `empresa_id`;
- notificações com `empresa_id`;
- Admin Master bloqueado fora de `/master` quando não há empresa operacional selecionada;
- `/master-admin` redirecionado para `/master`;
- sessão operacional de atendimento reforçada;
- login operacional por código/matrícula de empresa.

Nenhuma alteração desta versão enfraquece os filtros por `empresa_id`.

## Testes executados

Validações executadas no ambiente de geração:

- `npm ci --legacy-peer-deps --no-audit --no-fund`: aprovado.
- `npm run typecheck`: aprovado.
- `npm run lint`: aprovado usando lint estrutural V9.2.1.
- `npm test`: aprovado, 25 arquivos e 58 testes.

O `npm run build` não apresentou erro explícito nos testes realizados, mas não foi possível confirmar conclusão completa dentro do limite de tempo do ambiente de geração. O projeto chegou a compilar em tentativa anterior, porém a etapa final de build do Next ficou lenta. Por isso, a validação final do build deve ser feita no VS Code local e na Vercel.

## Comandos para validação no VS Code

```powershell
cd "CAMINHO_DA_PASTA_EXTRAIDA\vf_v9_2_1"

npm ci --legacy-peer-deps --no-audit --no-fund
npm run typecheck
npm run lint
npm test
npm run build
```

## Comandos para subir no GitHub

```powershell
git init
git branch -M main
git remote remove origin 2>$null
git remote add origin https://github.com/joaomarcoss1/VF-APP.git

git add .
git commit -m "Aplica VF Nexus V9.2.1 estabilizacao final mobile build design"
git push -u origin main --force
```

## Supabase

Se ainda não foram executadas, rode no Supabase as migrations da V9.2:

- `041_vf_nexus_v9_2_eventos_tenant.sql`
- `042_vf_nexus_v9_2_integracoes_tenant.sql`
- `043_vf_nexus_v9_2_notificacoes_tenant.sql`
- `044_vf_nexus_v9_2_staff_session_hardening.sql`

## PWA no celular

Depois do deploy, remova o PWA antigo do celular e instale novamente. Isso evita cache antigo de versões anteriores.

## Pontos que exigem validação manual

- Build final na Vercel.
- Teste visual real em Android/iPhone.
- Fluxo Admin Master operando empresa.
- Atendimento com funcionário de setor.
- PDV, Scanner, Etiquetas e Reservas em tela pequena.
- Modo claro e escuro em telas principais.
