# Relatório de baseline — VF Nexus V9.4

Data: 22/07/2026

## Base analisada

A implementação partiu do VF Nexus V9.3. O projeto continha 93 páginas, aproximadamente 65 services, dezenas de módulos operacionais, 48 migrations anteriores e cobertura Vitest predominantemente unitária/estrutural.

## Riscos identificados antes da V9.4

- Webhook Stripe podia processar eventos sem segredo configurado.
- Checkout podia aceitar valor monetário enviado pelo navegador.
- Permissões podiam continuar quando a RPC de autorização falhava.
- Admin Master selecionava a empresa apenas pelo navegador; o banco mantinha acesso operacional global.
- Listagens principais carregavam dados sem paginação real.
- Buscas disparavam consultas em excesso.
- Botões sem ação e elementos interativos aninhados causavam comportamento inconsistente.
- Contraste de botão primário permanecia fixado em texto branco.
- Branding podia alterar cores semânticas.
- Relatório de rentabilidade não acumulava corretamente o custo total.
- Recibos via WhatsApp eram principalmente texto e não documento real.
- Fila offline não possuía isolamento e idempotência suficientemente explícitos.
- Testes existentes não certificavam RLS com duas empresas, webhooks reais, PDFs visuais nem fluxo E2E completo.

## Baseline de execução

As dependências não estavam instaladas no ambiente de geração. Duas tentativas de `npm ci` excederam o limite operacional disponível e não concluíram. Consequentemente, o baseline não certificou o build Next, o typecheck completo nem a suíte Vitest neste ambiente.

Foram possíveis as seguintes verificações iniciais:

- leitura integral da estrutura;
- inspeção estática de APIs, services, migrations e componentes;
- comparação com a V9.3;
- validação de JSON do `package.json` e `package-lock.json`;
- verificação de ausência de URLs internas no lockfile.

## Métricas da V9.4 após alterações

- 275 arquivos TypeScript/TSX analisados pelo parser;
- 93 páginas;
- 65 services;
- 27 arquivos de teste;
- 49 migrations;
- 12 rotas de API;
- 288 comandos de policy encontrados estaticamente;
- 127 funções SQL encontradas estaticamente.
