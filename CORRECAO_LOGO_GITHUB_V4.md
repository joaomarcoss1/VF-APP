# Correção V4 — Logo NexLabs e GitHub

Esta versão corrige o carregamento da logo NexLabs de forma mais robusta:

- `public/nexlabs-logo.png`: marca reduzida transparente, ideal para menu, favicon e ícones pequenos.
- `public/nexlabs-logo-full.png`: logo completa transparente, ideal para tela inicial, login e onboarding.
- `src/components/BrandLogo.tsx`: componente com fallback automático. Se a logo da empresa ou URL salva falhar, o app volta para a logo NexLabs padrão.
- Substituição de usos críticos de `next/image` por `BrandLogo`, evitando erro com URLs externas ou inválidas.
- Scripts de apoio para subir o projeto ao GitHub.

Para subir ao GitHub, execute os comandos descritos em `SUBIR_PARA_GITHUB.ps1` ou `SUBIR_PARA_GITHUB.cmd` na pasta raiz extraída.
