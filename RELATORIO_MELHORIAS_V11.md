# VF Nexus V11 — melhorias aplicadas

Versão focada em prontidão comercial para primeiros clientes, com ajustes de mobile/PWA, paleta global, persistência, relatórios, cardápio/catálogo, fiscal readiness, logos e execução local/Vercel.

## Principais entregas

1. **Mobile/PWA**
   - CSS global com `100dvh`, safe-area, prevenção de overflow horizontal e navegação inferior mais segura.
   - Sidebar desktop permanece oculta no mobile.
   - Cards, botões, inputs e modais com área de toque e espaçamento melhorados.
   - Classes utilitárias para listas mobile, tabelas com rolagem e containers responsivos.

2. **Paleta global e persistente**
   - Tema expandido com cores para menu, cards, bordas, superfícies, texto auxiliar, sucesso, alerta, erro, informação e modo de tema.
   - `branding.ts` centraliza normalização, cache local, aplicação em CSS variables e atualização em tempo real.
   - `IdentidadeService` lê/salva os novos campos.
   - Migration `022_vf_nexus_v11_commercial_hardening.sql` adiciona os campos no banco.

3. **Logos e identidade visual**
   - Logos validadas como PNG e favicon criado.
   - `BrandLogo` reforçado com alinhamento, `object-fit: contain`, fallback e referrer policy.
   - Metadata atualizada para favicon, PWA e ícones.
   - Middleware já liberava assets públicos e foi mantido compatível.

4. **Relatórios**
   - Exportações tipo Excel agora geram arquivo `.xls` com HTML estruturado e abas lógicas quando os dados possuem campo `Aba`.
   - Relatórios financeiros mantêm PDF executivo com indicadores, diagnóstico e próximos passos.
   - Ficha técnica aceita branding para aplicar identidade visual nos PDFs.

5. **Fiscal readiness**
   - Novo `FiscalService`.
   - Novas tabelas previstas: `integracoes_fiscais_config` e `documentos_fiscais`.
   - Configuração fiscal adicionada em Configurações.
   - Tela de Notas informa claramente a diferença entre controle interno de abastecimento e emissão fiscal oficial.

6. **Banco e persistência**
   - Migration V11 adiciona campos de tema e tabelas fiscais.
   - Serviços continuam usando `empresa_id` e Supabase.
   - Configurações de identidade/paleta são salvas no banco e cache local.

## Arquivos importantes alterados

- `src/lib/branding.ts`
- `src/app/globals.css`
- `src/components/BrandLogo.tsx`
- `src/components/ui/index.tsx`
- `src/components/layout/AppShell.tsx`
- `src/components/layout/Header.tsx`
- `src/components/layout/Sidebar.tsx`
- `src/app/(app)/configuracoes/page.tsx`
- `src/app/(app)/notas/page.tsx`
- `src/lib/exports.ts`
- `src/services/fiscal.ts`
- `src/services/onboarding.ts`
- `src/types/index.ts`
- `supabase/migrations/022_vf_nexus_v11_commercial_hardening.sql`
- `public/favicon.ico`

## Observações importantes

- A emissão fiscal oficial ainda depende de provedor fiscal real, certificado digital e homologação. A V11 prepara a estrutura, não substitui integração fiscal legal.
- Para persistência completa da paleta no banco, execute a migration 022 no Supabase.
- As exportações Excel usam formato `.xls` compatível com Excel/LibreOffice sem adicionar dependência nova. Isso evita quebrar o deploy com pacotes extras.

## Validação local realizada

- JSONs principais validados: `package.json`, `vercel.json`, `manifest.json`.
- Logos abertas e medidas com PIL.
- Verificado que `package-lock.json` não contém registry interno `applied-caas`, `openai` ou `artifactory`.
- Build completo não foi executado neste ambiente porque não há `node_modules` e o ambiente não fornece instalação npm confiável. Execute no VS Code usando os comandos do README.
