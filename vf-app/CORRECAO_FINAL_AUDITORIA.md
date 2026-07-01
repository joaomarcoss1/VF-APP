# VF Nexus — Correção Final de Auditoria Técnica

Esta versão foi revisada com foco em transformar funcionalidades que estavam apenas estruturadas em regras de negócio internas mais concretas.

## Correções aplicadas

- Venda multi-itens agora tem reforço interno no banco para gerar:
  - pagamento da venda;
  - lançamento financeiro de receita;
  - conta a receber já liquidada;
  - histórico de status;
  - atualização do histórico do cliente.
- Itens de venda agora disparam baixa automática de estoque por trigger:
  - baixa de produto final em `produto_estoque`;
  - baixa de insumos quando o produto possui ficha técnica.
- Estorno/cancelamento de venda agora reverte:
  - estoque de produto final;
  - estoque de insumos;
  - pagamento;
  - lançamento financeiro;
  - conta a receber;
  - auditoria.
- Compras agora geram conta a pagar automaticamente.
- Itens de compra abastecem estoque de produto final ou insumo automaticamente.
- Ordem de serviço finalizada gera conta a receber.
- Financeiro passou a considerar contas a pagar e contas a receber de forma visual e no resumo.
- Paleta padrão ajustada para o padrão corporativo claro NexLabs:
  - `#0F4C81`, `#38BDF8`, `#D4AF37`, `#F8FAFC`, `#102033`.
- Corrigidos pontos onde ainda havia defaults antigos de cor.
- Corrigidos pontos de tipagem em `Object.values(SECTOR_PROFILES)` e cardápio.
- Criada migration `015_vf_nexus_concretizacao_regras_negocio.sql`.

## Limite honesto desta entrega

Esta versão fortalece regras reais no banco e no app, mas ainda precisa ser validada no ambiente do usuário com:

```powershell
npm install
npm run typecheck
npm run lint
npm run build
npm run dev
```

E com as migrations até a `015` executadas no Supabase.

A emissão fiscal oficial ainda não está implementada. O sistema mantém base de controle de notas, compras e abastecimento preparada para futura integração fiscal.
