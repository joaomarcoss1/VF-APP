# VF Nexus V9 — Estabilização, Mobile Real, Multiempresa e Segurança

Versão focada em estabilização, sem adicionar grandes funções novas.

## Correções aplicadas

- Middleware liberando `/`, `/selecionar-ramo`, `/login`, `/auth`, `/atendimento/login-funcionario`, catálogo/cardápio público e assets.
- Login do Admin Master corrigido para permitir acesso sem `empresa_id` fixo.
- Contexto multiempresa reforçado com empresa operacional selecionada para Admin Master.
- Menus por ramo estabilizados para evitar flicker e módulos sumindo durante o carregamento.
- PDV, Scanner e Etiquetas preservados nos ramos comerciais.
- Mobile navigation ajustada para não sobrepor nomes e não mostrar símbolos estranhos.
- Tema claro/escuro reforçado com contraste real e variáveis visuais de fallback.
- Branding limitado a acentos para não quebrar fundo/texto do modo claro/escuro.
- Service Worker V9 sem reload agressivo e sem cache de HTML autenticado.
- `/atendimento/bar-drinks` redireciona para `/bar-drinks`, reduzindo duplicidade.
- APIs sensíveis com validação de sessão/perfil antes de usar service role.
- Nova migration `038_vf_nexus_v9_estabilizacao_restaurante_tenant.sql` para setores, índices e compatibilidade.
- Migrations 035 e 036 ajustadas para evitar `empresas.codigo` e compatibilidade `modulo`/`modulo_codigo`.
- Arquivo `page.tsx.bak` removido.

## Pontos de validação recomendados

- Rodar migrations 035, 036 e 038 em ambiente de teste/Supabase.
- Validar login Admin Master e login operacional de funcionário.
- Validar que empresa A não visualiza dados da empresa B.
- Validar ramos comerciais com PDV, Scanner e Etiquetas visíveis.
- Remover PWA antigo do celular antes de instalar após o deploy, para limpar Service Worker antigo.

## Comandos

```powershell
npm ci --legacy-peer-deps --no-audit --no-fund
npm run typecheck
npm run lint
npm test
npm run build
```
