# Relatório de segurança — VF Nexus V9.4

## Controles implementados

1. **Fail-closed:** erro, ausência ou indisponibilidade da autorização bloqueia a operação.
2. **Preço server-side:** valores de assinatura são resolvidos pelo plano oficial, não pelo navegador.
3. **Webhooks fechados:** ausência de segredo resulta em indisponibilidade controlada.
4. **Idempotência:** eventos Stripe, billing, WhatsApp e vendas offline recebem chaves de deduplicação.
5. **Service role:** utilitário administrativo é importado apenas em rotas server-side.
6. **Tenant efetivo:** usuário comum usa sua empresa; Master usa contexto operacional persistido.
7. **Policies restritivas:** migration 048 adiciona políticas por empresa efetiva às tabelas operacionais existentes.
8. **Auditoria:** request ID e logger estruturado com sanitização de campos sensíveis.
9. **Rate limit:** checkout, webhooks e WhatsApp possuem proteção process-local.
10. **PWA:** não armazena APIs privadas nem respostas Supabase.

## Limites conhecidos

- O rate limit atual é em memória e deve ser substituído por Redis/KV em múltiplas instâncias serverless.
- A segurança final depende da aplicação bem-sucedida da migration 048 e da revisão do diagnóstico SQL no Supabase real.
- Policies históricas continuam no banco; a migration cria policies restritivas, mas a auditoria de produção deve confirmar que não restou policy permissiva conflitante.
- Chaves e segredos precisam ser configurados somente na Vercel/Supabase e nunca no repositório.
