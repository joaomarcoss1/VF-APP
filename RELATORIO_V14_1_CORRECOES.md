# VF Nexus V14.1 — Correções estruturais, offline, etiquetas e scanner

## Resumo
A V14.1 corrige pontos críticos da V14 Comercial e adiciona funções comerciais reais para uso em pequenos negócios: PWA com offline básico, fila offline de vendas, importação XLSX/CSV real, RLS reforçado, venda transacional obrigatória, módulo de etiquetas com código de barras e scanner por câmera.

## Principais arquivos criados
- `supabase/migrations/025_vf_nexus_v14_1_rls_offline_etiquetas.sql`
- `src/app/(app)/etiquetas/page.tsx`
- `src/app/(app)/etiquetas/imprimir/[loteId]/page.tsx`
- `src/app/(app)/scanner/page.tsx`
- `src/app/(app)/estoque/produto/[id]/page.tsx`
- `src/app/offline/page.tsx`
- `src/lib/barcode.ts`
- `src/lib/offline-db.ts`
- `src/lib/xlsx-reader.ts`
- `src/services/codigos-barras.ts`
- `src/services/etiquetas.ts`
- `src/services/offline-sync.ts`

## Correções aplicadas
- Textos com encoding corrompido foram normalizados para UTF-8.
- O service worker agora possui cache básico e fallback offline, preservando notificações push.
- O PDV passou a aceitar código de barras/SKU e venda offline em fila.
- A venda transacional agora exige RPC V14.1 em produção e bloqueia fallback parcial inseguro.
- A migration V14.1 cria RLS completo para tabelas comerciais, offline, etiquetas e códigos de barras.
- O catálogo público recebeu reforço de slug, RLS e mensagem de erro clara.
- A importação agora lê XLSX/CSV no navegador, valida linhas e salva no Supabase.
- Planos receberam checkout inicial via Mercado Pago, Stripe ou modo manual.
- Etiquetas podem ser geradas, salvas, reimpressas, impressas via navegador e exportadas em ZPL.
- Scanner usa câmera com BarcodeDetector quando disponível e fallback manual/scanner físico.

## Limitações conhecidas
- A leitura automática por câmera depende de suporte do navegador à BarcodeDetector API. Em navegadores sem suporte, use scanner físico ou entrada manual.
- Offline avançado sincroniza vendas pendentes, mas ainda requer teste real de conflito de estoque por cliente.
- Checkout real exige configurar `BILLING_PROVIDER`, chaves do provedor e webhook.
- Relatórios devem ser testados visualmente com dados reais de cada cliente.
