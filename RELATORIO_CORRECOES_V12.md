# RELATÓRIO DE CORREÇÕES — VF Nexus V12

## Correções aplicadas

1. **Mobile/PWA**
   - Reforço global contra overflow horizontal.
   - Tabelas com comportamento mobile em cards.
   - Safe-area e altura dinâmica para app instalado.
   - Classes utilitárias para ações mobile e superfície visual.

2. **Paleta global**
   - Reforço de CSS variables e classes de tema.
   - Melhoria de fallback para cores, menus, cards, alertas e superfícies.

3. **Logos e assets**
   - Mantido `BrandLogo` com fallback e `onError`.
   - Middleware permanece liberando assets públicos.
   - Logos verificadas visualmente e por assinatura de arquivo.

4. **Relatórios Excel**
   - Substituída exportação `.xls` baseada em HTML por `.xlsx` real, gerado sem dependência externa.
   - Relatórios passam a usar abas estruturadas: resumo, dados e insights quando disponíveis.

5. **Operações transacionais**
   - Criada migration V12 com RPC `vf_registrar_venda_completa_v12`.
   - Frontend tenta usar RPC transacional e mantém fallback seguro para ambientes que ainda não aplicaram a migration.
   - Criada RPC `vf_registrar_nota_abastecimento_v12` para nota/itens.

6. **Fiscal readiness**
   - Migration com tabelas de configuração fiscal, documentos fiscais, itens e eventos.
   - Mantém separação entre controle interno e emissão oficial.

## Validação realizada neste ambiente
- Estrutura de arquivos verificada.
- JSONs principais verificados.
- Imagens/logos verificadas.
- Ausência de links internos no `package-lock.json` verificada.
- Não foi possível concluir `npm ci`, `typecheck`, `lint`, `test` e `build` neste ambiente porque a instalação de dependências via npm excedeu o tempo disponível.

## Validação obrigatória no VS Code
Execute:

```powershell
npm ci --legacy-peer-deps --no-audit --no-fund --registry=https://registry.npmjs.org/
npm run typecheck
npm run lint
npm run test
npm run build
npm run dev
```

## Observação fiscal
O VF Nexus V12 está estruturalmente pronto para integração fiscal, mas emissão real de NF-e/NFC-e/NFS-e ainda depende de provedor fiscal, certificado digital e credenciais.
