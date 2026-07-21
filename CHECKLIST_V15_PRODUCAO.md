# Checklist V15 Produção

- [ ] Aplicar migrations 001 a 029 no Supabase.
- [ ] Configurar variáveis de ambiente da Vercel.
- [ ] Rodar `npm ci --legacy-peer-deps --no-audit --no-fund --registry=https://registry.npmjs.org/`.
- [ ] Rodar `npm run typecheck`.
- [ ] Rodar `npm run lint`.
- [ ] Rodar `npm run test`.
- [ ] Rodar `npm run build`.
- [ ] Criar Empresa A e Empresa B.
- [ ] Criar Admin A e Admin B.
- [ ] Cadastrar produtos diferentes nas duas empresas.
- [ ] Confirmar que Empresa A não vê nada da Empresa B.
- [ ] Confirmar que PDV, estoque, scanner, etiquetas, importação, entregas, financeiro e relatórios estão isolados.
- [ ] Testar portal do entregador.
- [ ] Testar finalização offline de entrega.
- [ ] Testar venda offline por empresa.
- [ ] Exportar relatórios PDF/XLSX.
