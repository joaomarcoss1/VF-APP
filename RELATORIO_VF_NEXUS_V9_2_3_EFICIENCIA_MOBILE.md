# VF Nexus V9.2.3 — Correção de eficiência, mobile e sobreposição

## Objetivo
Correção emergencial e estrutural sobre a V9.2.2 para reduzir travamentos, falsos bloqueios de acesso, nomes tortos/sobrepostos e lentidão em web/mobile antes de piloto real.

## Correções aplicadas

### Build e estabilidade
- `package.json` agora usa `node scripts/build-stable.mjs`.
- Build força `next build --webpack`, evitando o caminho padrão com Turbopack.
- `next.config.js` mantém o typecheck separado via `npm run typecheck` e evita duplicidade de validação dentro do build do Next, que vinha travando.
- `experimental.cpus = 1` reduz consumo excessivo em ambiente pequeno de build.

### Mobile e nomes sobrepostos
- `MobileNav` foi reduzido para 3 módulos principais + botão “Mais”, evitando 5 colunas apertadas em telas pequenas.
- Labels mobile foram encurtados e truncados de forma controlada.
- CSS reforçado contra `writing-mode`, transformações, quebra ruim de palavras, textos tortos, card estourando e overflow horizontal.
- Bottom navigation ganhou largura e limites mais seguros.
- Animações e blur foram reduzidos no mobile para melhorar performance.

### Travamento e acesso negado falso
- `AppShell` agora espera o cliente estar pronto antes de decidir permissões.
- A verificação de permissão só ocorre após perfil e módulos estarem resolvidos.
- O conteúdo principal deixou de depender de classes que forçavam rolagem interna problemática em alguns celulares.

### PWA
- Cache atualizado para `vf-nexus-v9-2-3-stable`.
- Mantido comportamento sem reload automático.

### Módulos e carregamento
- `useModulosEmpresa` agora usa chave estável em estado, escuta mudanças de empresa operacional e evita recomputações bruscas no render.
- Revalidação em foco/reconexão continua desativada para evitar menus piscando e recarregamento de módulos.

## Validações executadas
- `npm ci --legacy-peer-deps --no-audit --no-fund --prefer-offline`: aprovado.
- `npm run typecheck`: aprovado.
- `npm run lint`: aprovado.
- `npm test`: aprovado, 25 arquivos / 58 testes.

## Observação honesta sobre build
O build do Next neste ambiente ainda chega à compilação e geração de páginas, mas o processo Next pode ficar preso em rastreamento final de build. A V9.2.3 força webpack e reduz duplicidade de checagem, mas é obrigatório confirmar o deploy final na Vercel. Se a Vercel ainda travar em build traces, a próxima correção deve migrar definitivamente para Next 15 + React 18 com novo lockfile gerado localmente.

## Validação manual antes de piloto real
1. Remover app/PWA antigo do celular.
2. Limpar cache do navegador no celular.
3. Rodar migrations 041 a 044 no Supabase, se ainda não foram executadas.
4. Testar em uma empresa piloto: login, dashboard, PDV, estoque, atendimento, cozinha, bar/drinks, caixa, reservas e financeiro.
5. Validar o Admin Master operando uma empresa selecionada.
