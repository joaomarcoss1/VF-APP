# Checklist VF Nexus V14.1

| Item | Status | Observação |
|---|---:|---|
| Build local | Pendente | Rodar `npm run build` no VS Code/Vercel |
| Deploy Vercel | Pendente | Root Directory vazio |
| Migration V14.1 aplicada | Pendente | Aplicar SQL 025 no Supabase |
| Catálogo público anônimo | Pendente | Testar em guia anônima |
| Publicar catálogo com RLS | Pendente | Verificar insert/update em `catalogos_publicos` |
| Venda transacional | Pendente | Testar RPC `vf_registrar_venda_completa_v14_1` |
| Fallback parcial bloqueado | OK | Só libera com env explícita de desenvolvimento |
| PWA instalável Android | Pendente | Testar via Chrome |
| PWA instalável iPhone | Pendente | Testar via Safari |
| Offline básico | Implementado | Cache app shell + `/offline` |
| Venda offline pendente | Implementado | IndexedDB `vendas_pendentes` |
| Sincronização offline | Implementado | `OfflineSyncService` |
| Importação XLSX/CSV | Implementado | Testar modelos reais |
| Etiquetas A4 | Implementado | Testar impressão real |
| Etiquetas térmicas/ZPL | Implementado | Exporta ZPL básico |
| Scanner por câmera | Implementado | Depende de BarcodeDetector |
| Scanner manual/físico | Implementado | Campo com Enter |
| Produto por código no estoque | Implementado | `/estoque/produto/[id]` |
| Relatórios PDF/XLSX | Pendente | Teste visual com dados reais |
