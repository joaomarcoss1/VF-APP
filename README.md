# VF Nexus V9.4 — Hardening, desempenho e segurança multiempresa

A V9.4 consolida as correções de segurança e estabilidade da V9.3: autorização fail-closed, empresa operacional do Admin Master validada no banco, webhooks protegidos, preço de assinatura resolvido no servidor, paginação nas listagens principais, busca com debounce, fila offline por tenant, recibos em PDF pelo WhatsApp e Design System com contraste dinâmico.

> Esta entrega contém código, migrations e validações estruturais. A homologação final exige executar o pipeline local com as credenciais do projeto e aplicar a migration 048 no Supabase de homologação.

## Requisitos

- Node.js 22 LTS
- npm 10 ou 11
- Projeto Supabase configurado
- VS Code ou terminal PowerShell

## Início rápido no VS Code

```powershell
Copy-Item .env.local.example .env.local
npm config set registry https://registry.npmjs.org/
npm ci --legacy-peer-deps --no-audit --no-fund --registry=https://registry.npmjs.org/
npm run diagnostico:v9.4
npm run security:check
npm run typecheck
npm run lint
npm test
npm run build
npm run dev
```

Também é possível executar:

```powershell
.\VALIDAR_V9_4.ps1
```

## Supabase — ordem da atualização

Em banco já existente e atualizado até a V9.3, aplique somente:

```text
supabase/migrations/048_vf_nexus_v9_4_security_tenant_hardening.sql
```

Depois execute:

```text
supabase/DIAGNOSTICO_SEGURANCA_V9_4.sql
```

Em banco novo, execute as migrations na ordem numérica de `000` até `048`. Não renomeie nem reaplique migrations de produção sem conferir a tabela de histórico.

## Variáveis obrigatórias

Copie `.env.local.example` para `.env.local` e configure, no mínimo:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
BILLING_WEBHOOK_SECRET=
```

Credenciais privadas nunca devem receber o prefixo `NEXT_PUBLIC_`.

## WhatsApp

A V9.4 suporta fila/outbox, envio de texto e documento e fallback honesto por `wa.me`. Para envio automático, configure um provider no servidor:

```env
WHATSAPP_PROVIDER=evolution
WHATSAPP_API_URL=
WHATSAPP_API_TOKEN=
WHATSAPP_INSTANCE=
WHATSAPP_DEFAULT_COUNTRY=55
```

Sem provider configurado, o sistema oferece download do PDF e abertura do WhatsApp para anexo manual; não informa falsamente que houve envio automático.

## GitHub

Depois da validação:

```powershell
.\ATUALIZAR_GITHUB_V9_4.ps1
```

O script utiliza push normal e não sobrescreve o histórico remoto com `--force`.

## Documentação V9.4

- `RELATORIO_BASELINE_VF_NEXUS_V9_4.md`
- `RELATORIO_IMPLEMENTACAO_VF_NEXUS_V9_4.md`
- `RELATORIO_SEGURANCA_VF_NEXUS_V9_4.md`
- `RELATORIO_TESTES_VF_NEXUS_V9_4.md`
- `RELATORIO_BUILD_VF_NEXUS_V9_4.md`
- `RELATORIO_MIGRATIONS_VF_NEXUS_V9_4.md`
- `RELATORIO_RISCOS_RESTANTES_VF_NEXUS_V9_4.md`
- `GUIA_DEPLOY_V9_4.md`
- `ROLLBACK_V9_4.md`

---

## Histórico do projeto

A documentação das versões anteriores foi preservada na raiz para rastreabilidade. Em caso de conflito, as instruções da V9.4 e a migration 048 têm prioridade sobre guias antigos.
