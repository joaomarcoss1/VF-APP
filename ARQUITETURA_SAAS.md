# Arquitetura SaaS — VF Nexus

## Stack
- Next.js App Router
- TypeScript
- Supabase Auth
- Supabase PostgreSQL
- Supabase Storage
- RLS por empresa
- React Query
- Tailwind CSS
- PWA

## Camadas
- `src/app`: rotas e telas.
- `src/components`: UI e layout.
- `src/lib`: API legada, branding, módulos, precificação e exports.
- `src/services`: camada de domínio para evolução incremental.
- `src/hooks`: hooks globais de empresa, módulos, assinatura e permissões.
- `supabase/migrations`: evolução incremental do banco.

## Segurança
Toda tabela operacional deve conter `empresa_id` e RLS. O app deve aplicar segurança em três camadas:

1. Menu: esconder módulos não liberados.
2. Rota: bloquear acesso por URL.
3. Banco/API: validar empresa, assinatura e permissão.

## Multiempresa
A entidade central é `empresas`. Perfis, produtos, vendas, estoque, financeiro, clientes, notas, documentos e permissões devem sempre estar vinculados a uma empresa.
