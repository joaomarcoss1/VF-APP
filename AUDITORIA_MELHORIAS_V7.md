# Auditoria e entrega VF Nexus v7 — Commercial Readiness

Esta versão foi criada para transformar o VF Nexus em um MVP avançado mais seguro e validável para piloto com clientes reais. O foco foi aplicar melhorias estruturais reais no código, banco, RBAC/RLS, services, fluxos críticos e validação, evitando tela falsa ou botão sem função.

## Principais alterações aplicadas

### 1. Banco de dados, migrations e RLS
- Criada a migration `supabase/migrations/018_vf_nexus_commercial_readiness.sql`.
- Corrigida a base de `master_admins` na migration inicial, incluindo `user_id`, índice e função `is_master_admin()` antes das policies que dependem dela.
- Recriada a função `vf_can(modulo, acao)` com matriz de permissões por cargo.
- Criadas/garantidas tabelas estruturais ausentes no código:
  - `comprovantes_historico`;
  - `notificacoes_central`;
  - `equipe_convites`;
  - `impersonar_sessoes`.
- Recriadas policies RBAC para tabelas críticas com isolamento por `empresa_id`.
- Criadas funções RPC:
  - `vf_iniciar_impersonar`;
  - `vf_encerrar_impersonar`.
- Atualizado `supabase/VALIDACAO_BANCO_NOVO.sql` para validar tabelas, funções, RLS, policies, `master_admins` e migration 018.

### 2. RBAC real no frontend, service e banco
- `assertPermission` agora valida a matriz local e tenta validar também via RPC `vf_can`.
- `AppShell` bloqueia rotas sem permissão e exibe tela de acesso negado.
- `Sidebar` e `MobileNav` filtram módulos com base em permissões reais do perfil.
- Ações críticas de vendas usam permissões específicas: `cancelar`, `estornar`, `criar`, `ver`.

### 3. Services reais
- `src/lib/api.ts` ficou apenas como camada curta de compatibilidade.
- Services por domínio foram mantidos e ampliados.
- `notificacoes.ts` passou a operar a central real `notificacoes_central`.
- `equipe.ts` passou a operar convites reais em `equipe_convites`.
- `master.ts` passou a usar RPCs reais para impersonar.
- `comprovantes.ts` agora possui tabela correspondente no banco.

### 4. Vendas, cancelamento e estorno
- Tela de vendas recebeu suporte a múltiplas formas de pagamento.
- Adicionado cálculo de troco para dinheiro.
- Validação impede finalizar venda quando o total dos pagamentos não fecha com o total da venda.
- Cancelamento e estorno passaram a usar modal profissional com motivo obrigatório.
- Status de entrega pode ser alterado visualmente na lista.
- Service de vendas usa RPC segura `vf_cancelar_venda` para cancelamento/estorno.

### 5. UX e design system
- Criado componente `ConfirmActionButton` para ações críticas.
- Removido uso de `confirm()` e `alert()` críticos no `src`.
- Ações destrutivas passaram a exigir modal e justificativa quando necessário.
- Design manteve identidade NexLabs/VF Nexus e reduziu padrões antigos de confirmação do navegador.

### 6. Dependências e build
- Node travado em 20 via `.nvmrc`, `.node-version`, `package.json` e Vercel.
- Atualizado para Next.js `16.2.9`.
- Criado `package-lock.json`.
- Adicionado `eslint.config.mjs` compatível com ESLint 9.
- Removida dependência `xlsx` e substituída exportação por CSV para eliminar vulnerabilidade conhecida.
- Adicionado override de `postcss` para `8.5.10`.
- `npm audit --omit=dev --audit-level=high` retorna `found 0 vulnerabilities`.

### 7. Validações executadas
Executado neste ambiente:

```bash
npm run typecheck
npm run test
npm run lint
NEXT_TELEMETRY_DISABLED=1 \
NEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co \
NEXT_PUBLIC_SUPABASE_ANON_KEY=dummy \
SUPABASE_SERVICE_ROLE_KEY=dummy \
MASTER_ADMIN_EMAILS=admin@example.com \
npm run build
npm audit --omit=dev --audit-level=high
```

Resultados:
- Typecheck: aprovado.
- Testes: 6 arquivos, 11 testes aprovados.
- Lint: aprovado, com 14 warnings não bloqueantes.
- Build: aprovado com Next.js 16.2.9.
- Audit high: aprovado, 0 vulnerabilidades.

## Observações técnicas importantes

1. O build usa `experimental.cpus = 1` no `next.config.js` porque o ambiente de build desta execução travava ao coletar páginas com muitos workers. Isso estabilizou o build. Na Vercel, pode ser mantido com segurança ou ajustado após validação.

2. O arquivo `middleware.ts` ainda funciona, mas o Next.js 16 informa que a convenção será substituída por `proxy`. Isso não quebra o build, mas deve entrar no próximo ciclo técnico.

3. `@supabase/auth-helpers-nextjs` ainda está no projeto. A migração ideal futura é para `@supabase/ssr`, mas a troca completa exige cuidado no auth/middleware e foi mantida estável nesta v7.

4. Integrações externas como cobrança recorrente, Asaas/Mercado Pago/Stripe, envio real por WhatsApp e IA Anthropic dependem de credenciais e provedores externos. O código foi preparado para não inventar integração falsa.

5. A validação SQL em Supabase limpo precisa ser feita no seu projeto real, aplicando as migrations e executando `supabase/VALIDACAO_BANCO_NOVO.sql`.

## Pendências recomendadas para próxima etapa

- Migrar `middleware.ts` para `proxy.ts` no padrão do Next.js 16.
- Migrar Supabase Auth Helpers para `@supabase/ssr`.
- Criar testes de integração reais com Supabase local.
- Evoluir OS com upload real de fotos/assinatura em Storage.
- Integrar billing real com Asaas, Mercado Pago ou Stripe.
- Ampliar testes de RLS e migrations em CI.
- Reduzir warnings de hooks no lint.
