# VF Nexus V14.3 — Guia de Segurança Multiempresa

A V14.3 corrige o ponto mais crítico do SaaS: isolamento por `empresa_id`. Cada empresa possui produtos, vendas, estoque, etiquetas, importações, relatórios e equipe próprios.

## Camadas de proteção

1. **Banco/Supabase RLS**: a migration `027_vf_nexus_v14_3_multiempresa_rls_login.sql` cria funções `current_empresa_id()`, `is_super_admin()` e `can_access_empresa()`, além de policies por `empresa_id`.
2. **Services**: os services críticos filtram dados por empresa atual usando o perfil autenticado.
3. **Login**: a tela `/login` carrega o perfil e redireciona conforme papel.
4. **Administração**: a tela `/administracao` separa Admin da Empresa, Gerentes e Funcionários.
5. **Master**: a área `/master` é exclusiva do Admin Master NexLabs.

## Validação recomendada

- Criar Empresa A e Empresa B.
- Cadastrar produtos diferentes em cada uma.
- Logar com usuário da Empresa A e confirmar que produtos da B não aparecem.
- Testar PDV, scanner, etiquetas, importação e relatórios.
- Repetir para Empresa B.

Nenhum dado empresarial deve aparecer fora da empresa vinculada ao usuário.
