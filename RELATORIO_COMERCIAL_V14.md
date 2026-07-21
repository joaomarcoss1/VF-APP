# VF Nexus V14 Comercial — Relatório de melhorias aplicadas

## Foco da versão
A V14 Comercial foi criada para aproximar o VF Nexus de um SaaS vendável para pequenos negócios locais: mobile/PWA como app real, PDV rápido, catálogo público, QR Code, relatórios premium, planos SaaS, importação Excel, suporte e estrutura para integrações.

## Melhorias estruturais aplicadas
- Nova rota `/pdv` com carrinho, busca de produtos, forma de pagamento, cliente e finalização usando serviço de vendas transacional existente.
- Nova rota pública `/catalogo/[slug]` e alias `/cardapio/[slug]`, sem login, para cardápio/catálogo comercial.
- Publicação de catálogo com `CatalogoPublicoService`, QR Code e compartilhamento por WhatsApp.
- Nova rota `/importacao` com modelos XLSX para produtos, clientes, fornecedores e estoque.
- Nova rota `/assinatura` para base comercial de planos/trial/limites.
- Nova rota `/suporte` para central de ajuda e abertura de chamados.
- Nova API `/api/health` para healthcheck simples.
- Novos helpers comerciais em `src/lib/commercial-v14.ts`.
- Novos componentes mobile em `src/components/mobile/V14Mobile.tsx`.
- Migration `024_vf_nexus_v14_comercial.sql`.

## Pontos que dependem do ambiente
- Teste real de build depende de `npm ci` no VS Code.
- Catálogo público depende de aplicar a migration V14 no Supabase.
- Integrações de pagamento/fiscal dependem de provedores externos e credenciais.
- QR Code usa endpoint público de geração de QR para evitar adicionar dependência.

## Configuração Vercel
Root Directory: vazio.
