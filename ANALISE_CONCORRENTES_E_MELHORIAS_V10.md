# VF Nexus V10 — Análise e melhorias aplicadas

## Problemas identificados

1. **Mobile espremido:** o menu lateral tinha `style={{ display: 'flex' }}`, sobrescrevendo o CSS responsivo e fazendo o menu desktop aparecer no celular junto com a barra inferior.
2. **PWA instalado torto:** a altura usava `h-screen`, menos confiável em navegadores mobile. Foi trocado para `100dvh`/`h-dvh` e padding seguro no rodapé.
3. **Paleta não persistia visualmente:** a identidade carregava apenas após query do Supabase; ao reabrir o app, a UI piscava/voltava para o padrão até carregar. Agora existe cache local e aplicação antes da hidratação.
4. **Paleta incompleta:** cores fixas ainda apareciam em menu, cards, bordas, header, bottom nav e relatórios. Foram criadas variáveis globais adicionais e novos campos persistentes.
5. **Relatórios pouco acionáveis:** PDF/CSV agora incluem diagnóstico, CMV, ticket médio, canal forte, produto lucrativo e próximos passos.
6. **Cardápio/catálogo:** foi mantido o fluxo de cardápio pronto para teste: cria cardápio padrão, lista produtos disponíveis, permite exibir/ocultar, destacar, editar descrição e gerar PDF.

## Referências de SaaS/POS analisadas

- Toast: cardápio/menu, estoque, alertas e analytics para restaurante.
- Square: catálogo de produtos, vendas, clientes, inventário e relatórios acessíveis por celular.
- Lightspeed: inventário, relatórios avançados e visão multioperação/multilocal.
- TouchBistro/Loyverse: cardápio, estoque, clientes e relatórios operacionais.

## Melhorias aplicadas

- `Sidebar` realmente oculto no mobile.
- `MobileNav` reorganizado para não espremer conteúdo.
- `AppShell` com `h-dvh`, `min-h-dvh`, scroll horizontal controlado e safe-area.
- `Branding` com cache persistente em `localStorage` e campos adicionais:
  - superfície;
  - superfície 2;
  - borda;
  - menu;
  - card;
  - texto auxiliar.
- Migration `021_vf_nexus_palette_persistence_mobile_readiness.sql` para persistir a paleta completa no Supabase.
- Relatório financeiro PDF com painel de diagnóstico e sugestões práticas.
- Exportação CSV/Excel com abas lógicas: Resumo Executivo, Insights, Vendas, Produtos e Estoque.
- Ajustes de animações, hover, cards e PWA.

## Checklist para testar com primeiros clientes

1. Aplicar todas as migrations do Supabase, incluindo a `021`.
2. Configurar identidade visual em Configurações e salvar.
3. Fechar o PWA e abrir novamente: a paleta deve permanecer aplicada.
4. Criar produto com preço de venda.
5. Abrir Cardápio, selecionar produtos, editar descrições e gerar PDF.
6. Registrar venda.
7. Gerar relatório financeiro PDF e CSV.
8. Testar no celular instalado como PWA.
