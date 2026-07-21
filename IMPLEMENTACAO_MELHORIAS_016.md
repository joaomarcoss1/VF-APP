# Implementação aplicada — VF Nexus Hardening 016

Este pacote recebeu uma implementação prática das melhorias solicitadas, com prioridade para estabilidade e funcionalidades com base real.

## O que foi aplicado

### Banco e migrations

- Criada migration `supabase/migrations/016_vf_nexus_final_hardening.sql`.
- Corrigido suporte a banco novo com funções auxiliares:
  - `public.get_empresa_id()`
  - `public.is_master_admin()`
  - `public.vf_can()`
  - `public.vf_auditar()`
  - `public.vf_cancelar_venda()`
- Reforçada RLS nas tabelas críticas.
- Criadas/ajustadas colunas para:
  - status de entrega;
  - múltiplos pagamentos;
  - valor recebido e troco;
  - cancelamento/estorno com motivo;
  - OS com checklist, materiais, fotos e assinatura;
  - inventário;
  - produtos com grade, validade, perdas e produção em lote.
- Criado `supabase/VALIDACAO_BANCO_NOVO.sql`.

### Services reais

Foram criados services reais em `src/services`:

- `_base.ts`
- `_empresa.ts`
- `_errors.ts`
- `auditoria.ts`
- `clientes.ts`
- `produtos.ts`
- `vendas.ts`
- `financeiro.ts`
- `estoque.ts`
- `compras.ts`
- `ordens-servico.ts`
- `relatorios.ts`
- `diagnostico.ts`
- `master.ts`
- `equipe.ts`
- `onboarding.ts`
- `permissoes.ts`
- `index.ts`

As páginas foram redirecionadas para importar de `@/services`, reduzindo dependência direta do `src/lib/api.ts`.

### RBAC

- Atualizado `src/lib/rbac.ts` com ações reais:
  - `ver`, `criar`, `editar`, `excluir`, `cancelar`, `estornar`, `aprovar`, `exportar`, `administrar`, `impersonar`.
- Adicionados papéis:
  - `dono`, `administrador`, `gerente`, `financeiro`, `vendedor`, `atendente`, `operacional`, `contador`, `master_admin`.
- Ações críticas passam por service e RLS/funções SQL.

### Regras testáveis

- Criado `src/lib/business-rules.ts` com regras puras para:
  - venda multi-itens;
  - múltiplas formas de pagamento;
  - dinheiro/troco;
  - motivo obrigatório;
  - estoque/custo médio;
  - compra;
  - DRE;
  - matriz RBAC.

### Testes

- Configurado Vitest em `vitest.config.ts`.
- Criados testes:
  - `src/tests/vendas.test.ts`
  - `src/tests/estorno.test.ts`
  - `src/tests/compras.test.ts`
  - `src/tests/estoque.test.ts`
  - `src/tests/financeiro.test.ts`
  - `src/tests/rbac.test.ts`

### Node 20 e deploy

- `package.json` atualizado com Node 20.x.
- Criados `.nvmrc` e `.node-version`.
- `vercel.json` ajustado para build/install e runtime Node 20.
- Criado `CHECKLIST_DEPLOY.md`.

## Observação de validação local

O ambiente usado para edição estava sem `node_modules` instalados e rodando Node 22.16.0 no container. Por isso, não foi possível confirmar `npm run typecheck`, `npm run lint`, `npm run test` e `npm run build` dentro deste ambiente sem executar uma instalação completa das dependências. O projeto, porém, foi travado para Node 20.x e recebeu os scripts necessários.

Para validar no seu computador:

```bash
cd vf-app
nvm use 20
npm install
npm run validate
```

Depois aplique as migrations no Supabase e execute:

```sql
-- supabase/VALIDACAO_BANCO_NOVO.sql
```
