# CHANGELOG VF Nexus

## CORRECOES_VF_APP

# Correções aplicadas no VF Nexus

## Validação executada

Comandos executados no projeto corrigido:

```bash
npm install
npm run lint
npm run typecheck
npm run build
npm run dev -- -p 3002
```

Resultados:

- `npm install`: dependências instaladas e `package-lock.json` gerado.
- `npm run lint`: sem erros.
- `npm run typecheck`: sem erros TypeScript.
- `npm run build`: build de produção gerado com sucesso.
- `npm run dev -- -p 3002`: servidor iniciou; `/auth` respondeu 200; `/` redirecionou para `/auth?erro=supabase-env` quando o Supabase não estava configurado.

## Principais correções

1. RootLayout corrigido
   - Removido `use client` de `src/app/layout.tsx`.
   - Criado `src/app/providers.tsx` para React Query e Toaster.
   - Adicionadas exports `metadata` e `viewport` compatíveis com App Router.

2. Conflito de rotas removido
   - Removido `src/app/dashboard/layout.tsx`, que conflitava com `src/app/(app)/dashboard/page.tsx`.

3. Package corrigido
   - Removidos scripts quebrados `db:migrate` e `db:seed`.
   - Adicionado `typecheck`.
   - Gerado `package-lock.json`.

4. Supabase corrigido
   - `src/lib/supabase.ts` agora valida variáveis de ambiente com mensagem clara.
   - Middleware não quebra quando `.env.local` não existe.
   - Serviços de CRUD agora inserem `empresa_id` automaticamente a partir do perfil do usuário.
   - Campos vazios são convertidos para `null` antes de enviar ao Supabase.

5. Serviços corrigidos em `src/lib/api.ts`
   - Insumos, produtos, fichas técnicas, fornecedores, estoque, vendas, dashboard e configurações com tratamento de erro.
   - Uso de `maybeSingle()` onde faz sentido para evitar quebra em registro inexistente.
   - Movimentação de estoque adiciona `empresa_id` e `usuario_id` automaticamente quando possível.

6. Motor de precificação corrigido
   - Corrigido retorno de variáveis em `calcularPrecificacao`.
   - Mantidos cálculos por kg, g, litro, ml e unidade.
   - Mantidos CMV, margem bruta, lucro bruto, preço mínimo, ideal, premium e simulador.

7. Build e lint corrigidos
   - Corrigido `Field` para aceitar `className`.
   - Corrigido `Card` para aceitar atributos HTML como `onClick`.
   - Corrigida página de fichas com `Suspense` por uso de `useSearchParams`.
   - Corrigidos textos que quebravam ESLint por aspas não escapadas.
   - Criado `.eslintrc.json`.

8. IA corrigida
   - `src/app/api/ia/route.ts` não instancia Anthropic sem chave.
   - Se `ANTHROPIC_API_KEY` estiver ausente, retorna resposta amigável e não quebra o app.
   - Preparada para usar contexto real de dashboard, produtos e alertas.

9. SQL revisado
   - `supabase/migrations/001_schema.sql` reestruturado.
   - Triggers revisados para custos de insumo, custo de ficha, custo do produto e estoque.
   - Políticas RLS separadas para SELECT, INSERT, UPDATE e DELETE.
   - Trigger de novo usuário cria empresa, perfil, configurações e categorias padrão.
   - View `vw_dashboard` corrigida para evitar somas duplicadas por joins.

10. Documentação atualizada
   - README refeito com instalação, Supabase, env, SQL, build, troubleshooting e fluxo mínimo funcional.

## Observação importante

O app está pronto para rodar e evoluir, mas a validação real de CRUD depende de você executar o SQL no Supabase e preencher `.env.local` com as chaves do seu projeto.

## Módulo de Eventos adicionado

Foi adicionada a funcionalidade completa de precificação para eventos gastronômicos.

Arquivos principais alterados/criados:

- `src/app/(app)/eventos/page.tsx`
- `src/lib/precificacao.ts`
- `src/lib/api.ts`
- `src/lib/exports.ts`
- `src/types/index.ts`
- `src/components/layout/Sidebar.tsx`
- `src/components/layout/MobileNav.tsx`
- `supabase/migrations/001_schema.sql`
- `README.md`

Funcionalidades implementadas:

- criação, edição e exclusão de eventos;
- seleção de produtos cadastrados;
- cálculo automático de quantidade necessária por produto;
- cálculo de rendimento total e sobra estimada;
- cálculo de custo dos produtos, custo operacional, custo extra e desconto;
- sugestão de valor a cobrar com base na margem de lucro escolhida;
- preço por pessoa;
- lucro estimado;
- CMV;
- markup;
- simulação de cenários com margens de 100%, 150%, 200%, 250%, 300% e 400%;
- resumo financeiro dos eventos salvos;
- exportação premium em PDF;
- exportação organizada em Excel;
- menu desktop e mobile com acesso a Eventos;
- tabelas `eventos` e `evento_itens` no Supabase com RLS e políticas de SELECT, INSERT, UPDATE e DELETE.

Validação adicional executada após o módulo de Eventos:

```bash
npm run typecheck
npm run lint
npm run build
npm run dev -- -p 3004
```

Resultado:

- TypeScript sem erros.
- ESLint sem erros.
- Build de produção concluído com sucesso.
- Servidor de desenvolvimento iniciou corretamente.
- Rota `/eventos` respondeu redirecionando para `/auth?erro=supabase-env` quando Supabase não estava configurado, comportamento esperado.

## Atualização — Cardápio, Promoções e Relatórios Premium

Foram adicionados:

- rota `/cardapio` para montar cardápio profissional e exportar PDF;
- rota `/promocoes` para cadastrar ofertas vinculadas aos produtos;
- integração automática de promoções ativas no cardápio;
- PDF premium do cardápio com categorias, descrições, preços e selo de promoção;
- melhorias visuais e analíticas em `/relatorios`;
- novos serviços em `src/lib/api.ts` para `CardapioService` e `PromocoesService`;
- novos tipos em `src/types/index.ts`;
- novas tabelas SQL: `cardapios`, `cardapio_itens` e `promocoes`;
- menu lateral e mobile atualizados com Cardápio e Promoções.

Após aplicar esta versão, executar no Supabase o SQL atualizado em:

`supabase/migrations/001_schema.sql`

## CORRECOES_SAAS_MASTER

# VF Nexus — Atualização SaaS Master

Esta versão inclui, além de Cardápio, Promoções e Relatórios Premium:

## Personalização por empresa
- Nome da empresa editável.
- Tipo de estabelecimento editável.
- CNPJ/CPF, telefone, email e endereço.
- Logo por URL.
- Paleta de cores personalizável.
- Aplicação automática da identidade nos documentos exportados.

## Precificação e gastos
- Preço de venda do produto editável.
- Opção de manter preço manual para o produto.
- Trigger SQL respeitando preço manual quando a ficha técnica muda.
- Aba `/despesas` para cadastrar qualquer gasto com nome, valor, tipo, recorrência e status.
- Resumo mensal estimado de despesas.
- Relatórios considerando despesas mensais e lucro líquido estimado.

## Cardápio e Promoções
- Módulos `/cardapio` e `/promocoes` mantidos.
- Promoções ativas entram automaticamente no cardápio.
- Cardápio em PDF com identidade da empresa.

## Master Admin
- Nova rota `/master-admin`.
- Acesso restrito por `MASTER_ADMIN_EMAILS` e tabela `master_admins`.
- Cadastro de cliente/empresa pelo administrador master.
- Criação de usuário com senha inicial.
- Definição de assinatura mensal ou vitalícia.
- Definição manual do valor da assinatura.
- Controle de próxima cobrança.
- Bloqueio/desbloqueio de empresa.
- Redefinição de senha de usuários.
- Indicadores de receita mensal prevista, vitalícia acumulada, usuários, empresas e assinaturas vencidas.

## SQL
Execute `supabase/migrations/001_schema.sql` no Supabase antes de testar em produção.

## Variáveis novas
```env
MASTER_ADMIN_EMAILS=joaomarcosgpp@hotmail.com,email-do-socio@exemplo.com
```

## CORRECOES_MULTIRRAMO

# VF Nexus — Evolução SaaS Multirramo

Esta versão transforma o VF Nexus em uma base SaaS mais ampla para diferentes tipos de empresas, mantendo o módulo alimentício/bar/restaurante já existente.

## Principais melhorias

- Correção do bug de edição de produtos: agora o update envia somente colunas válidas para o Supabase e permite editar preço de venda e custo manual.
- Tipos de empresa ampliados: alimentício, restaurante, bar, confeitaria, roupas, eletrônicos, variedades, prestador de serviço, barbearia, fotografia e outros.
- Categorias de produtos adaptadas por ramo.
- Produto com custo direto, margem e preço manual, útil para lojas e prestadores de serviço que não precisam de ficha técnica.
- Nova tela `/vendas` para registrar vendas com cliente, canal, pagamento, desconto, taxa de entrega, taxa de serviço e comprovante por WhatsApp.
- Nova tela `/agendamentos` para barbearia, fotografia, autônomos, serviços e confeitarias.
- Comprovante de compra/agendamento com dados do cliente, itens, hora, pagamento, desconto, taxas, nome da empresa e mensagem final.
- Novas colunas no Supabase para vendas e nova tabela `agendamentos`.
- Manifest PWA atualizado e ícones adicionados para instalação no celular.
- Ajustes mobile: menu inferior rolável, inputs maiores, tabelas com rolagem horizontal e melhor uso em telas pequenas.

## SQL obrigatório

Execute novamente o arquivo:

```text
vf-app/supabase/migrations/001_schema.sql
```

A seção final do SQL é idempotente e foi feita para atualizar bancos já existentes.

## Rotas novas

```text
/vendas
/agendamentos
```

## Variáveis

Não houve nova variável obrigatória além das já usadas:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
MASTER_ADMIN_EMAILS=
```

## CORRECOES_MULTIRRAMO_SETOR

# VF Nexus — SaaS Multirramo com controle de funcionalidades por setor

## O que foi ajustado nesta versão

### 1. Painel Master: módulos por ramo
Foi criado um painel dentro de `/master-admin` para o administrador master controlar quais funcionalidades aparecem para cada ramo de empresa.

Exemplos de pré-configuração:

- **Barbearia**: mantém Dashboard, Produtos/Serviços, Vendas, Agendamentos, Estoque, Fornecedores, Promoções, Relatórios, Despesas, Simulador, IA e Configurações. Remove por padrão Insumos, Fichas Técnicas, Eventos e Cardápio.
- **Prestador de serviço/MEI**: mantém Serviços, Vendas, Agendamentos, Fornecedores, Promoções, Relatórios, Despesas, Simulador, IA e Configurações. Remove Insumos, Fichas Técnicas, Eventos e Cardápio por padrão.
- **Restaurante, bar, hamburgueria, delivery, confeitaria e buffet**: mantém Insumos e Fichas Técnicas por padrão.
- **Loja de roupas, eletrônicos e variedades**: mantém Produtos, Estoque, Fornecedores, Vendas, Promoções, Relatórios, Despesas, Cardápio/Catálogo e Eventos/Orçamentos; remove Insumos e Fichas Técnicas por padrão.

O master pode ativar/desativar qualquer módulo por ramo.

### 2. Menu dinâmico por setor
O menu lateral e o menu mobile agora leem a configuração do ramo da empresa e só exibem as telas ativas para aquele setor.

Também foi criado um bloqueio visual: se o cliente tentar acessar manualmente uma URL desativada, o app mostra uma mensagem explicando que a funcionalidade está desativada para aquele ramo.

### 3. Produtos adaptáveis ao ramo
A tela `/produtos` agora muda sua linguagem e comportamento conforme o tipo da empresa:

- Alimentação: prato, drink, lanche, bebida, sobremesa, ficha técnica, insumos e modo de preparo.
- Loja: produto, custo de compra, margem, preço de venda, estoque e descrição de catálogo.
- Serviços/barbearia/fotografia: serviço, pacote, duração, valor cobrado, custo estimado, agendamento e observações.

O botão de ficha técnica só aparece quando o módulo Fichas estiver ativo e fizer sentido para o ramo.

### 4. Correção do produto que não salvava
A atualização de produto foi reforçada no `ProdutosService.atualizar`, mantendo apenas campos editáveis, convertendo números corretamente, recalculando indicadores e respeitando preço manual.

### 5. Banco de dados
Foi adicionada a tabela:

```sql
setor_modulos
```

Ela guarda a configuração global de módulos por ramo e é editada pelo painel Master Admin.

## Passos obrigatórios depois de instalar

1. Copie o `.env.local` da versão anterior para a nova pasta.
2. Rode `npm install`.
3. Rode `npm run dev`.
4. Execute o SQL atualizado em `supabase/migrations/001_schema.sql` no Supabase.
5. Acesse `/master-admin` e confira o painel "Controle de funcionalidades por ramo".
6. Teste os ramos: barbearia, loja de roupas, restaurante, fotografia e prestador de serviço.

## Observação

No ambiente de geração, `npm run lint` e `npx tsc --noEmit` foram validados. O `next build` iniciou e passou da fase de validação em uma tentativa com cache, mas em execuções limpas ficou travado no processo de build do Next dentro do ambiente limitado. Rode `npm run build` no VS Code antes de subir para a Vercel.

## 2026-06-21 — Segurança, cálculo, notificações e limpeza
- Proteção da rota /api/ia com sessão, limite diário por empresa e log de uso.
- Bloqueio de escrita via RLS para assinaturas bloqueadas/vencidas/canceladas.
- Margem ideal configurável usada no cálculo frontend e margem mínima/premium no trigger SQL.
- Histórico de preços dos produtos.
- Notificações push/PWA para agendamentos e resumo diário de alertas.
- Limite de 20 produtos para plano Free.
- Baixa automática de estoque por ficha técnica ao registrar venda.


## VF Nexus — Identidade NexLabs, onboarding e comprovantes PDF

- Renomeado app para VF Nexus, criado pela NexLabs.
- Aplicada identidade visual padrão da NexLabs: azul, dourado e preto.
- Adicionada logo NexLabs na abertura, login, menu e PWA.
- Criado cadastro com 5 perguntas para definir ramo e funcionalidades iniciais.
- Adicionada migration 004 com tabela `empresa_modulos` para liberação/ocultação de módulos por empresa.
- Painel Master Admin ganhou controle de módulos individuais por empresa.
- Menu desktop/mobile passa a respeitar liberação por empresa, além do padrão por setor.
- Vendas e agendamentos agora geram comprovante em PDF premium para WhatsApp/Web Share.
- Atualizados README, manifest PWA e `.env.local.example`.

## 2026-06-24 — Rodada profissional SaaS VF Nexus

- Corrigida a visibilidade do menu **Master Admin**, que agora só aparece para usuários master.
- Criado onboarding pós-login obrigatório para empresas ainda não configuradas.
- Adicionado módulo **Clientes** com CRM simples, contatos, origem e observações.
- Adicionado módulo **Financeiro** com fluxo de caixa, contas a pagar/receber e saldo estimado.
- Adicionado módulo **Comprovantes** com histórico, reemissão de PDF e reenvio por WhatsApp.
- Vendas e agendamentos passam a alimentar automaticamente a base de clientes e o histórico de comprovantes.
- Telas de vendas e agendamentos receberam versão em cards para melhorar a experiência mobile.
- Criada migration `005_crm_financeiro_comprovantes_ux.sql` com tabelas e políticas RLS dos novos módulos.

## 2026-06 — Rodada SaaS comercial profissional

- Adicionado módulo **Equipe e Permissões** para colaboradores, cargos e permissões operacionais.
- Adicionado módulo **Auditoria** com logs por empresa para ações críticas.
- Adicionado módulo **Fechamento diário** com conferência de vendas, receitas, despesas e formas de pagamento.
- Melhorado menu mobile com navegação principal reduzida e painel **Mais funcionalidades**, evitando tela comprimida em celulares.
- Adicionada migration `006_commercial_grade_saas.sql` com tabelas `equipe_usuarios`, `logs_auditoria` e `fechamentos_diarios`.
- Adicionado bucket privado `comprovantes` para evolução de armazenamento de PDFs no Supabase Storage.
