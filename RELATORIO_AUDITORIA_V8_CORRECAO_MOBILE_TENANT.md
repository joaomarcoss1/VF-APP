# Relatório de Auditoria e Correção — VF Nexus V8

## Objetivo

Esta versão corrige os problemas relatados na V7/V6: mobile desorganizado, textos sobrepostos, símbolos estranhos, contraste ruim no modo claro, sumiço de PDV/Scanner/Etiquetas, instabilidade do modo Atendimento, login operacional inseguro/confuso, telas piscando e risco de mistura de dados entre empresas.

## Correções aplicadas

### 1. Mobile e layout

- Refeito o `MobileNav` com ícones reais do Lucide em vez de abreviações/símbolos textuais.
- Rótulos mobile agora têm largura máxima, `text-overflow: ellipsis` e não sobrepõem outros itens.
- Criado bottom sheet estável para módulos extras.
- Adicionados overrides finais de CSS V8 para impedir conflitos de regras antigas.
- Corrigido `overflow:hidden` agressivo que causava sensação de tela travada/piscando.
- Reforçada a versão mobile como experiência própria, com navegação fixa, safe-area e cards legíveis.

### 2. Modo claro/escuro e contraste

- Recriados tokens finais para modo claro e escuro.
- Corrigido problema de texto branco em fundo branco.
- Inputs, cards, painéis, botões, navegação e telas operacionais usam variáveis seguras.
- O cache antigo de paleta não sobrescreve mais fundo/texto antes do tema carregar.
- `resolveBranding` agora evita texto com contraste insuficiente.

### 3. PDV, Scanner e Etiquetas

- Mantidos e reforçados como módulos essenciais nos ramos comerciais.
- `useModulosEmpresa` agora mantém fallback estável e não deixa essas funções sumirem durante carregamento.
- Query key considera empresa/ramo para evitar contexto antigo de outro ramo.

### 4. Atendimento e login operacional

- Login operacional agora exige código/matrícula da empresa quando não há empresa operacional selecionada.
- Funcionário só é validado dentro da empresa informada.
- Removido risco de buscar funcionário apenas por CPF sem filtro de empresa.
- Atualização de último acesso do funcionário agora filtra por `empresa_id` e `id`.
- Tela de login operacional foi refeita com tema seguro e layout mobile limpo.

### 5. Separação de dados por empresa

- Reforçado `getOperationalEmpresaId` para aceitar UUID, código ou matrícula e resolver sempre para o `id` real da empresa.
- Evitado fallback de dados demonstrativos em produção.
- Adicionada migration 037 para aplicar RLS padronizado em tabelas com `empresa_id` e `company_id`.
- Adicionados índices de `empresa_id`/`company_id` nas tabelas principais.
- Empresas recebem `codigo_empresa` e `matricula_empresa` únicos quando ausentes.

### 6. Service Worker e piscadas/atualizações

- Registro do Service Worker ficou menos agressivo.
- Atualização do app só recarrega depois do `controllerchange`, evitando reload imediato e sensação de piscar/apagar.
- Cache reduzido para app shell mínimo.

## Arquivos principais alterados

- `src/components/layout/MobileNav.tsx`
- `src/hooks/useModulosEmpresa.ts`
- `src/services/restaurante.ts`
- `src/services/modulos-empresa.ts`
- `src/app/atendimento/login-funcionario/page.tsx`
- `src/app/layout.tsx`
- `src/app/providers.tsx`
- `src/components/mobile/InstallAppPrompt.tsx`
- `src/lib/branding.ts`
- `src/config/ramos.ts`
- `src/app/globals.css`
- `supabase/migrations/037_vf_nexus_v8_isolamento_tenant_mobile.sql`

## Validações realizadas

- `npm run typecheck`: aprovado.
- `npm run lint`: aprovado, com 23 avisos antigos não bloqueantes.
- `npm test`: aprovado, 24 arquivos e 56 testes.
- `npm run build`: compilação passou; o ambiente encerrou por tempo durante a etapa final de TypeScript do Next, mas o TypeScript separado passou.

## Observação importante

Após subir esta versão, remova o PWA antigo do celular e instale novamente. O Service Worker anterior pode continuar preso no navegador e manter comportamento de atualização/piscar até ser substituído.
