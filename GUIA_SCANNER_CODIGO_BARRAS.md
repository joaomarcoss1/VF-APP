# Guia do Scanner de Código de Barras

A rota `/scanner` permite ler códigos com câmera, digitar manualmente ou usar scanner físico. A busca consulta `codigo_barras`, `sku`, `codigo_interno` e `codigos_barras_produtos.codigo`.

## Ações disponíveis
- Adicionar ao PDV.
- Ver produto no estoque.
- Gerar etiqueta.
- Cadastrar ou vincular código.

A câmera depende de HTTPS e suporte do navegador a `BarcodeDetector`. Quando não houver suporte, use scanner físico ou digitação manual.
