# VF Nexus — Reservas e Adiantamentos V6

Implementação estrutural do módulo `reservas_adiantamentos`.

## Entregas

- Módulo dinâmico por ramo: reserva com sinal, agendamento com sinal, encomenda com entrada, reserva de produto, serviço com entrada e entrada de atendimento.
- Rota `/reservas` com lista, filtros, KPIs e cards mobile-first.
- Rota `/reservas/nova` para criação com entrada, Pix, valores e cálculo automático do restante.
- Rota `/reservas/[id]` para edição completa antes do recibo.
- Rota `/reservas/[id]/recibo` com pré-recibo editável, copiar texto, WhatsApp, impressão e PDF via jsPDF.
- Service `src/services/reservas-adiantamentos.ts` com isolamento por `empresa_id` em todas as consultas.
- Migration `036_vf_nexus_reservas_adiantamentos.sql` com tabelas, índices, RLS, função de código e trigger de cálculo.
- Componentes em `src/components/reservas`.
- Integração ao menu dinâmico por ramo via `reservas_adiantamentos`.

## Observação

Antes de enviar/imprimir o recibo, todos os campos principais podem ser editados: cliente, telefone, serviço/produto, descrição, data, hora, valor total, entrada, restante, forma de pagamento, Pix, observações, mensagem e termos do recibo.
