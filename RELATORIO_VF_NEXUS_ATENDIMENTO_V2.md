# VF Nexus Atendimento V2

Esta versão corrige estruturalmente o módulo de atendimento para bares e restaurantes:

- Tela de setor premium, escura, responsiva e com alto contraste.
- Modal real de nova comanda, separando atendimento em mesa e venda balcão.
- Mesas enumeradas, com vínculo correto entre `restaurant_tabs.mesa_id` e `restaurant_tables.id`.
- Botões reais para aumentar, diminuir, remover e editar observações dos itens.
- Recálculo automático de subtotal, taxa, desconto, total e total atual da mesa.
- Cadastro de funcionários por setor em `/atendimento/funcionarios`.
- Login operacional por nome/CPF/código da empresa em `/atendimento/login-funcionario`.
- Configuração de mesas em `/atendimento/configuracoes/mesas`.
- Cozinha com fila por status e notificações para atendimento/caixa.
- Caixa com baixa real da comanda, pagamentos e liberação da mesa.
- Migration `033_vf_nexus_atendimento_operacional_v2.sql` com tabela `restaurant_staff`, índices e reforços de isolamento multiempresa.

## Rodar no VS Code

```powershell
npm install --legacy-peer-deps
npm run dev
```

## Antes de usar no Supabase

Execute as migrations, principalmente:

- `031_vf_nexus_atendimento_restaurante.sql`
- `032_vf_nexus_isolamento_empresas_produtos_fichas.sql`
- `033_vf_nexus_atendimento_operacional_v2.sql`

## Deploy Vercel

O projeto contém `package.json` e `package-lock.json` na raiz. Na Vercel use Root Directory vazio.
