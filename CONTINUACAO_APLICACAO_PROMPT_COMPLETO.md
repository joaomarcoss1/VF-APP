# VF Nexus — Continuação da Aplicação do Prompt Completo

Esta versão continua a aplicação das 27 etapas do prompt de evolução comercial do VF Nexus.

## Principais avanços desta rodada

- Criação do motor comercial em `src/lib/commercial-engine.ts`.
- Cálculo centralizado de DRE simplificada, lucro bruto, lucro líquido, margem líquida e resumo financeiro.
- Diagnóstico Inteligente reestruturado com score comercial, insights acionáveis, curva ABC e DRE.
- Criação do RBAC central em `src/lib/rbac.ts`.
- Reestruturação de `src/services/permissoes.ts` para usar permissões reais por cargo.
- Criação da rota `/ordens-servico` para ramos de serviço, assistência, fotografia e atendimentos personalizados.
- Inclusão do módulo `ordens-servico` no sistema de módulos por setor.
- Novos serviços para:
  - contas a pagar;
  - contas a receber;
  - compras;
  - ordens de serviço.
- Financeiro aprimorado com DRE simplificada dentro da tela.
- Nova migration `014_vf_nexus_full_prompt_hardening.sql`.

## O que a migration 014 adiciona

- Tabela `ordens_servico`.
- Tabela `venda_status_historico`.
- Tabela `documentos_gerados`.
- Tabela `plano_limites_empresa`.
- Campos extras em `empresas`, `clientes` e `produtos`.
- RLS e políticas para as novas tabelas.
- Módulo `ordens-servico` em ramos de serviço.

## Status da aplicação do prompt

Esta versão aprofunda a aplicação do prompt, principalmente nas áreas que ainda estavam como base:

- financeiro profissional;
- diagnóstico inteligente;
- relatórios de decisão;
- RBAC;
- ordem de serviço;
- multi-ramo;
- documentação;
- estrutura SaaS.

A emissão fiscal oficial continua corretamente tratada como etapa futura, pois exige provedor fiscal, certificado digital, SEFAZ, XML, DANFE, CFOP, NCM e regras tributárias.

## Como aplicar

Execute no Supabase, após a migration 013:

```sql
014_vf_nexus_full_prompt_hardening.sql
```

Depois rode:

```powershell
npm install
npm run typecheck
npm run lint
npm run build
npm run dev
```

## Rotas novas/importantes

- `/diagnostico`
- `/ordens-servico`
- `/financeiro`
- `/vendas`
- `/estoque`
- `/notas`
- `/relatorios`
- `/equipe`
- `/master-admin`

## Observação honesta

O app está evoluindo em direção ao SaaS completo descrito no prompt. As bases comerciais foram aplicadas e as áreas críticas ganharam estrutura mais robusta. Ainda é obrigatório validar no VS Code/Supabase, porque um SaaS desse porte precisa passar por build, testes manuais e correções finas de ambiente.
