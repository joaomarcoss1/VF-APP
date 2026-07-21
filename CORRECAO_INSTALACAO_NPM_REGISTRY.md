# Correção de instalação do VF Nexus

Esta versão remove o `package-lock.json` que havia sido gerado em ambiente interno e podia apontar para:

`packages.applied-caas-gateway1.internal.api.openai.org`

Esse endereço não é acessível no computador do usuário, por isso o `npm install` falhava com `ETIMEDOUT`.

## Como rodar

Dentro da pasta `vf-app`, execute:

```powershell
.\INSTALAR_E_RODAR_VF_NEXUS.ps1
```

Ou clique duas vezes em:

```text
INSTALAR_E_RODAR_VF_NEXUS.cmd
```

O script:

- força registry público `https://registry.npmjs.org/`;
- remove `node_modules`, `.next` e `package-lock.json` antigo;
- cria `.env.local` modelo se não existir;
- instala dependências;
- roda `typecheck`, `lint`, `build` e `dev`.
