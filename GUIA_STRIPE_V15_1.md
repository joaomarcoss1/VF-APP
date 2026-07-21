# Guia Stripe V15.1

1. Crie os produtos e preços recorrentes na Stripe.
2. Copie os Price IDs.
3. Configure as variáveis de ambiente.
4. Aplique a migration V15.1.
5. No VF Nexus, acesse `/master/planos` e informe os Price IDs.
6. O cliente acessa `/assinatura` e clica em Assinar com Stripe.
7. A Stripe redireciona para o checkout seguro.
8. O webhook `/api/stripe/webhook` atualiza a assinatura no Supabase.
9. Se o pagamento falhar, a empresa entra em `past_due`.
10. Se cancelar ou ficar sem pagamento, o sistema bloqueia os módulos operacionais.

Use modo de teste antes de produção.
