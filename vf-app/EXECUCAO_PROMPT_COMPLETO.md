# Execução do prompt completo — VF Nexus

## Parte 1 — Segurança e custo
- `/api/ia` agora exige Bearer token Supabase válido.
- Adicionado limite diário de IA por empresa com `ia_usage_log` e variável `IA_DAILY_LIMIT`.
- Adicionada migration `003_security_calculations_stock_history.sql` com função `empresa_assinatura_ativa()`.
- RLS de INSERT/UPDATE/DELETE das principais tabelas passa a bloquear escrita para assinaturas `vencida`, `bloqueada` ou `cancelada`.

## Parte 2 — Cálculos configuráveis
- `calcularPrecificacao()` agora recebe `margemIdeal` e usa `configuracoes.margem_ideal`.
- `/simulador` e `/fichas` passam a carregar configurações da empresa e usar `margem_minima`, `margem_ideal` e `margem_premium`.
- Trigger SQL `atualizar_custo_produto()` passa a respeitar margens mínima/premium configuradas.
- Campo `custo_total` de produto com ficha técnica e ingredientes fica somente leitura com aviso.

## Parte 3 — Notificações de agendamento mobile/PWA
- Mantida a estrutura de `public/sw.js`, `push_subscriptions`, `notificacoes_agendadas`, opt-in em Configurações e rota `/api/notificacoes/processar`.
- Adicionada rota `/api/notificacoes/dashboard` para resumo diário de alertas via push.

## Parte 4 — Melhorias funcionais
- Vendas de produtos com ficha técnica agora geram baixa automática em `movimentacoes_estoque`.
- Adicionado método de estorno que gera movimentação compensatória de entrada.
- Criada tabela `historico_precos` e trigger para registrar mudanças de preço.
- Tela de Produto exibe histórico recente de preço.
- Relatórios mostram comparação percentual com período anterior.
- Plano Free limitado a 20 produtos/serviços.

## Parte 5 — Limpeza
- Removidas dependências não utilizadas do `package.json`.
- Removidas pastas vazias fora do grupo `(app)`.
- Consolidado changelog em `CHANGELOG.md`.
- Corrigida numeração duplicada no README.
- Atualizado modelo padrão Anthropic para `claude-sonnet-4-6`.

## Variáveis de ambiente novas
- `VAPID_PUBLIC_KEY`: chave pública Web Push.
- `VAPID_PRIVATE_KEY`: chave privada Web Push.
- `VAPID_SUBJECT`: e-mail do dono do projeto no formato `mailto:email@dominio.com`.
- `CRON_SECRET`: segredo usado no header Authorization dos crons.
- `ANTHROPIC_MODEL`: modelo Anthropic usado pela IA. Padrão: `claude-sonnet-4-6`.
- `IA_DAILY_LIMIT`: limite diário de mensagens de IA por empresa. Padrão: `50`.

## Vercel Cron recomendado
- A cada 5 minutos: `/api/notificacoes/processar`
- Todo dia às 08:00: `/api/notificacoes/dashboard`
- Ambos com header: `Authorization: Bearer SEU_CRON_SECRET`

## Mudanças que podem alterar valores visíveis
- `Preço Ideal` passa a respeitar `configuracoes.margem_ideal`.
- `Preço Mínimo` e `Preço Premium` recalculados por ficha técnica passam a respeitar `configuracoes.margem_minima` e `configuracoes.margem_premium`.

## Validação
A instalação de dependências não pôde ser concluída neste ambiente por timeout de rede ao acessar o registry npm. Rode localmente:

```bash
npm install
npm run lint
npm run typecheck
npm run build
```

