# VF Nexus V13 — Mobile App e Relatórios/Catálogos Premium

## Objetivo
Esta versão foi criada para transformar a experiência mobile em uma experiência de aplicativo instalado, não apenas uma adaptação comprimida do desktop. Também corrige a identidade visual dos PDFs de relatórios, cardápios, catálogos, comprovantes, fichas técnicas e eventos para respeitar logo e paleta definida pelo cliente.

## Melhorias mobile/PWA
- AppShell preparado para ocupar 100dvh no celular, com rolagem interna do conteúdo.
- Header mobile redesenhado como barra de aplicativo, com logo maior, título visível e menu de usuário touch-friendly.
- Bottom navigation com altura, área de toque, safe-area e aparência de app nativo.
- Regras globais para impedir overflow horizontal, zoom forçado e telas desktop espremidas.
- Formulários com inputs de 16px no mobile para evitar zoom automático do navegador.
- Grids administrativos convertidos para coluna única ou 2 colunas compactas no mobile.
- Modais com comportamento de bottom sheet no celular.
- Tabelas mantidas em scroll horizontal controlado com indicação visual de arraste, sem exigir zoom.

## Melhorias em relatórios, catálogos e cardápios
- Removidos fundos pretos fixos dos PDFs principais.
- PDFs agora usam `resolveBranding` e respeitam cor primária, secundária, fundo, card, borda, texto, sucesso, alerta e erro.
- Cardápio/Catálogo em PDF redesenhado com layout claro, elegante, com cards, seções por categoria, preço em destaque, promoções e rodapé profissional.
- Ficha técnica PDF redesenhada com estrutura corporativa clara.
- Orçamento de evento PDF redesenhado com identidade visual da empresa e sem fundo preto dominante.
- Comprovante PDF redesenhado para usar paleta e logo do cliente.
- Página de Cardápio recebeu prévia comercial para deixar claro como o material final será apresentado.

## Logos
Validação dos assets:
- `public/nexlabs-logo.png`: PNG 512x512, boa nitidez e alinhamento.
- `public/nexlabs-logo-full.png`: PNG 1024x1024, mantida para uso institucional quando adequado.
- `public/icon-192.png`: PNG 192x192.
- `public/icon-512.png`: PNG 512x512.
- `public/favicon.ico`: válido.

A tela inicial e tela de login agora priorizam a marca/símbolo da NexLabs, que é mais legível em fundos claros e tamanhos reduzidos.

## Persistência e dados
Esta versão não altera tabelas de dados. As melhorias de persistência continuam dependendo das migrations V11/V12 já incluídas no projeto. A aplicação da paleta nos relatórios usa os dados carregados de `IdentidadeService.obter`, ou seja, se o Supabase estiver com as migrations aplicadas, a logo e cores escolhidas serão refletidas nos PDFs.

## Observação técnica
Não foi possível executar `npm ci` completo neste ambiente porque depende de download externo do npm. A estrutura, JSONs, sintaxe TypeScript dos arquivos alterados e assets foram validados localmente. A validação final deve ser feita no VS Code com os comandos do README.
