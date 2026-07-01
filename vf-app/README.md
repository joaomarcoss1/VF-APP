# VF Nexus — SaaS Comercial Multirramo

Sistema de gestão multirramo criado pela NexLabs para pequenos negócios, MEIs, autônomos e empresas locais.

## Linhas comerciais

- **VF Nexus Food**: restaurantes, bares, cafeterias, delivery, lanchonetes e confeitarias.
- **VF Nexus Varejo**: lojas de roupas, variedades, eletrônicos e comércio local.
- **VF Nexus Serviços**: barbearias, salões, fotógrafos, prestadores e assistência técnica.

## Principais módulos

- Onboarding inteligente por ramo.
- Dashboard personalizado.
- Produtos, serviços, pacotes e ficha técnica.
- Precificação avançada com frete, taxas, embalagem, comissão, custo operacional e margem.
- Vendas multi-itens com carrinho, baixa de estoque, financeiro e comprovante.
- Estoque de insumos e produtos finais.
- Compras, notas e abastecimento.
- Clientes/CRM.
- Agendamentos e base para ordem de serviço.
- Financeiro com contas, lançamentos, fluxo de caixa e DRE simples.
- Relatórios e diagnóstico inteligente.
- Branding por empresa com logo e paleta.
- Equipe, permissões, auditoria e planos SaaS.
- PWA e experiência mobile.

## Instalação

```bash
npm install
```

Crie `.env.local` com:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
MASTER_ADMIN_EMAILS=
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:seuemail@email.com
CRON_SECRET=
ANTHROPIC_API_KEY=
ANTHROPIC_MODEL=claude-sonnet-4-6
IA_DAILY_LIMIT=50
```

## Rodar local

```bash
npm run typecheck
npm run lint
npm run build
npm run dev
```

Abra:

```text
http://localhost:3000
```

## Supabase

Execute as migrations em ordem. As novas migrations desta entrega são:

```text
010_vf_nexus_financeiro_profissional.sql
011_vf_nexus_vendas_estoque_profissional.sql
012_vf_nexus_rbac_auditoria_planos.sql
013_vf_nexus_relatorios_branding_documentos.sql
```

## Fiscal

Esta versão possui **base para controle de notas, compras e abastecimento**, preparada para futura integração fiscal. Ela não emite NF-e/NFC-e/NFS-e oficial sem integração com provedor fiscal/SEFAZ.

## Correção final
Execute também a migration 015 para concretizar regras internas de venda, estoque, financeiro, compra e OS.


## Hardening 017 — Correção estrutural profunda

Esta versão aprofunda a v5/v16 com correções reais de arquitetura:

- `src/lib/api.ts` foi reduzido para camada de compatibilidade;
- reexports de `@/lib/api` foram removidos dos services;
- pagamentos de venda não são mais duplicados por trigger;
- cancelamento/estorno passam por RPC segura com RBAC/RLS e auditoria;
- compra delega estoque e contas a pagar para triggers SQL idempotentes;
- módulos por ramo foram enxugados para reduzir funções desnecessárias;
- `nota_fiscal_itens` e `evento_itens` receberam `empresa_id` para RLS direto;
- `supabase/VALIDACAO_BANCO_NOVO.sql` agora valida migrations 001–017.

Leia também `AUDITORIA_MELHORIAS_V6.md`.

## Hardening 016 — MVP avançado para piloto

Esta versão inclui uma camada real de regras de negócio para preparar o VF Nexus para piloto interno e clientes selecionados.

### Principais mudanças

- Node travado em 20.x via `package.json`, `.nvmrc`, `.node-version` e `vercel.json`.
- Services reais em `src/services/*`, reduzindo dependência direta das páginas em `src/lib/api.ts`.
- RBAC por ação em `src/lib/rbac.ts` com ações: `ver`, `criar`, `editar`, `excluir`, `cancelar`, `estornar`, `aprovar`, `exportar`, `administrar`, `impersonar`.
- Regras puras e testáveis em `src/lib/business-rules.ts`.
- Testes Vitest para venda, estorno, compra, estoque, financeiro e RBAC.
- Migration `016_vf_nexus_final_hardening.sql` com reforço de banco novo, RLS, funções de permissão, auditoria, cancelamento/estorno, compra/estoque, OS, inventário e módulos por ramo.
- Validação SQL em `supabase/VALIDACAO_BANCO_NOVO.sql`.
- Checklist obrigatório em `CHECKLIST_DEPLOY.md`.

### Comandos

```bash
npm install
npm run typecheck
npm run lint
npm run test
npm run build
```

### Ordem recomendada de validação

1. Aplicar migrations `001` até `017` em banco Supabase limpo.
2. Executar `supabase/VALIDACAO_BANCO_NOVO.sql`.
3. Criar usuário dono e empresa.
4. Fazer onboarding por ramo.
5. Cadastrar produto/serviço.
6. Registrar venda com múltiplos itens e pagamentos.
7. Cancelar venda com motivo.
8. Criar compra e verificar entrada de estoque/conta a pagar.
9. Gerar DRE/relatórios.
10. Testar acesso com vendedor, financeiro, operacional e master admin.
