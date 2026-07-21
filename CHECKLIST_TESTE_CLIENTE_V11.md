# Checklist de teste com primeiros clientes — VF Nexus V11

## Instalação local
- [ ] `node -v` mostra Node 24.x.
- [ ] `npm ci --legacy-peer-deps --no-audit --no-fund --registry=https://registry.npmjs.org/` finaliza sem erro.
- [ ] `.env.local` possui Supabase URL e ANON KEY.
- [ ] `npm run typecheck` passa.
- [ ] `npm run lint` passa.
- [ ] `npm run test` passa.
- [ ] `npm run build` passa.
- [ ] `npm run dev` abre no VS Code/local.

## Supabase
- [ ] Todas as migrations 001 a 022 foram aplicadas.
- [ ] Usuário tem perfil com `empresa_id`.
- [ ] RLS não permite ver dados de outra empresa.
- [ ] Tabela `integracoes_fiscais_config` existe.
- [ ] Tabela `documentos_fiscais` existe.

## Login e persistência
- [ ] Login funciona.
- [ ] Logout funciona.
- [ ] Fechar e abrir mantém sessão quando aplicável.
- [ ] Configurações salvas continuam após recarregar.
- [ ] Paleta continua após fechar e abrir PWA.
- [ ] Logo continua após recarregar.

## Mobile/PWA
- [ ] Tela não fica espremida.
- [ ] Sidebar desktop não aparece no celular.
- [ ] Bottom nav funciona.
- [ ] Modais abrem como bottom sheet no celular.
- [ ] Não existe overflow horizontal inesperado.
- [ ] Instalar na tela inicial funciona.
- [ ] Ícone PWA aparece corretamente.

## Identidade visual
- [ ] Logo NexLabs aparece na abertura.
- [ ] Logo aparece no header/menu.
- [ ] Fallback funciona se `logo_url` estiver vazio.
- [ ] Cores de menu, cards, fundo e texto mudam.
- [ ] Cores de sucesso, alerta, erro e informação mudam.

## Operação principal
- [ ] Criar produto/serviço.
- [ ] Criar cliente.
- [ ] Registrar venda.
- [ ] Venda aparece no histórico.
- [ ] Financeiro recebe/consulta lançamentos.
- [ ] Estoque mostra alertas.
- [ ] Cardápio cria/atualiza itens.
- [ ] PDF do cardápio é gerado.
- [ ] Relatório financeiro PDF é gerado.
- [ ] Exportação Excel `.xls` abre no Excel/LibreOffice.

## Fiscal
- [ ] Configuração fiscal salva.
- [ ] Diagnóstico fiscal aparece em Notas.
- [ ] Controle interno de nota/abastecimento funciona.
- [ ] Sistema não promete emissão oficial sem provedor/certificado.
