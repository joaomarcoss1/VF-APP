# Guia de Login, Perfis e Empresas

## Perfis

- `super_admin`: Admin Master NexLabs.
- `empresa_admin`: Admin da Empresa.
- `gerente`: gestão operacional autorizada.
- `funcionario`: usuário operacional.

## Login

A rota `/login` é a entrada profissional do sistema. Ela solicita e-mail, senha e opcionalmente código/matrícula da empresa.

Após login:

- Super Admin → `/master`
- Admin da Empresa/Gerente → `/dashboard`
- Funcionário → `/pdv`

O código da empresa é usado como barreira adicional para evitar acesso equivocado em ambientes de teste.
