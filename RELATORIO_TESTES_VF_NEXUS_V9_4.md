# Relatório de testes — VF Nexus V9.4

## Verificações executadas neste ambiente

| Verificação | Resultado |
|---|---|
| Diagnóstico estrutural V9.4 | Aprovado |
| Security check em 349 arquivos | Aprovado |
| Lint estrutural V9.4 | Aprovado |
| Parser TypeScript/TSX em 275 arquivos | 0 erros de sintaxe |
| Validação do package-lock | Aprovado, sem registry interno |
| Verificação de `ignoreBuildErrors` | Ausente |
| Service Worker sem reload automático | Aprovado |

## Testes adicionados

- Rentabilidade por produto com custo, lucro, margem e CMV conhecidos.
- Consolidação estrutural V9.4: webhook protegido, migration, lockfile, PWA e tema.

## Não certificado neste ambiente

`npm ci` não concluiu dentro do tempo disponível, portanto não foram executados aqui:

- typecheck completo com todas as dependências;
- suíte Vitest completa;
- build Next.js;
- build Windows;
- build Vercel;
- testes E2E Playwright;
- testes reais contra Supabase;
- envio real Stripe/WhatsApp;
- comparação visual de PDFs.

Essas validações devem ser executadas com `VALIDAR_V9_4.ps1` no computador de homologação.
