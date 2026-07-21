# Guia Offline e PWA — VF Nexus V14.1

1. Publique em HTTPS pela Vercel.
2. Abra o app no celular.
3. Android: Chrome → menu → Adicionar à tela inicial.
4. iPhone: Safari → Compartilhar → Adicionar à Tela de Início.
5. A V14.1 possui cache básico do app shell e página `/offline`.
6. No PDV, se o app estiver offline, a venda entra em fila local IndexedDB.
7. Quando a internet voltar, use a sincronização para enviar as vendas à RPC transacional.

Importante: offline avançado deve ser testado por cliente, pois estoque pode mudar em outro dispositivo enquanto uma venda ficou pendente.
