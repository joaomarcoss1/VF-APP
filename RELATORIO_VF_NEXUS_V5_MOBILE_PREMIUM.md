# VF Nexus V5 — Mobile Premium e UX Profissional

Esta versão aplica uma camada estrutural de design e experiência mobile-first ao VF Nexus Modular por Ramos.

## Melhorias principais

- Tela inicial de ramo redesenhada com menos texto, cards compactos e visual premium.
- Tema claro, escuro e automático por sistema, com persistência em localStorage e aplicação antes da renderização para reduzir flash visual.
- CSS global reforçado para modo claro/escuro, componentes premium, safe-area, PWA e operação mobile.
- Manifest PWA atualizado com id, start_url, orientation e atalhos operacionais.
- Design mobile-first para cards, bottom navigation, bottom sheets, ações com toque e áreas fixas.
- Reforço visual para Atendimento, Cozinha, Bar/Drinks e Caixa em telas pequenas.
- Funções por ramo continuam ocultas: módulos fora do ramo não devem aparecer no menu nem no mobile.

## Validação recomendada

```powershell
npm install --legacy-peer-deps
npm run typecheck
npm run lint
npm test
npm run build
```

## Observação

A melhoria é focada em UX, PWA e design estrutural, sem remover a arquitetura de ramos, permissões por setor e isolamento multiempresa já implementados na V4.
