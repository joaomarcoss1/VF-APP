# Relatório de build — VF Nexus V9.4

## Configuração

- Node exigido: 22 LTS.
- npm exigido: 10 ou 11.
- Build: `next build --webpack`.
- TypeScript estrito habilitado.
- `ignoreBuildErrors` não está configurado.
- Lockfile versão 3, sem URLs internas.

## Resultado neste ambiente

A instalação das dependências por `npm ci` excedeu o tempo disponível em duas tentativas e não concluiu. Por essa razão, o build não foi certificado neste ambiente de geração.

## Pipeline obrigatório de homologação

```powershell
npm ci --legacy-peer-deps --no-audit --no-fund --registry=https://registry.npmjs.org/
npm run diagnostico:v9.4
npm run security:check
npm run typecheck
npm run lint
npm test
npm run build
```

O deploy só deve continuar após todos os comandos retornarem código zero.
