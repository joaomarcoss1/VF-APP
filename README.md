# VF Nexus V11 — SaaS de gestão empresarial

Versão V11 com melhorias de mobile/PWA, paleta persistente, logos, relatórios premium, fiscal readiness e preparação para primeiros clientes.

## Rodar no VS Code

```powershell
node -v
npm ci --legacy-peer-deps --no-audit --no-fund --registry=https://registry.npmjs.org/
copy .env.local.example .env.local
npm run typecheck
npm run lint
npm run test
npm run build
npm run dev
```

## Deploy Vercel

- Root Directory: vazio
- Framework Preset: Next.js
- Install Command: `npm ci --legacy-peer-deps --no-audit --no-fund --registry=https://registry.npmjs.org/`
- Build Command: `npm run build`
- Output Directory: `.next`

## Supabase

Execute todas as migrations, incluindo:

```text
supabase/migrations/022_vf_nexus_v11_commercial_hardening.sql
```

---

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


## VF Nexus V12 — validação final

Antes de rodar, configure `.env.local` com as variáveis do Supabase.

### Instalação no VS Code

```powershell
npm ci --legacy-peer-deps --no-audit --no-fund --registry=https://registry.npmjs.org/
npm run typecheck
npm run lint
npm run test
npm run build
npm run dev
```

### Supabase

Aplique as migrations até:

```text
supabase/migrations/023_vf_nexus_v12_final_validation_hardening.sql
```

Essa migration adiciona reforços de paleta, configurações fiscais, documentos fiscais e RPCs transacionais para venda/nota.

### Vercel

- Root Directory: vazio
- Framework: Next.js
- Install Command: `npm ci --legacy-peer-deps --no-audit --no-fund --registry=https://registry.npmjs.org/`
- Build Command: `npm run build`
- Output: `.next`

## VF Nexus V13 — Mobile App e documentos com paleta

Esta versão contém ajustes para o app instalado no celular funcionar como aplicativo mobile, sem depender de zoom ou de layout desktop comprimido. Também atualiza a geração de PDFs de cardápio/catálogo, ficha técnica, eventos e comprovantes para usar a paleta e a logo configuradas pelo cliente.

### Comandos recomendados no VS Code

```powershell
npm ci --legacy-peer-deps --no-audit --no-fund --registry=https://registry.npmjs.org/
npm run typecheck
npm run lint
npm run test
npm run build
npm run dev
```

### Vercel

- Root Directory: vazio
- Framework Preset: Next.js
- Install Command: `npm ci --legacy-peer-deps --no-audit --no-fund --registry=https://registry.npmjs.org/`
- Build Command: `npm run build`
- Output Directory: `.next`

### Documentos importantes

- `RELATORIO_MOBILE_RELATORIOS_V13.md`
- `CHECKLIST_MOBILE_PWA_V13.md`
- `CHECKLIST_VALIDACAO_FINAL_V12.md`
- `RELATORIO_CORRECOES_V12.md`


## VF Nexus V14 Comercial

Esta versão adiciona PDV rápido, catálogo público com QR Code, estrutura SaaS de planos/trial, importação Excel, suporte, healthcheck e melhorias mobile/PWA.

### Rotas novas
- `/pdv`
- `/catalogo/[slug]`
- `/importacao`
- `/assinatura`
- `/suporte`
- `/api/health`

### Migration obrigatória
`supabase/migrations/024_vf_nexus_v14_comercial.sql`

## VF Nexus V14.1

A V14.1 adiciona correções estruturais e módulos comerciais:

- PWA com offline básico e tela `/offline`;
- fila offline de vendas no PDV;
- venda transacional obrigatória via RPC `vf_registrar_venda_completa_v14_1`;
- RLS reforçado para tabelas V14;
- importação XLSX/CSV real;
- etiquetas com nome, preço e código de barras;
- impressão de etiquetas por HTML/PDF do navegador;
- exportação ZPL básica;
- scanner por câmera e busca manual/física por código;
- checkout inicial via Mercado Pago, Stripe ou modo manual.

Antes de usar em produção, aplique:

```text
supabase/migrations/025_vf_nexus_v14_1_rls_offline_etiquetas.sql
```

Depois rode:

```powershell
npm ci --legacy-peer-deps --no-audit --no-fund --registry=https://registry.npmjs.org/
npm run typecheck
npm run lint
npm run test
npm run build
```

## VF Nexus V14.3 — Multiempresa para testes iniciais

A versão V14.3 prioriza segurança multiempresa. Antes de testar com empresas reais, aplique a migration:

```sql
supabase/migrations/027_vf_nexus_v14_3_multiempresa_rls_login.sql
```

Fluxo recomendado:

1. Criar/definir um usuário como Admin Master NexLabs (`perfis.is_master = true` ou `cargo = 'master_admin'`).
2. Entrar em `/login`.
3. Acessar `/master`.
4. Criar empresa com código/matrícula.
5. Vincular Admin da Empresa.
6. Entrar como Admin da Empresa.
7. Usar `/administracao` para cadastrar gerentes/funcionários.
8. Testar PDV, estoque, scanner, etiquetas, importação e relatórios com dados isolados.

Cada empresa deve ver somente seus próprios dados.


## VF Nexus V15 Produção 10/10

A V15 adiciona hardening final multiempresa, migration 029, guardas de rota, matriz RBAC V15, testes de isolamento por empresa, documentação de piloto e checklist de produção. Antes de usar com empresas reais, aplique todas as migrations e execute `npm run validate`.


## V15.1 — Billing Stripe e Operação Comercial

Inclui controle de pagamento das empresas, Stripe Billing, teste manual sem prazo, isenção permanente de cobrança, diagnóstico técnico, auditoria visível, permissões visuais, fechamento de caixa e onboarding empresarial ampliado. Aplique a migration `030_vf_nexus_v15_1_billing_operacao.sql`.
