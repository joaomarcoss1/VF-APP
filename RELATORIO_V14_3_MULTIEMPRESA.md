# Relatório VF Nexus V14.3 — Multiempresa

## Entregas aplicadas

- Login profissional em `/login`.
- Redirecionamento seguro por perfil.
- Helper tenant em `src/services/_tenant.ts`.
- Service multiempresa em `src/services/multiempresa.ts`.
- Tela `/administracao` para Admin da Empresa, Gerentes e Funcionários.
- Área `/master` para Admin Master NexLabs.
- Migration `027_vf_nexus_v14_3_multiempresa_rls_login.sql` com RLS e funções de segurança.
- Correções de services críticos para filtrar por empresa.
- Cache offline separado por empresa.
- Documentação e testes de isolamento.

## Objetivo

Impedir mistura de dados entre empresas em PDV, estoque, produtos, scanner, etiquetas, importações, financeiro e relatórios.
