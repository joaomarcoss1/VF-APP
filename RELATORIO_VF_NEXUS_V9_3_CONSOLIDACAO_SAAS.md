# VF Nexus V9.3 — Consolidação SaaS, Estabilidade e Produção

## 1. Objetivo

Esta entrega consolida a base V9.2.3 enviada pelo usuário em uma versão V9.3 orientada a um SaaS multiempresa de médio porte. A intervenção foi feita com compatibilidade progressiva: os módulos e rotas existentes foram preservados, enquanto foram criadas fundações reutilizáveis para tenant, design, erros, documentos, WhatsApp, paginação, PWA e diagnóstico.

## 2. Correções estruturais aplicadas

### Tenant e isolamento multiempresa

- Criada camada oficial em `src/services/tenant/`.
- Criados `TenantProvider` e `useTenant` para evitar resolução duplicada da empresa.
- Admin Master sem empresa operacional não recebe fallback de módulos comuns.
- O contexto operacional do Master não usa mais silenciosamente a empresa do perfil.
- Queries de módulos usam chave vinculada à empresa e não mantêm menu antigo durante troca de tenant.
- Adicionados helpers para consultas, inserts, updates, deletes e RPCs com `empresa_id` obrigatório.
- Adicionada migration `000_vf_nexus_base_tenant_helpers.sql`, executada antes de policies antigas que já dependiam de `vf_is_master()` e `vf_same_empresa()`.

### Permissões e carregamento

- `AppShell` foi refeito com estados explícitos de carregamento, erro, tenant ausente e acesso negado real.
- “Acesso negado” não é renderizado enquanto perfil, empresa, módulos ou permissões estão carregando.
- Em falha de contexto, o sistema apresenta tentativa novamente sem `location.reload()`.
- Admin Master é encaminhado para seleção de empresa antes de acessar telas operacionais.

### Design System e temas

- `globals.css` foi consolidado em uma única camada, eliminando a sucessão de hotfixes antigos.
- Criados tokens completos para claro/escuro, incluindo overlay, foco, placeholder, inputs, superfícies, estados e navegação.
- Branding ficou restrito a identidade e cores de acento, sem substituir fundo, texto ou contraste estrutural.
- Componentes de UI receberam estados de loading, disabled, erro, vazio, busca, paginação, confirmação e nomes longos.
- Regras de `min-width`, ellipsis, line-height e grids responsivos reduzem nomes tortos, cortados e sobrepostos.
- Cores neutras legadas foram convertidas progressivamente para tokens; estilos fixos permanecem apenas em impressão, câmera e superfícies operacionais intencionalmente escuras.

### Mobile e PWA

- Navegação mobile usa área segura e não deve cobrir o conteúdo.
- Removidas travas globais de viewport/rolagem e efeitos pesados desnecessários.
- Service Worker V9.3 cacheia somente shell e assets estáticos.
- Páginas autenticadas, APIs e respostas do Supabase não são cacheadas.
- Não existe recarregamento automático; atualização de versão é manual.
- Caches anteriores são eliminados durante ativação do novo Service Worker.

### Erros e feedback

- Criada hierarquia `AppError`, `DatabaseError`, `ValidationError`, `PermissionError`, `TenantError`, `IntegrationError`, `ReportError` e `WhatsAppError`.
- Criado Error Boundary global.
- Criados estados reutilizáveis de erro, loading, vazio e confirmação.

### Documentos, recibos e WhatsApp

- Criada pasta `src/services/documents/` para centralizar recibos/documentos.
- Recibo de reserva foi refeito com quebra dinâmica de linhas e páginas.
- Exportações preservam proporção da logo e usam superfície segura para impressão.
- Criada fila `whatsapp_messages` com status, tentativas, erro e identificação por empresa.
- Criada API server-side para provider de WhatsApp, sem token no frontend.
- Quando o provider não está configurado ou falha, o sistema utiliza fallback `wa.me` em vez de fingir envio.
- Tela de comprovantes foi integrada ao novo serviço de compartilhamento.

### Desempenho e buscas

- Adicionado helper de debounce.
- Criado helper genérico de paginação server-side por tenant.
- Produtos e clientes receberam APIs paginadas sem remover os métodos antigos, preservando compatibilidade.
- A estrutura permite migração progressiva das demais listagens sem reescrever todas as telas ao mesmo tempo.

### Build e diagnóstico

- Build padronizado em `next build --webpack`, compatível com Windows e Vercel.
- `ignoreBuildErrors` foi removido.
- `package-lock.json` está em JSON válido e sem URLs internas do ambiente de geração.
- Node fixado na linha 22.
- Criado `scripts/diagnostico-producao.mjs`.
- Criado `supabase/DIAGNOSTICO_V9_3.sql` para confirmar funções, RLS, policies e colunas no banco real.
- Criado script PowerShell seguro para validar e atualizar o GitHub.

## 3. Principais arquivos novos

- `src/core/errors/app-error.ts`
- `src/core/result/service-result.ts`
- `src/services/tenant/tenant-context.ts`
- `src/services/tenant/tenant-query.ts`
- `src/services/tenant/tenant-errors.ts`
- `src/contexts/TenantProvider.tsx`
- `src/hooks/useTenant.ts`
- `src/hooks/useDebouncedValue.ts`
- `src/components/feedback/AppErrorBoundary.tsx`
- `src/services/documents/*`
- `src/services/whatsapp/*`
- `src/app/api/whatsapp/send/route.ts`
- `supabase/migrations/000_vf_nexus_base_tenant_helpers.sql`
- `supabase/migrations/045_vf_nexus_v9_3_base_tenant_helpers.sql`
- `supabase/migrations/046_vf_nexus_v9_3_whatsapp_auditoria.sql`
- `supabase/migrations/047_vf_nexus_v9_3_indexes_tenant.sql`
- `supabase/DIAGNOSTICO_V9_3.sql`
- `scripts/diagnostico-producao.mjs`
- `COMANDOS_ATUALIZAR_GITHUB_V9_3.ps1`

## 4. Validações realizadas no ambiente de geração

Aprovadas:

- parsing de `package.json`;
- parsing de `package-lock.json`;
- ausência de URLs internas no lockfile;
- ausência de `ignoreBuildErrors`;
- lint estrutural V9.3;
- varredura de sintaxe TypeScript/TSX sem erros de parser;
- diagnóstico local de arquivos, migrations, PWA, tenant e serviços;
- ausência de `node_modules`, `.next`, `.bak`, logs e `tsconfig.tsbuildinfo` no pacote final.

Não foi possível concluir neste ambiente:

- `npm ci`, pois o download de dependências excedeu o limite disponível;
- consequentemente, `npm run typecheck`, `npm test` e `npm run build` completos com `node_modules` não foram certificados aqui;
- validação remota de Supabase, Vercel, provider de WhatsApp e dispositivos reais.

Esses pontos são obrigatórios antes de produção e estão automatizados no script PowerShell incluído.

## 5. Ordem de banco

Em banco novo:

1. `000_vf_nexus_base_tenant_helpers.sql`;
2. migrations `001` a `044` em ordem;
3. migrations `045`, `046` e `047`;
4. executar `supabase/DIAGNOSTICO_V9_3.sql`.

Em banco existente, execute a `000` para garantir os helpers e depois apenas as migrations ainda não aplicadas. Não repita migrations destrutivas sem verificar o histórico do projeto.

## 6. Configuração obrigatória

- `NEXT_PUBLIC_SUPABASE_URL`;
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`;
- demais segredos server-side usados pelos módulos ativos;
- para provider automático: `WHATSAPP_API_URL`, `WHATSAPP_API_TOKEN`, `WHATSAPP_PROVIDER` e `WHATSAPP_INSTANCE`.

## 7. Validação final no VS Code

```powershell
Copy-Item .env.local.example .env.local
npm ci --legacy-peer-deps --no-audit --no-fund --registry=https://registry.npmjs.org/
npm run diagnostico
npm run typecheck
npm run lint
npm test
npm run build
npm run dev
```

Também é possível executar:

```powershell
.\COMANDOS_ATUALIZAR_GITHUB_V9_3.ps1
```

## 8. Limites e validação manual

Nenhum pacote local pode garantir ausência absoluta de falhas em banco remoto, credenciais, RLS, webhooks, provider de WhatsApp ou dados reais sem executar os testes integrados no ambiente da empresa. A V9.3 corrige a fundação e os pontos estruturais prioritários, mas as telas legadas devem ser migradas progressivamente para os novos repositories, paginação e Design System conforme os testes de uso revelem gargalos específicos.
