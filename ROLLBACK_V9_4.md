# Rollback V9.4

## Antes de aplicar

1. Crie backup lógico do Supabase.
2. Registre a versão atual do Git/Vercel.
3. Aplique a migration 048 primeiro em homologação.

## Aplicação de rollback

O rollback deve ser feito de forma controlada. Não exclua a migration do histórico.

1. Reimplante o commit/artefato anterior na Vercel.
2. Desabilite temporariamente os novos fluxos de checkout e WhatsApp se necessário.
3. Preserve `master_operational_contexts`, eventos de webhook e mensagens para auditoria.
4. Remova somente policies V9.4 que estejam causando bloqueio indevido, depois de comparar com o backup.
5. Não faça `DROP COLUMN` de `idempotency_key` enquanto existirem clientes V9.4 sincronizando filas offline.
6. Não remova `vf_effective_empresa_id()` até todas as policies e services voltarem à versão anterior.

## Recuperação

- Restaure o backup somente em incidente grave e após interromper gravações.
- Reexecute o diagnóstico de segurança após qualquer rollback parcial.
- Documente o motivo, horário, empresa afetada e responsável.
