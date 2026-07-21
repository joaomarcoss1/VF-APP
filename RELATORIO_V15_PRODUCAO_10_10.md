# VF Nexus V15 Produção 10/10

Esta versão consolida o VF Nexus como SaaS multiempresa para piloto comercial controlado, com foco em segurança por empresa, build/Next.js, UX profissional, PDV, estoque, scanner, etiquetas, importação, entregas, financeiro, relatórios, offline e auditoria.

## Melhorias principais

- Migration `029_vf_nexus_v15_producao_10_10.sql` com funções SQL de segurança e policies tenant-safe.
- Matriz de segurança V15 em `src/lib/v15-security.ts`.
- Guardas de rota para Master, Admin da Empresa, funcionário e entregador.
- Testes automatizados V15 cobrindo isolamento multiempresa, RLS, RBAC, entregas, PDV, etiquetas e relatórios.
- Hardening de cache/offline por empresa no PDV.
- Documentação final de deploy, Supabase e testes de módulos críticos.

## Estado de uso recomendado

Use esta versão em piloto com empresas reais somente após aplicar todas as migrations e executar o checklist final. O objetivo é impedir vazamento de dados entre empresas mesmo se alguém alterar requisições no navegador.
