# Relatório de migrations — VF Nexus V9.4

## Migration adicionada

```text
supabase/migrations/048_vf_nexus_v9_4_security_tenant_hardening.sql
```

## Principais objetos

- `master_operational_contexts`;
- `stripe_webhook_events` e controles de idempotência;
- contexto operacional do Master;
- `vf_effective_empresa_id()`;
- seleção e limpeza da empresa operacional;
- autorização `vf_can` em modo fail-closed;
- policies restritivas por empresa efetiva;
- colunas e índices de idempotência;
- resumo agregado de vendas por período.

## Ordem

Banco existente atualizado até V9.3: aplicar somente a migration 048.

Banco novo: aplicar de 000 até 048 em ordem numérica.

## Diagnóstico

Executar depois da migration:

```text
supabase/DIAGNOSTICO_SEGURANCA_V9_4.sql
```

Não aplicar diretamente em produção sem backup, homologação e revisão de registros legados com `empresa_id` nulo.
