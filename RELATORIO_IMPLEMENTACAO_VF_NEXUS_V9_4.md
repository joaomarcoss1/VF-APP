# Relatório de implementação — VF Nexus V9.4

## Segurança e APIs

- Webhook Stripe fechado quando `STRIPE_WEBHOOK_SECRET` está ausente.
- Validação HMAC de assinatura e timestamp.
- Registro idempotente de eventos Stripe.
- Webhook genérico de billing protegido por segredo, limite de corpo e rate limit.
- Checkout alterado para resolver plano e preço oficial no servidor.
- Utilitários server-only para autenticação, Supabase administrativo, request ID, limite de corpo e rate limit.
- Auditoria de segredos públicos e URLs internas por script.

## Multiempresa e Admin Master

- Contexto operacional persistido na tabela `master_operational_contexts`.
- Função `vf_effective_empresa_id()` para usuário comum ou empresa operacional do Master.
- Seleção e limpeza da empresa do Master por RPC.
- `TenantProvider` sincronizado com o banco e com limpeza de caches ao trocar de empresa.
- Services-base usam empresa efetiva e autorização fail-closed.
- Policies operacionais restritivas adicionadas na migration 048.

## Desempenho

- Paginação server-side e busca com debounce aplicadas a produtos, clientes, fornecedores e vendas.
- Resumo de vendas agregado no banco por RPC.
- Query keys passam a incluir a empresa.
- Fila offline reorganizada por tenant, status, tentativas e chave de idempotência.

## Interface e acessibilidade

- `ButtonLink` elimina Button dentro de Link.
- `Modal` possui Escape, captura e restauração de foco.
- `Field` passa a relacionar label, descrição e erro ao campo.
- Contraste de ações primárias usa `--vf-fg-on-primary`.
- Branding não altera cores semânticas de sucesso, alerta e erro.
- Componentes para textos responsivos e valores formatados.
- Botão fictício “Auto salvar” substituído por estado informativo real.

## Relatórios e documentos

- Rentabilidade por produto agora acumula quantidade, receita, custo total, lucro, margem e CMV.
- Modelo `ProductProfitabilityRow` e teste unitário dedicado.
- Serviço de recibos gera PDF, envia para storage privado e cria URL assinada.
- WhatsApp suporta documento, texto, fila, idempotência, consentimento e fallback honesto.
- Recibo de reserva pode gerar blob PDF e utilizar o mesmo fluxo de envio.

## PWA

- Cache V9.4 versionado.
- Páginas privadas, APIs e Supabase não são armazenados no cache.
- Sem reload automático e sem atualização agressiva durante uso.
