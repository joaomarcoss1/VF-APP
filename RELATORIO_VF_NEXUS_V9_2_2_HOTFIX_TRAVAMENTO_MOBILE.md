# VF Nexus V9.2.2 — Hotfix emergencial de travamento, acesso negado e mobile

Esta versão corrige problemas reportados após a V9.2.1:

- Tela exibindo “Acesso negado” rapidamente antes de liberar acesso.
- Mobile travando ou sem rolagem adequada.
- Nomes e elementos sobrepostos no mobile.
- Bottom navigation cobrindo conteúdo ou deixando labels tortos.
- Layout rígido com `h-dvh` e `overflow-hidden` prendendo a tela em alguns aparelhos.

## Correções aplicadas

### AppShell
Arquivo: `src/components/layout/AppShell.tsx`

- O sistema agora aguarda carregamento real de perfil, empresa, módulos e permissões antes de calcular acesso negado.
- A mensagem inicial passou a ser “Carregando seu ambiente”, evitando falso bloqueio visual.
- `permissionDenied` só é calculado quando os módulos já foram resolvidos.
- O layout principal deixou de forçar `h-dvh`/`overflow-hidden` no container raiz, reduzindo travamentos em mobile.
- O `main` recebeu classe `vf-main` e padding inferior maior para não ser coberto pela navegação mobile.

### RouteGuards
Arquivo: `src/components/security/RouteGuards.tsx`

- Removido o feedback visual agressivo de “Acesso negado” durante validação inicial.
- Durante validação, exibe carregamento/redirect em vez de bloquear visualmente.

### CSS Mobile
Arquivo: `src/app/globals.css`

- Removida trava rígida de `height:100dvh` + `overflow:hidden` no mobile.
- Melhorada rolagem mobile com `overflow-y: visible` e `-webkit-overflow-scrolling: touch`.
- Bottom navigation ajustada para labels menores, centralizados e com ellipsis.
- Adicionados reforços contra overflow horizontal, nomes quebrando layout e cards/tabelas estourando.
- Ajustado padding inferior do conteúdo para evitar botões cobertos pela nav.

## Observação importante

Esta é uma correção emergencial conservadora. Ela não adiciona módulos novos e não altera as regras de banco/multiempresa da V9.2. O objetivo é estabilizar o uso web/mobile imediatamente.

Após subir, remova o PWA antigo do celular e instale novamente para limpar cache antigo.
