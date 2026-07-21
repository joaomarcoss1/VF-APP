# VF Nexus V9.1 — Hardening Multiempresa, Master, Mobile e Segurança

## Resumo

Esta versão aplica hardening sobre a V9, focando em reduzir risco de mistura de dados, estabilizar o fluxo do Admin Master, reforçar módulo/tenant, melhorar mobile/design, ajustar PWA e proteger pontos operacionais sem adicionar módulos novos.

## Principais correções aplicadas

### Multiempresa e `empresa_id`
- `src/services/financeiro.ts`: listagem, atualização, exclusão/cancelamento e marcação de pagamento/recebimento passam a usar `getEmpresaIdObrigatoria()` e filtro `.eq('empresa_id', empresaId)`.
- `src/services/compras.ts`: listagem de compras filtrada por `empresa_id`.
- `src/services/cardapio.ts`: atualização de cardápio e remoção de item com filtro por `empresa_id`.
- `src/services/varejo.ts`: variações e estoque de variações filtrados por `empresa_id`; update/desativação também filtram por tenant.
- `src/app/(app)/estoque/page.tsx`: movimentação de insumo não busca mais `empresa_id` diretamente em `perfis`; passa a usar `getEmpresaIdObrigatoria()`.

### Admin Master operando empresa
- `src/services/_tenant.ts`: contexto operacional do Master agora pode salvar detalhes da empresa selecionada, não apenas o ID.
- `src/app/(app)/master/empresas/page.tsx`: criada tela para o Admin Master escolher e operar uma empresa.
- `src/components/layout/Header.tsx`: mostra aviso fixo “Operando como...” fora do `/master`, com botão para sair do modo empresa.

### Módulos por empresa
- `src/services/modulos-empresa.ts`: adicionados helpers `normalizeModuloCodigo`, `getModuloCodigoFromRecord` e `buildEmpresaModuloPayload` para padronizar `modulo_codigo` mantendo compatibilidade com `modulo`.
- `src/app/(app)/master/modulos-empresas/page.tsx`: tela agora carrega os módulos reais salvos no banco antes de aplicar padrões do ramo, evita sobrescrita silenciosa e usa query key V9.1.
- `src/app/api/master/route.ts`: API Master ajustada para `modulo_codigo` mantendo compatibilidade com coluna antiga `modulo`.

### Atendimento, setores e login funcionário
- `src/services/restaurante.ts`: login operacional cria sessão em `restaurant_staff_sessions` quando a tabela existir.
- `src/hooks/useRestaurantAccess.ts`: limpeza do login operacional remove também a sessão.
- `supabase/migrations/040_vf_nexus_v9_1_restaurante_login_staff_seguro.sql`: reforça login por empresa, exige código/matrícula, cria sessões operacionais e impede busca global por CPF.

### Varejo e variações
- `supabase/migrations/039_vf_nexus_v9_1_hardening_varejo_tenant.sql`: adiciona/reforça `empresa_id` nas tabelas de variações, estoque de variação e movimentações, preenchendo a partir do produto e criando índices por tenant.

### Mobile, design e botões
- `src/components/layout/Sidebar.tsx`: substitui siglas/textos de ícones por ícones reais do `lucide-react` no menu desktop.
- `src/app/globals.css`: adicionada camada final de contraste V9.1, mobile bottom navigation, status semânticos e proteção contra texto invisível.
- `src/app/(app)/configuracoes/page.tsx`: botão decorativo alterado para “Prévia do botão”.

### PWA
- `src/app/providers.tsx`: registro do Service Worker agora funciona mesmo se a tela já estiver carregada.
- `src/components/mobile/InstallAppPrompt.tsx`: atualização manual envia a mensagem correta para o Service Worker.
- `public/sw.js`: mantido cache V9 sem reload agressivo.

## Migrations novas

- `039_vf_nexus_v9_1_hardening_varejo_tenant.sql`
- `040_vf_nexus_v9_1_restaurante_login_staff_seguro.sql`

## Validação realizada neste ambiente

- Removidos arquivos `.bak`.
- Verificado que `src/app/(app)/estoque/page.tsx` não usa mais `from('perfis').select('empresa_id')`.
- Verificado que a query key antiga `empresa-modulos-visiveis-v4` não permanece no front.
- O `npm run typecheck` não pôde ser concluído neste ambiente porque não há `node_modules` instalado; os erros retornados foram de dependências ausentes como `react`, `@tanstack/react-query`, `next`, `vitest`, `@types/node` e outras. Execute `npm ci --legacy-peer-deps --no-audit --no-fund` no VS Code antes de validar.

## Validação obrigatória no VS Code

```powershell
npm ci --legacy-peer-deps --no-audit --no-fund
npm run typecheck
npm run lint
npm test
npm run build
```

## Pontos para validação manual

1. Criar duas empresas e confirmar que financeiro/compras/cardápio/varejo/estoque não misturam dados.
2. Logar como Admin Master, escolher “Operar esta empresa” e validar que dashboards operacionais mostram apenas a empresa selecionada.
3. Rodar as migrations 039 e 040 no Supabase.
4. Testar login funcionário com CPF igual em empresas diferentes.
5. Testar mobile em Android/PWA removendo a instalação antiga antes.
6. Validar PDV, Scanner, Etiquetas, Atendimento, Caixa e Reservas no modo claro e escuro.
