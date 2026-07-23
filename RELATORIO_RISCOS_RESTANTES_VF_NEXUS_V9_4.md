# Riscos restantes — VF Nexus V9.4

A V9.4 corrige riscos críticos, mas não deve ser descrita como “sem falhas” antes da homologação real.

## Pendências técnicas

1. Paginação ainda precisa ser expandida para todas as telas secundárias, como financeiro completo, reservas, eventos, entregas, notificações e algumas listas Master.
2. Relatórios muito grandes ainda devem migrar para jobs assíncronos/servidor.
3. E2E Playwright e testes de banco com duas empresas não foram adicionados à dependência atual nem executados.
4. PDF precisa de validação visual automatizada em múltiplos tamanhos e logos reais.
5. Rate limit em memória não compartilha estado entre instâncias serverless.
6. O projeto ainda contém componentes e services históricos grandes que demandam refatoração gradual.
7. Há dependências depreciadas, como Supabase Auth Helpers, que devem ser migradas para `@supabase/ssr` em uma etapa controlada.
8. Recharts 2.x deve ser atualizado em etapa separada, com testes dos gráficos.
9. Operação offline precisa de teste real com perda de rede, reconexão, conflito e duas empresas.
10. Stripe, Evolution API e WhatsApp Cloud dependem de credenciais e ambientes externos.

## Regra de liberação

A versão deve permanecer em homologação até:

- pipeline completo passar;
- migration 048 ser aplicada e diagnosticada;
- RLS ser testada com empresas A e B;
- fluxos PDV, estoque, financeiro, restaurante, reserva, entrega e recibo serem testados de ponta a ponta;
- Vercel concluir build e deploy sem erros.
