# Relatório VF Nexus V14.2

## Entregas principais
- PDV reconstruído visualmente com componentes profissionais.
- Correção de encoding e remoção de emojis corrompidos no PDV.
- Scanner por câmera/manual/scanner físico.
- Etiquetas comuns, promocionais, institucionais e personalizadas por cores.
- Impressão A4/térmica e exportação ZPL.
- Importação avançada de estoque por XLSX/CSV.
- Importação de etiquetas por arquivo.
- Migration 026 com tabelas, campos, índices e RLS.

## Arquivos principais
- `src/app/(app)/pdv/page.tsx`
- `src/components/pdv/PdvProfessional.tsx`
- `src/app/(app)/scanner/page.tsx`
- `src/app/(app)/etiquetas/page.tsx`
- `src/app/(app)/etiquetas/importar/page.tsx`
- `src/app/(app)/importacao/estoque/page.tsx`
- `src/services/etiquetas.ts`
- `src/services/codigos-barras.ts`
- `src/services/importacao-estoque.ts`
- `supabase/migrations/026_vf_nexus_v14_2_pdv_scanner_etiquetas_importacao.sql`

## Observação
A leitura de PDF funciona somente quando o navegador consegue extrair texto/tabela. Para PDFs em imagem, use XLSX/CSV.
