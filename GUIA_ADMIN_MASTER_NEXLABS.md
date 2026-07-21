# Guia Admin Master NexLabs

Use `/master` para listar empresas e `/master/empresas/nova` para cadastrar uma empresa por matrícula/código.

O Admin Master cria a empresa e vincula o primeiro Admin da Empresa. A criação do login real deve ser feita no Supabase Auth ou por convite, e depois o usuário deve ser vinculado na tabela `perfis`.

Toda ação master é auditada em `logs_auditoria`.
