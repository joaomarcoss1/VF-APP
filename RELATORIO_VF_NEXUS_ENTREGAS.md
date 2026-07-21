# Relatório de implementação — VF Nexus Entregas

Implementação estrutural do módulo de entregas no VF Nexus.

## Entregue

- Tabelas e RLS para entregadores, entregas, ofertas, histórico, ganhos, recibos, sync offline e dispositivos.
- Services reais em `src/services/entregas.ts`.
- Portal mobile-first do entregador em `/portal-entregador`.
- Painel da empresa em `/entregas`.
- Cadastro de entregadores.
- Criação de entrega avulsa.
- Aceite e finalização por entregador.
- Google Maps externo.
- IndexedDB para finalização offline.
- Faturamento e recibos.
- Redirecionamento de login para entregadores.

## Observações

A integração FCM/Web Push está preparada na estrutura de banco, mas depende das chaves do provedor para envio com app fechado.
