# Guia de Etiquetas e Scanner — VF Nexus V14.1

## Etiquetas
Acesse `/etiquetas`, selecione produtos, informe quantidade, escolha o formato e clique em **Salvar lote e imprimir**.

Formatos incluídos:
- A4 3 colunas;
- A4 2 colunas;
- Térmica 58mm;
- Térmica 80mm;
- Personalizado.

O sistema gera código interno CODE128 quando o produto ainda não possui código.

## Scanner
Acesse `/scanner`, permita a câmera e aponte para o código de barras. Em navegadores compatíveis, a leitura acontece pela BarcodeDetector API. Também é possível digitar o código manualmente ou usar scanner físico USB/Bluetooth.

Fluxo completo:
Produto → Etiquetas → Impressão → Scanner → Produto no estoque → PDV.
