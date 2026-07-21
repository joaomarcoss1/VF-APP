# Relatório — VF Nexus Modular por Ramos V4

## Objetivo
Implementação estrutural para transformar o VF Nexus em uma plataforma SaaS modular por ramo de atividade, com primeira tela antes do login, funções dinâmicas por empresa, modo claro/escuro, proteção de rotas, PWA/mobile e reforço do isolamento multiempresa.

## Principais melhorias aplicadas

### 1. Tela inicial antes do login
- Criada tela de seleção de ramo em `/` e `/selecionar-ramo`.
- Ramos disponíveis: Bar/Restaurante, Barbearia, Confeitaria, Roupas, Eletrônicos, Prestador de Serviços e Autônomo.
- A seleção é salva em sessão/localStorage e redireciona para `/login`.
- A tela possui layout premium, responsivo e compatível com tema claro/escuro.

### 2. Login personalizado por ramo
- Login agora lê o ramo selecionado antes do login.
- O código/matrícula da empresa continua sendo validado.
- Se a empresa já tem ramo cadastrado, o ramo real da empresa prevalece sobre o ramo escolhido inicialmente.
- Adicionado link para login operacional de funcionários.

### 3. Modo claro e escuro
- Criado ThemeProvider global.
- Criado botão ThemeToggle.
- Persistência de tema no navegador.
- Suporte a preferência do sistema operacional.
- CSS global atualizado para temas claro/escuro.

### 4. Arquitetura modular por ramo
- Criado `src/config/ramos.ts` com definição formal dos ramos e módulos padrão.
- Criado `src/services/modulos-empresa.ts` para calcular módulos visíveis por empresa.
- Funções de outros ramos deixam de aparecer na interface.
- Módulos extras podem ser liberados ou removidos pelo Admin Master via `empresa_modulos`.

### 5. Menus dinâmicos
- Sidebar e navegação mobile foram refatoradas para exibir somente módulos visíveis.
- Cards e atalhos deixam de ser fixos.
- Funções fora do ramo não aparecem bloqueadas: elas somem da tela.

### 6. Proteção de rotas
- AppShell agora valida módulo visível para a empresa antes de renderizar a rota.
- Acesso direto por URL a módulo fora do ramo é redirecionado para uma rota permitida.
- Isso evita renderização indevida de dados de módulos não liberados.

### 7. Painel Admin Master para módulos
- Criada rota `/master/modulos-empresas`.
- Admin Master pode visualizar empresas, alterar ramo e ativar/desativar módulos por empresa.
- Apenas Admin Master deve controlar a liberação de módulos extras.

### 8. Bar/Restaurante e VF Nexus Atendimento
- Mantido e reforçado o fluxo do VF Nexus Atendimento.
- Criado setor separado Bar/Drinks em `/bar-drinks` e `/atendimento/bar-drinks`.
- Pedidos agora podem ser separados por setor de produção: cozinha ou bar_drinks.
- Funcionários comuns só veem o próprio setor; gerente/admin transitam entre setores.

### 9. Mobile e PWA
- `manifest.json` atualizado.
- `sw.js` atualizado.
- `start_url` definido para a seleção de ramo.
- Mantido suporte a instalação como app, atalhos, modo standalone e experiência mobile.

### 10. Banco de dados e isolamento multiempresa
- Criada migration `035_vf_nexus_ramos_modulares_funcoes_ocultas.sql`.
- Adicionados campos em `empresas`: `ramo_atividade`, `codigo_empresa`, `matricula_empresa` e `modulos_configurados`.
- Criada tabela `empresa_modulos`.
- Reforçados índices e RLS por `empresa_id`.
- Produtos, funcionários, pedidos e módulos passam a respeitar empresa e ramo.

## Validações executadas

- `npm run typecheck`: aprovado.
- `npm run lint`: aprovado, com avisos não bloqueantes já existentes.
- `npm test`: aprovado, 23 arquivos e 53 testes passaram.
- `npm run build`: compilou com sucesso, mas o processo excedeu o tempo limite do ambiente durante a etapa posterior de TypeScript/otimização. O typecheck separado passou, então recomenda-se validar o build final na máquina local ou Vercel.

## Migrations importantes

Rodar no Supabase, mantendo a ordem:

1. `031_vf_nexus_atendimento_restaurante.sql`
2. `032_vf_nexus_isolamento_empresas_produtos_fichas.sql`
3. `033_vf_nexus_atendimento_operacional_v2.sql`
4. `034_vf_nexus_atendimento_mobile_permissoes.sql`
5. `035_vf_nexus_ramos_modulares_funcoes_ocultas.sql`

A migration 035 contém proteção para recriar a função `vf_restaurante_login_staff` sem gerar erro de alteração de tipo de retorno.

## Observação final

A implementação foi feita para que o VF Nexus seja operado por ramo de atividade, ocultando módulos que não pertencem ao ramo da empresa. O Admin Master passa a ter controle central sobre módulos extras por empresa, mantendo a operação mais limpa, segura e profissional.
