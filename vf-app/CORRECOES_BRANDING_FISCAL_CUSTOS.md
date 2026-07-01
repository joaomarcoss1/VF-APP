# Correções — Branding, relatórios, logo, estoque e custos avançados

## Identidade visual
- Aplicada paleta NexLabs padrão com fundo mais claro e visual mais suave.
- AppShell agora injeta as cores salvas da empresa em variáveis CSS globais.
- Menu, header, cards, inputs, KPIs e componentes base passam a respeitar a paleta da empresa.
- Tela de abertura foi refinada com logo em formato circular/glass, reduzindo aparência quadrada.

## Logo da empresa
- Configurações recebeu upload real de logo por arquivo.
- A logo é enviada para o bucket `logos` no Supabase Storage.
- A logo salva é aplicada no menu, relatórios, cardápios e comprovantes.
- Quando não há logo da empresa, a identidade padrão NexLabs é usada.

## Relatórios e PDFs
- Relatórios agora exibem a identidade da empresa na tela.
- PDF financeiro usa nome, logo e paleta da empresa.
- Exportação Excel foi renomeada para padrão VF Nexus.

## Produtos e custos
- Produto/serviço agora possui custo detalhado:
  - custo base/compra;
  - frete;
  - taxas;
  - embalagem;
  - operacional;
  - outros.
- Custo total é recalculado automaticamente pela soma dos custos detalhados.

## Estoque e notas fiscais
- Estoque ganhou bloco de notas fiscais/abastecimento.
- Incluído modelo de importação em Excel para nota/compra.
- Incluída função de registrar nota e abastecer estoque com movimentação vinculada.
- Criada estrutura base para futura emissão fiscal/integradores fiscais.

## Supabase
- Adicionada migration 007:
  - colunas de custo em produtos;
  - tabela `notas_fiscais`;
  - tabela `nota_fiscal_itens`;
  - bucket público `logos`;
  - políticas RLS para notas e itens.

## Validação
- `npm run typecheck`: passou.
- `npm run build`: compilou e validou tipos; em ambiente sandbox o processo final parou com EPIPE na coleta de páginas do Next, erro de ambiente/worker. Deve ser validado novamente no VS Code/Vercel.
