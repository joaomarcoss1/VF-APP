-- ============================================================
-- VF Nexus — 012 RBAC real, planos, limites e auditoria
-- ============================================================

CREATE TABLE IF NOT EXISTS public.planos_saas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  preco_mensal NUMERIC(12,2) NOT NULL DEFAULT 0,
  limite_produtos INTEGER,
  limite_usuarios INTEGER,
  limite_vendas_mes INTEGER,
  limite_agendamentos_mes INTEGER,
  limite_ia_dia INTEGER,
  modulos JSONB NOT NULL DEFAULT '[]'::jsonb,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.assinaturas_saas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  plano_id UUID REFERENCES public.planos_saas(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'teste' CHECK (status IN ('teste','ativa','vencida','bloqueada','cancelada')),
  data_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
  data_fim DATE,
  data_vencimento DATE,
  valor NUMERIC(12,2) DEFAULT 0,
  motivo_bloqueio TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (empresa_id)
);

CREATE TABLE IF NOT EXISTS public.perfis_permissao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  descricao TEXT,
  permissoes JSONB NOT NULL DEFAULT '{}'::jsonb,
  padrao BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, nome)
);

ALTER TABLE public.equipe_usuarios ADD COLUMN IF NOT EXISTS perfil_permissao_id UUID REFERENCES public.perfis_permissao(id) ON DELETE SET NULL;
ALTER TABLE public.equipe_usuarios ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.equipe_usuarios ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ativo' CHECK (status IN ('ativo','convidado','bloqueado','removido'));

CREATE TABLE IF NOT EXISTS public.solicitacoes_modulo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  modulo TEXT NOT NULL,
  mensagem TEXT,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','aprovada','recusada','cancelada')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.logs_auditoria ADD COLUMN IF NOT EXISTS ip TEXT;
ALTER TABLE public.logs_auditoria ADD COLUMN IF NOT EXISTS user_agent TEXT;
ALTER TABLE public.logs_auditoria ADD COLUMN IF NOT EXISTS entidade TEXT;
ALTER TABLE public.logs_auditoria ADD COLUMN IF NOT EXISTS entidade_id UUID;

ALTER TABLE public.assinaturas_saas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perfis_permissao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solicitacoes_modulo ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS assinaturas_saas_select_empresa ON public.assinaturas_saas;
CREATE POLICY assinaturas_saas_select_empresa ON public.assinaturas_saas FOR SELECT USING (empresa_id = public.get_empresa_id() OR public.is_master_admin());
DROP POLICY IF EXISTS assinaturas_saas_master_write ON public.assinaturas_saas;
CREATE POLICY assinaturas_saas_master_write ON public.assinaturas_saas FOR ALL USING (public.is_master_admin()) WITH CHECK (public.is_master_admin());

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['perfis_permissao','solicitacoes_modulo'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I_select_empresa ON public.%I', t, t);
    EXECUTE format('CREATE POLICY %I_select_empresa ON public.%I FOR SELECT USING (empresa_id = public.get_empresa_id())', t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I_write_empresa ON public.%I', t, t);
    EXECUTE format('CREATE POLICY %I_write_empresa ON public.%I FOR ALL USING (empresa_id = public.get_empresa_id()) WITH CHECK (empresa_id = public.get_empresa_id())', t, t);
  END LOOP;
END $$;

INSERT INTO public.planos_saas (codigo, nome, preco_mensal, limite_produtos, limite_usuarios, limite_vendas_mes, limite_agendamentos_mes, limite_ia_dia, modulos)
VALUES
('free','Teste/Free',0,20,1,50,30,5,'["dashboard","produtos","vendas","clientes","comprovantes"]'),
('essencial','Essencial',49.90,200,3,1000,300,15,'["dashboard","produtos","vendas","clientes","financeiro","comprovantes"]'),
('profissional','Profissional',89.90,1000,8,5000,1500,50,'["dashboard","produtos","vendas","clientes","financeiro","estoque","notas-fiscais","agendamentos","relatorios","equipe"]'),
('premium','Premium',149.90,NULL,20,NULL,NULL,200,'["dashboard","produtos","vendas","clientes","financeiro","estoque","notas-fiscais","agendamentos","relatorios","equipe","auditoria","diagnostico","ia"]'),
('enterprise','Enterprise',0,NULL,NULL,NULL,NULL,NULL,'["*"]')
ON CONFLICT (codigo) DO UPDATE SET nome = EXCLUDED.nome, preco_mensal = EXCLUDED.preco_mensal, modulos = EXCLUDED.modulos;
