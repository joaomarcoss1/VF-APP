# VF Nexus Atendimento — Implementação estrutural

Esta versão adiciona o módulo **VF Nexus Atendimento**, voltado para bares, restaurantes, lanchonetes e operações com mesas, comandas, cozinha e caixa.

## Principais entregas

- Login refinado, com textos profissionais e redirecionamento para escolha de setor.
- Nova tela `/setor` com escolha entre VF Nexus Atendimento, Cozinha, Caixa e Painel Administrativo.
- Nova rota `/atendimento` com mapa de mesas, comandas, indicadores e ações rápidas.
- Nova rota `/atendimento/comanda/[id]` para adicionar itens, enviar pedido à cozinha/bar, imprimir comanda e solicitar fechamento ao caixa.
- Nova rota `/cozinha` com cards de pedidos em vermelho, amarelo e verde.
- Nova rota `/atendimento/caixa` para visualizar comandas, pedidos prontos, receber pagamento, calcular troco e finalizar comanda.
- Nova rota `/atendimento/caixa/fechamento` para conferência e fechamento de caixa.
- Rotas de impressão térmica para comanda, pré-conta, comprovante e fechamento.
- Services estruturais em `src/services/restaurante.ts` com filtro por `empresa_id` e fallback visual para ambiente ainda sem migration.
- Cálculos isolados em `src/lib/restaurante-calculos.ts`.
- Hook de notificações sonoras/visuais em `src/hooks/useRestaurantNotifications.ts`.
- Componentes reutilizáveis em `src/components/restaurante`.
- Migration `031_vf_nexus_atendimento_restaurante.sql` com tabelas, índices, RLS e estrutura multiempresa.
- Testes de cálculo em `src/tests/restaurante-atendimento.test.ts`.
- Correção adicional no service de entregas para o erro de TypeScript em `.maybeSingle()`.

## Nome oficial do módulo

O nome usado no sistema é **VF Nexus Atendimento**.

## Tabelas criadas

- `restaurant_tables`
- `restaurant_tabs`
- `restaurant_tab_items`
- `restaurant_orders`
- `restaurant_order_items`
- `restaurant_tab_payments`
- `restaurant_cash_sessions`
- `restaurant_cash_movements`
- `restaurant_notifications`
- `restaurant_print_jobs`
- `restaurant_service_settings`

## Próximos passos no Supabase

Execute a migration nova:

```sql
supabase/migrations/031_vf_nexus_atendimento_restaurante.sql
```

Depois crie mesas para cada empresa e configure produtos com:

- `setor_producao`: `cozinha`, `bar`, `balcao` ou `nenhum`
- `aparece_no_atendimento`: `true`
- `ordem_atendimento`: ordem visual no atendimento

## Validação recomendada

- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run build`

No ambiente de sandbox não foi possível instalar dependências por timeout do npm, então a validação final deve ser executada localmente ou na Vercel.
