# VF Nexus — Finalização Comercial do EP/MVP

Esta versão consolida o VF Nexus como MVP SaaS multirramo mais próximo de uso comercial. O foco desta rodada foi estabilizar a base para pequenos negócios reais, evitando apenas adicionar telas soltas.

## Principais melhorias aplicadas

### 1. Vendas profissionais
- Venda multi-itens com carrinho.
- Itens separados em `venda_itens`.
- Cálculo de subtotal, desconto por item, desconto geral, taxas, total e lucro.
- Comprovante PDF com vários itens.
- Baixa automática de estoque por ficha técnica e também por estoque de produto final.

### 2. Estoque multirramo
- Separação entre estoque de insumos e estoque de produtos finais.
- Nova base `produto_estoque`.
- Nova base `movimentacoes_produto_estoque`.
- Entrada, saída, ajuste, perda e transferência para produtos finais.
- Indicadores de valor em insumos, valor em produtos, alertas e produtos críticos.

### 3. Notas e abastecimento
- Lançamento de nota para insumos ou produtos finais.
- Registro de frete, impostos/taxas, chave de acesso e fornecedor.
- Modelo Excel para importação.
- Base fiscal preparada para futura integração com provedor fiscal/SEFAZ.

### 4. Financeiro e operação
- A venda multi-itens alimenta o financeiro com total e lucro corretos.
- Estrutura de caixa diário criada por migration para evolução do fechamento operacional.
- Base para contas a pagar/receber mantida.

### 5. Permissões e SaaS
- Nova base `permissoes_equipe` para RBAC real por colaborador/cargo.
- Mantido controle de módulos por empresa e setor.
- Migrations preservam multiempresa via `empresa_id` e RLS.

## Nova migration obrigatória
Execute no Supabase, depois das anteriores:

```sql
supabase/migrations/009_commercial_completion_sales_inventory_permissions.sql
```

Ela cria/ajusta:
- `venda_itens`
- `produto_estoque`
- `movimentacoes_produto_estoque`
- `caixas_diarios`
- `permissoes_equipe`
- novos campos em `vendas`

## Observação fiscal importante
Esta versão **não emite nota fiscal oficial**. Ela registra notas de compra/abastecimento e prepara a estrutura para integração futura. Para emissão real no Brasil serão necessários certificado digital, SEFAZ ou provedor fiscal, XML, NCM, CFOP, CST/CSOSN, DANFE e homologação.

## Checklist de validação
1. Executar a migration 009 no Supabase.
2. Rodar `npm install`.
3. Rodar `npm run typecheck`.
4. Rodar `npm run build`.
5. Testar `/vendas` com vários itens.
6. Testar `/estoque` nas abas Insumos, Produtos finais e Notas.
7. Testar `/notas`.
8. Registrar venda e conferir comprovante.
9. Confirmar que a venda aparece no financeiro.
10. Confirmar baixa de estoque dos produtos vendidos.

## Próximo passo real para produção
Antes de vender em escala, os próximos marcos técnicos devem ser:
- RBAC aplicado em botões/ações/API, não só base de dados.
- Testes automatizados dos fluxos principais.
- Integração fiscal real apenas se o produto for vender emissão fiscal.
- Revisão de dependências e migração futura de `@supabase/auth-helpers-nextjs` para `@supabase/ssr`.
