# CHECKLIST DE VALIDAÇÃO FINAL — VF Nexus V12

## Ambiente
- [ ] Node 24.x instalado
- [ ] `.env.local` configurado
- [ ] Migrations aplicadas até `023_vf_nexus_v12_final_validation_hardening.sql`
- [ ] `npm ci --legacy-peer-deps --no-audit --no-fund --registry=https://registry.npmjs.org/` executado
- [ ] `npm run typecheck` executado
- [ ] `npm run lint` executado
- [ ] `npm run test` executado
- [ ] `npm run build` executado
- [ ] `npm run dev` executado

## Mobile/PWA
- [ ] Login responsivo
- [ ] Dashboard sem overflow horizontal
- [ ] Produtos, vendas, estoque, financeiro e relatórios utilizáveis sem zoom
- [ ] Bottom nav não cobre conteúdo
- [ ] App instalado abre sem ficar espremido

## Identidade visual
- [ ] Logo do menu alinhada
- [ ] Logo da abertura alinhada
- [ ] Favicon aparece
- [ ] Logo do cliente tem fallback
- [ ] Paleta muda o app inteiro de forma harmônica
- [ ] Paleta permanece após fechar/abrir/logout/login

## Operação
- [ ] Criar produto
- [ ] Criar cliente
- [ ] Criar venda
- [ ] Venda gera itens, pagamentos, financeiro e baixa estoque com RPC V12
- [ ] Estorno devolve/ajusta dados
- [ ] Nota/abastecimento salva nota e itens
- [ ] Cardápio gera PDF
- [ ] Relatórios geram PDF
- [ ] Excel gera `.xlsx` real

## Segurança
- [ ] Empresa A não vê dados da Empresa B
- [ ] Usuário sem permissão não vê módulo
- [ ] Usuário sem permissão não acessa rota digitando URL

## Fiscal
- [ ] Configuração fiscal salva
- [ ] Modo homologação/produção claro
- [ ] Documento fiscal deixa claro que emissão oficial depende de provedor/certificado
