# VF Nexus V9.2 — Correção Final de Tenant, Atendimento, Master, Mobile e Produção

## Resumo
Esta versão aplica hardening sobre a V9.1 sem adicionar módulos novos. O foco foi reforçar isolamento multiempresa, proteger eventos, integrações e notificações, bloquear o Admin Master fora do `/master` sem empresa operacional, desativar a tela legada `/master-admin`, melhorar a validação de sessão operacional do atendimento, remover ícones textuais dos módulos e reforçar a camada visual/mobile.

## Arquivos principais alterados
- `src/services/eventos.ts`
- `src/services/integracoes.ts`
- `src/services/notificacoes.ts`
- `src/services/restaurante.ts`
- `src/components/layout/AppShell.tsx`
- `src/app/(app)/master-admin/page.tsx`
- `src/lib/modules.ts`
- `src/app/globals.css`
- `public/sw.js`

## Services corrigidos com empresa_id
- Eventos: listagem, detalhe, criação, atualização, exclusão e itens vinculados agora validam `empresa_id`.
- Integrações: listagem, salvar, atualizar erro e remover filtram por empresa.
- Notificações: listagem, criação e marcação como lida usam `empresa_id`.

## Correções no Admin Master
- Admin Master sem empresa selecionada é bloqueado fora do `/master`.
- Áreas operacionais redirecionam para `/master/empresas` quando não há empresa operacional.
- `/master-admin` foi convertido em redirecionamento para `/master`.

## Correções no atendimento
- Adicionados helpers de sessão operacional em `RestauranteService`.
- Ações críticas de atendimento, produção e caixa passam a exigir sessão/setor ou usuário administrativo autenticado.
- A migration `044` reforça a função `vf_restaurante_login_staff` e cria validação de sessão.

## Migrations criadas
- `041_vf_nexus_v9_2_eventos_tenant.sql`
- `042_vf_nexus_v9_2_integracoes_tenant.sql`
- `043_vf_nexus_v9_2_notificacoes_tenant.sql`
- `044_vf_nexus_v9_2_staff_session_hardening.sql`

## Correções no mobile/design
- Camada CSS V9.2 adicionada para padronizar botões, cards, tabelas, status e mobile.
- Bottom navigation recebeu proteção contra sobreposição e overflow.
- Ícones textuais antigos foram removidos do registro dos módulos.

## PWA
- Cache do service worker atualizado para `vf-nexus-v9-2-stable`.
- Mantém política sem cache agressivo de páginas autenticadas.

## Testes
Foi adicionado teste estático `src/tests/v9-2-tenant-hardening.test.ts` cobrindo módulos essenciais e remoção de ícones textuais antigos.

## Validação manual necessária
Execute no VS Code antes de subir para produção:

```powershell
npm ci --legacy-peer-deps --no-audit --no-fund
npm run typecheck
npm run lint
npm test
npm run build
```

Depois execute no Supabase as migrations `041`, `042`, `043` e `044`.

## Observação
A stack Next/React/Node foi preservada para não quebrar o `package-lock.json`. Recomenda-se planejar uma migração controlada de dependências em uma versão separada, com `npm install` local e validação completa.
