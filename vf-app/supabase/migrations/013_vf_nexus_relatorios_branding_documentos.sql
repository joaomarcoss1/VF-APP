-- ============================================================
-- VF Nexus — 013 Relatórios, documentos, diagnóstico e branding
-- ============================================================

ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS razao_social TEXT;
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS cpf_cnpj TEXT;
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS whatsapp TEXT;
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS slogan TEXT;
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS tema_preferido TEXT DEFAULT 'nexlabs_light';
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS onboarding_completo BOOLEAN DEFAULT false;
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS tamanho_operacao TEXT;
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS necessidades JSONB DEFAULT '[]'::jsonb;

CREATE TABLE IF NOT EXISTS public.documentos_gerados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  titulo TEXT NOT NULL,
  entidade TEXT,
  entidade_id UUID,
  numero TEXT,
  url_pdf TEXT,
  dados JSONB NOT NULL DEFAULT '{}'::jsonb,
  branding JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.relatorios_salvos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  titulo TEXT NOT NULL,
  periodo_inicio DATE,
  periodo_fim DATE,
  filtros JSONB NOT NULL DEFAULT '{}'::jsonb,
  dados JSONB NOT NULL DEFAULT '{}'::jsonb,
  url_pdf TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.diagnosticos_negocio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  periodo_inicio DATE,
  periodo_fim DATE,
  score NUMERIC(5,2) DEFAULT 0,
  insights JSONB NOT NULL DEFAULT '[]'::jsonb,
  metricas JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.checklist_onboarding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  chave TEXT NOT NULL,
  titulo TEXT NOT NULL,
  concluido BOOLEAN NOT NULL DEFAULT false,
  concluido_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, chave)
);

ALTER TABLE public.documentos_gerados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.relatorios_salvos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diagnosticos_negocio ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_onboarding ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['documentos_gerados','relatorios_salvos','diagnosticos_negocio','checklist_onboarding'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I_select_empresa ON public.%I', t, t);
    EXECUTE format('CREATE POLICY %I_select_empresa ON public.%I FOR SELECT USING (empresa_id = public.get_empresa_id())', t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I_write_empresa ON public.%I', t, t);
    EXECUTE format('CREATE POLICY %I_write_empresa ON public.%I FOR ALL USING (empresa_id = public.get_empresa_id()) WITH CHECK (empresa_id = public.get_empresa_id())', t, t);
  END LOOP;
END $$;

-- Garante módulo Diagnóstico em todos os ramos.
INSERT INTO public.setor_modulos (tipo_empresa, modulo, ativo, ordem)
SELECT e.tipo, 'diagnostico', true, 21
FROM (SELECT DISTINCT tipo FROM public.empresas UNION SELECT 'outro') e
ON CONFLICT (tipo_empresa, modulo) DO UPDATE SET ativo = true;

INSERT INTO public.checklist_onboarding (empresa_id, chave, titulo)
SELECT e.id, c.chave, c.titulo
FROM public.empresas e
CROSS JOIN (VALUES
('produto','Cadastrar primeiro produto ou serviço'),
('cliente','Cadastrar primeiro cliente'),
('venda','Registrar primeira venda ou agendamento'),
('logo','Configurar logo e identidade visual'),
('relatorio','Visualizar primeiro relatório')
) AS c(chave,titulo)
ON CONFLICT DO NOTHING;
