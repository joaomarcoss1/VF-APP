# VF Nexus Atendimento V3 — Mobile/PWA, permissões por setor e notificações

## Correções aplicadas

- Reativei e reforcei a experiência mobile/PWA do VF Nexus Atendimento.
- Atualizei `manifest.json` para iniciar no login operacional do atendimento e voltar a permitir instalação como app.
- Atualizei `sw.js` com cache novo, rotas do atendimento, cozinha, caixa e fluxo de atualização do app.
- Adicionei componente `InstallAppPrompt` para exibir botão/instrução de instalação no Android/Chrome e fallback para iPhone/Safari.
- Adicionei alerta de atualização disponível quando uma nova versão do service worker estiver pronta.
- Corrigi o botão de notificações: agora existe painel de notificações, opção de abrir e opção de marcar como lida.
- Adicionei métodos `marcarNotificacaoLida` e `marcarNotificacoesLidas` no service do restaurante.
- Corrigi a pilha de notificações para ter botão real de leitura.
- Criei controle de acesso por setor no front-end operacional.
- Funcionário com setor `atendimento` só acessa `/atendimento` e comandas.
- Funcionário com setor `cozinha` só acessa `/cozinha`.
- Funcionário com setor `caixa` só acessa `/atendimento/caixa` e fechamento.
- Somente `gerente` e login administrativo sem funcionário operacional podem transitar entre setores.
- Menu lateral e navegação mobile agora mostram apenas setores permitidos para o funcionário logado.
- Tela `/setor` bloqueia cards de setores não permitidos para funcionário operacional.
- Incluí migration `034_vf_nexus_atendimento_mobile_permissoes.sql` para reforçar staff, notificações e função de login operacional.
- Adicionei CSS mobile específico para melhorar espaçamento, bottom navigation, safe area, botões, inputs e uso como app instalado.

## Arquivos principais alterados

- `src/app/layout.tsx`
- `src/app/providers.tsx`
- `src/app/setor/page.tsx`
- `src/components/mobile/InstallAppPrompt.tsx`
- `src/components/restaurante/OperationalShell.tsx`
- `src/components/restaurante/NotificationStack.tsx`
- `src/hooks/useRestaurantAccess.ts`
- `src/hooks/useRestaurantNotifications.ts`
- `src/services/restaurante.ts`
- `src/app/globals.css`
- `public/manifest.json`
- `public/sw.js`
- `supabase/migrations/034_vf_nexus_atendimento_mobile_permissoes.sql`

## Observação de validação

O pacote mantém `package.json` e `package-lock.json` na raiz. Para validação completa local, rode:

```powershell
npm install --legacy-peer-deps
npm run typecheck
npm run lint
npm test
npm run build
```

No ambiente de geração, o `typecheck` não pôde ser concluído porque as dependências (`react`, `next`, `@types/node`, etc.) não estavam instaladas em `node_modules`.
