# VF Nexus — Rodada profissional comercial

Esta versão foi organizada para evoluir o SaaS de MVP avançado para uma base mais adequada a uso comercial multirramo.

## Melhorias aplicadas

1. **Organização por ramo e módulos**
   - Mantido controle por `setor_modulos` e `empresa_modulos`.
   - Novos módulos comerciais foram adicionados ao catálogo de funcionalidades.
   - Menu mobile agora concentra atalhos principais e envia funções extras para o painel “Mais funcionalidades”.

2. **Equipe e permissões**
   - Nova rota `/equipe`.
   - Cadastro de colaboradores, cargos, status e permissões operacionais.
   - Preparação para uso em empresas com vendedores, atendentes, financeiro e gerência.

3. **Auditoria**
   - Nova rota `/auditoria`.
   - Histórico de ações críticas por empresa.
   - Serviços preparados para registrar alterações sensíveis.

4. **Fechamento diário**
   - Nova rota `/fechamento`.
   - Conferência de vendas, receitas, despesas, saldo e meios de pagamento.
   - Histórico por data para controle financeiro diário.

5. **Supabase**
   - Nova migration `006_commercial_grade_saas.sql`.
   - Tabelas adicionadas: `equipe_usuarios`, `logs_auditoria`, `fechamentos_diarios`.
   - Bucket privado `comprovantes` preparado no Supabase Storage para evolução do armazenamento de PDFs.

## O que executar no Supabase

Execute apenas a migration nova caso as anteriores já tenham sido aplicadas:

```sql
supabase/migrations/006_commercial_grade_saas.sql
```

## Observação técnica

Esta versão preserva a estrutura existente do app e não reescreve rotas antigas. As mudanças foram aplicadas de forma incremental para reduzir risco de quebra.
