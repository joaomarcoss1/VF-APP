# Checklist Final — VF Nexus

## Build
- [ ] `npm install`
- [ ] `npm run typecheck`
- [ ] `npm run lint`
- [ ] `npm run build`
- [ ] `npm run dev`

## Rotas
- [ ] `/auth`
- [ ] `/onboarding`
- [ ] `/dashboard`
- [ ] `/produtos`
- [ ] `/vendas`
- [ ] `/estoque`
- [ ] `/notas`
- [ ] `/clientes`
- [ ] `/agendamentos`
- [ ] `/financeiro`
- [ ] `/diagnostico`
- [ ] `/comprovantes`
- [ ] `/relatorios`
- [ ] `/equipe`
- [ ] `/auditoria`
- [ ] `/fechamento`
- [ ] `/master-admin`
- [ ] `/configuracoes`

## Funcional
- [ ] Criar empresa no onboarding.
- [ ] Alterar paleta nas configurações.
- [ ] Fazer upload da logo.
- [ ] Cadastrar produto físico.
- [ ] Cadastrar serviço.
- [ ] Registrar venda multi-itens.
- [ ] Confirmar baixa de estoque.
- [ ] Confirmar lançamento financeiro.
- [ ] Gerar comprovante com branding.
- [ ] Lançar nota/compra e abastecer estoque.
- [ ] Criar agendamento.
- [ ] Ver diagnóstico inteligente.
- [ ] Ver relatórios e PDFs.
- [ ] Validar master admin.

## Validação adicional — Rodada Full Prompt Hardening

Execute estes testes após aplicar a migration 014:

1. Acesse `/diagnostico` e confira se aparecem score, DRE, curva ABC e insights.
2. Acesse `/ordens-servico`, crie uma OS e altere o status.
3. Acesse `/financeiro` e confira a DRE simplificada.
4. Cadastre uma venda com múltiplos itens e valide o comprovante.
5. Confira se a baixa de estoque aparece nos produtos finais e insumos.
6. Teste usuário comum tentando abrir `/master-admin`.
7. Teste empresa com módulo bloqueado acessando rota diretamente.
8. Cadastre logo/cor da empresa e gere comprovante/relatório para validar branding.
9. Verifique no Supabase se `logs_auditoria` recebe ações críticas.
10. Execute `npm run typecheck`, `npm run lint` e `npm run build`.
