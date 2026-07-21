# Checklist VF Nexus V14.2 — PDV, Scanner, Etiquetas e Importação

## Build e deploy
- [ ] `npm ci --legacy-peer-deps --no-audit --no-fund --registry=https://registry.npmjs.org/`
- [ ] `npm run typecheck`
- [ ] `npm run lint`
- [ ] `npm run test`
- [ ] `npm run build`
- [ ] Deploy Vercel sem cache.

## PDV profissional
- [ ] Textos sem encoding quebrado.
- [ ] Produtos com ícones consistentes, sem emoji corrompido.
- [ ] Busca por nome, SKU, código e categoria.
- [ ] Scanner físico adiciona produto ao carrinho com Enter.
- [ ] Carrinho calcula subtotal, custo e lucro.
- [ ] Venda online usa fluxo transacional.
- [ ] Venda offline entra em fila.
- [ ] Layout desktop e mobile funcional.

## Scanner
- [ ] Câmera abre em HTTPS.
- [ ] BarcodeDetector lê EAN/Code128 quando disponível.
- [ ] Campo manual funciona.
- [ ] Produto encontrado mostra estoque, preço, custo e ações.
- [ ] Ações para PDV, estoque e etiqueta funcionam.

## Etiquetas
- [ ] Etiqueta simples com nome, preço e código.
- [ ] Promoção relâmpago com data final.
- [ ] Etiqueta institucional com logo/QR.
- [ ] Cores editáveis.
- [ ] Lote salva no Supabase.
- [ ] Impressão A4 e térmica com CSS print.
- [ ] Exportação ZPL gerada.

## Importação
- [ ] Importação estoque por XLSX/CSV.
- [ ] Prévia e validação linha por linha.
- [ ] Produtos criados/atualizados.
- [ ] Estoque atualizado.
- [ ] Importação de etiquetas por arquivo gera lote.

## Supabase
- [ ] Aplicar `026_vf_nexus_v14_2_pdv_scanner_etiquetas_importacao.sql`.
- [ ] RLS por empresa aplicado.
- [ ] Índices de códigos criados.
