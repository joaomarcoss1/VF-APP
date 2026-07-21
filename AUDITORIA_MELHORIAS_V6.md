# Auditoria e Correção Estrutural — VF Nexus v6

## Objetivo

Esta versão complementa a v5 com foco nos pontos que ainda estavam parciais ou com risco estrutural. A regra seguida foi: não adicionar tela/botão/mock sem base real em banco, service, RBAC/RLS, auditoria, teste ou integração com dados existentes.

## Pendências encontradas na v5

1. `src/lib/api.ts` ainda era monolítico, com mais de 2.000 linhas.
2. Alguns `src/services/*` ainda faziam reexport do `api.ts`, ou seja, a separação em serviços reais estava incompleta.
3. A venda tinha risco de pagamento duplicado: o service inseria `venda_pagamentos`, mas a trigger SQL também gerava pagamento automaticamente.
4. O cancelamento/estorno ainda precisava ficar centralizado em função SQL segura, com RBAC/RLS e auditoria.
5. A compra podia duplicar movimentação financeira/estoque caso o service e as triggers fizessem a mesma coisa.
6. Os módulos por ramo ainda ficavam amplos demais porque módulos `core` eram forçados em todos os ramos.
7. Itens de nota fiscal e itens de evento dependiam de policies indiretas; foi adicionado `empresa_id` para RLS direto e mais simples.
8. Alguns tipos TypeScript não refletiam as novas permissões, status e campos comerciais.

## Correções aplicadas

### 1. Remoção estrutural do `api.ts` monolítico

`src/lib/api.ts` agora é apenas uma camada curta de compatibilidade:

```ts
export * from '@/services'
```

As regras foram distribuídas em services reais em `src/services/*`.

### 2. Services reais por domínio

Foram consolidados services para:

- vendas;
- financeiro;
- estoque;
- produtos;
- clientes;
- compras;
- ordens de serviço;
- relatórios;
- diagnóstico;
- master admin;
- equipe;
- auditoria;
- onboarding;
- comprovantes;
- notas fiscais;
- fornecedores;
- insumos;
- ficha técnica;
- eventos;
- promoções;
- cardápio;
- despesas;
- fechamento;
- assinatura;
- configurações;
- dashboard;
- notificações.

### 3. Venda, pagamento, cancelamento e estorno

- O service de venda é responsável por múltiplas formas de pagamento.
- A trigger `vf_venda_after_insert()` não cria mais pagamento automático, evitando duplicidade.
- Cancelamento e estorno usam `public.vf_cancelar_venda()`.
- A função exige motivo obrigatório, valida permissão por ação e registra auditoria.

### 4. Compra, estoque e financeiro

- O service de compra registra compra e itens.
- Estoque e contas a pagar ficam sob responsabilidade das triggers SQL, reduzindo duplicidade.
- Auditoria é registrada no service e no banco.

### 5. Migration 017

Criada a migration:

```txt
supabase/migrations/017_vf_nexus_deep_structural_completion.sql
```

Ela adiciona:

- `empresa_id` em `nota_fiscal_itens` e `evento_itens`;
- índices de isolamento;
- override seguro da trigger de venda;
- função `vf_cancelar_venda()` revisada;
- policies `vf_*` com RBAC por ação em tabelas de módulos;
- validação de deploy da versão 017.

### 6. Módulos por ramo

`src/lib/modules.ts` foi ajustado para não forçar todos os módulos marcados como `core`.

Agora:

- Food prioriza produtos, insumos, fichas, cardápio, estoque, vendas, financeiro, relatórios e diagnóstico.
- Varejo prioriza produtos, estoque, notas, fornecedores, vendas, clientes, financeiro, relatórios e promoções.
- Serviços prioriza clientes, agenda, OS, vendas, financeiro, relatórios e comprovantes.
- Híbrido mantém conjunto mais amplo.

### 7. Tipos TypeScript atualizados

Atualizados tipos para contemplar:

- novos cargos: `administrador`, `contador`, `master_admin`;
- ações: `cancelar`, `estornar`, `aprovar`, `impersonar`;
- venda com status de entrega, troco, motivo e histórico;
- pagamento com troco e conciliação;
- OS com checklist, materiais, fotos, assinatura e recebimento;
- produtos com grade/variações, margem por categoria, validade, perdas e produção em lote.

### 8. Validação de banco novo

Atualizado:

```txt
supabase/VALIDACAO_BANCO_NOVO.sql
```

Agora ele valida migrations 001–017, funções, triggers, RLS, policies, colunas críticas e índices.

## Validação local executada neste ambiente

Foi possível verificar estaticamente:

- não há mais import/reexport de `@/lib/api` dentro do código-fonte;
- `src/lib/api.ts` ficou apenas como compatibilidade;
- `tsc --noEmit` foi executado com TypeScript global, mas o ambiente não possui `node_modules`, então os erros principais foram de dependências ausentes (`react`, `next`, `supabase`, `xlsx`, `vitest`).
- Após filtrar os erros causados por dependências ausentes, não restaram erros estruturais nos services, exceto os esperados de pacotes não instalados.

## Comandos obrigatórios para validação real

Execute localmente com Node 20:

```bash
nvm use 20
npm install
npm run typecheck
npm run lint
npm run test
npm run build
```

No Supabase limpo, aplicar migrations 001–017 e depois rodar:

```sql
supabase/VALIDACAO_BANCO_NOVO.sql
```

## Observação honesta

Esta v6 aprofunda a estrutura e corrige lacunas reais da v5. Ainda assim, como não há `node_modules` neste ambiente e o Node disponível aqui é 22, a validação final de build/testes precisa ser feita no seu computador ou pipeline com Node 20.
