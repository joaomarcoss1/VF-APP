# Guia VF Nexus Entregas

O módulo **VF Nexus Entregas** adiciona entregadores por empresa, criação de entregas, Portal do Entregador, Google Maps externo, faturamento, recibos e finalização offline.

## Como usar

1. Aplique a migration `supabase/migrations/028_vf_nexus_entregas.sql`.
2. Cadastre entregadores em **Entregas > Entregadores**.
3. Crie uma entrega em **Entregas > Nova entrega**.
4. O entregador acessa `/portal-entregador` após login com perfil `driver` ou `entregador`.
5. O entregador aceita a entrega, abre rota no Google Maps, marca retirada e finaliza.
6. Se estiver offline, a finalização fica salva no IndexedDB e sincroniza quando a internet voltar.

## Segurança multiempresa

Todas as tabelas usam `empresa_id` e RLS. O entregador só vê as próprias entregas ou ofertas disponíveis da própria empresa.

## Google Maps

A rota usa link externo:
`https://www.google.com/maps/dir/?api=1&destination=ENDERECO`

## Notificações

A versão inclui aviso visual, polling no portal e tabela `delivery_driver_devices` preparada para FCM/Web Push.
