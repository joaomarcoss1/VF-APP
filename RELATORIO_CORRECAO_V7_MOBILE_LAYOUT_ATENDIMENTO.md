# VF Nexus V7 — Correção de mobile, tema, módulos e estabilidade

Esta versão corrige problemas observados na V6:

- Mobile com nomes sobrepostos e símbolos estranhos.
- Modo claro com baixo contraste e texto ilegível.
- Fundos apagando textos em cards, atendimento e painéis.
- PDV, Scanner e Etiquetas ocultos indevidamente.
- Modo atendimento ficando instável por carregamento de módulos.
- Tela piscando e sensação de atualização automática causada por Service Worker agressivo.
- Scroll mobile travado por regras globais de `overflow:hidden`.

## Correções aplicadas

1. **Mobile navigation refeito**
   - Bottom navigation agora usa rótulos curtos e seguros.
   - Ícones estranhos foram substituídos por siglas/texto curto.
   - Labels têm limite visual e não se sobrepõem.

2. **Contraste claro/escuro corrigido**
   - Variáveis de tema foram reforçadas no final do `globals.css`.
   - Cards, inputs, painéis, menus e módulos usam `var(--vf-text)`, `var(--vf-card)`, `var(--vf-surface)` e `var(--vf-border)`.
   - O modo claro não deixa texto branco em fundo claro.

3. **Mobile real com scroll corrigido**
   - Removido travamento global de rolagem no mobile.
   - `.vf-app-shell` não força mais `height:100dvh` com `overflow:hidden`.
   - Telas longas podem rolar corretamente.

4. **PDV, Scanner e Etiquetas restaurados**
   - Adicionados novamente como módulos oficiais:
     - `pdv`
     - `scanner`
     - `etiquetas`
   - Incluídos nos módulos padrão dos ramos comerciais.
   - Continuam obedecendo a lógica por ramo/Admin Master.

5. **Atendimento mais estável**
   - `useModulosEmpresa` agora tem fallback local enquanto carrega.
   - Evita tela piscando com “módulo não liberado” antes da consulta terminar.
   - Atendimento, cozinha, bar/drinks e caixa não somem durante carregamento inicial.

6. **Service Worker estabilizado**
   - Removido `skipWaiting()` automático no install.
   - Removido cache agressivo de navegação.
   - O app não deve mais ficar “apagando e acendendo” sozinho após atualizações.

7. **Login corrigido para Next 16**
   - `useSearchParams()` foi colocado dentro de componente protegido por `Suspense`.
   - Corrige erro de build da Vercel em `/login`.

## Arquivos principais alterados

- `src/app/globals.css`
- `src/lib/modules.ts`
- `src/config/ramos.ts`
- `src/hooks/useModulosEmpresa.ts`
- `src/components/layout/MobileNav.tsx`
- `src/components/restaurante/OperationalShell.tsx`
- `src/components/ramos/RamoSelection.tsx`
- `src/app/login/page.tsx`
- `src/app/providers.tsx`
- `public/sw.js`

## Observação

Após subir esta versão, no celular pode ser necessário limpar cache ou reinstalar o PWA antigo, porque o navegador pode manter o Service Worker anterior por algum tempo.
