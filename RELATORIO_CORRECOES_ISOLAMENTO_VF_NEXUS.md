# Relatório de Correções — VF Nexus Atendimento, Isolamento Multiempresa, Produtos e Fichas

## Objetivo
Corrigir falhas operacionais identificadas no VF Nexus, com foco em:

- Separação real dos dados por empresa.
- Prevenção de mistura de produtos, estoque, fichas, insumos, notas e fornecedores entre empresas.
- Correção do salvamento de edição de produtos.
- Correção e implementação da edição de fichas técnicas.
- Reforço da operação do VF Nexus Atendimento para trabalhar sempre dentro da empresa correta.

## Correções principais aplicadas

### 1. Isolamento multiempresa reforçado
Foram revisados e corrigidos services que ainda podiam consultar dados sem filtro explícito de empresa.

Áreas reforçadas:

- Produtos.
- Fichas técnicas.
- Insumos.
- Estoque de produtos.
- Movimentações de estoque.
- Notas fiscais/abastecimento.
- Fornecedores.
- VF Nexus Atendimento.

Agora as consultas operacionais usam `getEmpresaId()` e aplicam `empresa_id` sempre que a tabela suporta esse campo.

### 2. Empresa operacional por código/matrícula
Foi melhorada a lógica de empresa operacional para evitar mistura de dados quando o usuário for Admin Master.

A autenticação agora pode armazenar a empresa operacional selecionada por:

- `codigo_empresa`.
- `matricula_empresa`.
- `empresa_id`.

Isso permite que cada empresa tenha sua matrícula/código próprio e que o Admin Master opere em uma empresa específica nas telas operacionais.

### 3. Correção do botão de salvar produto editado
O erro de edição de produto acontecia porque o formulário enviava para o Supabase campos que não pertenciam diretamente à tabela `produtos`, como dados relacionais e campos somente leitura.

Foi criada sanitização estrutural no `ProdutosService`, permitindo atualizar apenas campos válidos da tabela.

Também foram adicionados campos do VF Nexus Atendimento no produto:

- `setor_producao`.
- `aparece_no_atendimento`.
- `ordem_atendimento`.

### 4. Correção da edição de fichas técnicas
A tela de fichas agora possui edição real de itens da ficha técnica.

Implementado:

- Botão editar por item da ficha.
- Modal de edição de quantidade, unidade e observação.
- Service de atualização com filtro por `empresa_id`.
- Cálculo de custo da ficha com base nos itens vinculados.
- Proteção para impedir vínculo de produto e insumo de empresas diferentes.

### 5. Nova migration de segurança e compatibilidade
Foi criada a migration:

```txt
supabase/migrations/032_vf_nexus_isolamento_empresas_produtos_fichas.sql
```

Ela adiciona/reforça:

- `codigo_empresa` em `empresas`.
- `matricula_empresa` em `empresas`.
- campos de atendimento em `produtos`.
- `empresa_id` em `ficha_tecnica`.
- índices por empresa.
- RLS em fichas técnicas.
- view de auditoria `vf_auditoria_isolamento_empresas`.

### 6. Login e seleção de empresa
A tela de login foi ajustada para usar o código/matrícula da empresa de forma mais segura.

Quando o usuário informa o código da empresa, o sistema tenta resolver:

- `codigo_empresa`.
- `matricula_empresa`.

E grava a empresa operacional para uso nas telas do sistema.

### 7. Correção adicional para deploy
Foi corrigido o uso de `window.location.href` em pontos que quebravam lint/build em ambiente Vercel, substituindo por `window.location.assign()`.

## Arquivos principais alterados

- `src/services/_base.ts`
- `src/services/produtos.ts`
- `src/services/ficha.ts`
- `src/services/insumos.ts`
- `src/services/estoque.ts`
- `src/services/notas-fiscais.ts`
- `src/services/fornecedores.ts`
- `src/services/restaurante.ts`
- `src/app/login/page.tsx`
- `src/app/(app)/produtos/page.tsx`
- `src/app/(app)/fichas/page.tsx`
- `src/app/(app)/assinatura/page.tsx`
- `src/components/layout/AppShell.tsx`
- `src/types/index.ts`
- `supabase/migrations/032_vf_nexus_isolamento_empresas_produtos_fichas.sql`

## Validações executadas

### TypeScript

```bash
npm run typecheck
```

Resultado: aprovado.

### Lint

```bash
npm run lint
```

Resultado: aprovado com avisos não bloqueantes já existentes.

### Testes

```bash
npx vitest run --reporter=dot
```

Resultado: 22 arquivos de teste aprovados, 50 testes aprovados.

### Build local

```bash
npm run build
```

Resultado: o build iniciou normalmente e não apresentou erro explícito, mas excedeu o tempo limite do ambiente local durante a etapa `Creating an optimized production build`. Recomenda-se validar no ambiente da Vercel, que possui timeout e infraestrutura próprios.

## Instruções obrigatórias pós-deploy

Depois de subir o novo código, rode no Supabase a migration:

```txt
supabase/migrations/032_vf_nexus_isolamento_empresas_produtos_fichas.sql
```

Após rodar, confira a view:

```sql
select * from public.vf_auditoria_isolamento_empresas;
```

Essa view ajuda a verificar se produtos, insumos, fichas e comandas estão vinculados corretamente por empresa.
