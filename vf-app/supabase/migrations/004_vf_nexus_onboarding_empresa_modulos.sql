-- ============================================================
-- VF Nexus — Onboarding por ramo, módulos por empresa e branding NexLabs
-- Execute após 001, 002 e 003.
-- Idempotente: pode ser reexecutado sem apagar dados.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS onboarding_concluido BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS onboarding_respostas JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.empresas ALTER COLUMN cor_primaria SET DEFAULT '#0A8DFF';
ALTER TABLE public.empresas ALTER COLUMN cor_secundaria SET DEFAULT '#F2B72E';
ALTER TABLE public.empresas ALTER COLUMN cor_fundo SET DEFAULT '#04070D';
ALTER TABLE public.empresas ALTER COLUMN cor_texto SET DEFAULT '#F8FAFC';

ALTER TABLE public.configuracoes ALTER COLUMN cor_primaria SET DEFAULT '#0A8DFF';
ALTER TABLE public.configuracoes ALTER COLUMN cor_secundaria SET DEFAULT '#F2B72E';
ALTER TABLE public.configuracoes ALTER COLUMN cor_fundo SET DEFAULT '#04070D';
ALTER TABLE public.configuracoes ALTER COLUMN cor_texto SET DEFAULT '#F8FAFC';

CREATE TABLE IF NOT EXISTS public.empresa_modulos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  modulo TEXT NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  ordem INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(empresa_id, modulo)
);

ALTER TABLE public.empresa_modulos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS empresa_modulos_select ON public.empresa_modulos;
DROP POLICY IF EXISTS empresa_modulos_insert ON public.empresa_modulos;
DROP POLICY IF EXISTS empresa_modulos_update ON public.empresa_modulos;
DROP POLICY IF EXISTS empresa_modulos_delete ON public.empresa_modulos;
CREATE POLICY empresa_modulos_select ON public.empresa_modulos FOR SELECT USING (empresa_id = public.get_empresa_id());
CREATE POLICY empresa_modulos_insert ON public.empresa_modulos FOR INSERT WITH CHECK (empresa_id = public.get_empresa_id());
CREATE POLICY empresa_modulos_update ON public.empresa_modulos FOR UPDATE USING (empresa_id = public.get_empresa_id()) WITH CHECK (empresa_id = public.get_empresa_id());
CREATE POLICY empresa_modulos_delete ON public.empresa_modulos FOR DELETE USING (empresa_id = public.get_empresa_id());

DROP TRIGGER IF EXISTS trg_empresa_modulos_updated_at ON public.empresa_modulos;
CREATE TRIGGER trg_empresa_modulos_updated_at BEFORE UPDATE ON public.empresa_modulos FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX IF NOT EXISTS idx_empresa_modulos_empresa ON public.empresa_modulos(empresa_id, ordem);

-- Garante que módulos padrão estejam compatíveis com o posicionamento atual do SaaS.
INSERT INTO public.setor_modulos (tipo_empresa, modulo, ativo, ordem) VALUES
  ('barbearia','insumos',FALSE,10), ('barbearia','fichas',FALSE,11), ('barbearia','eventos',FALSE,12), ('barbearia','cardapio',FALSE,9),
  ('fotografia','insumos',FALSE,10), ('fotografia','fichas',FALSE,11), ('fotografia','estoque',FALSE,4), ('fotografia','eventos',FALSE,12),
  ('prestador_servico','insumos',FALSE,10), ('prestador_servico','fichas',FALSE,11), ('prestador_servico','estoque',FALSE,4), ('prestador_servico','eventos',FALSE,12), ('prestador_servico','cardapio',FALSE,9),
  ('roupas','insumos',FALSE,10), ('roupas','fichas',FALSE,11),
  ('eletronicos','insumos',FALSE,10), ('eletronicos','fichas',FALSE,11),
  ('loja_variedades','insumos',FALSE,10), ('loja_variedades','fichas',FALSE,11),
  ('restaurante','insumos',TRUE,10), ('restaurante','fichas',TRUE,11), ('restaurante','cardapio',TRUE,9),
  ('bar','insumos',TRUE,10), ('bar','fichas',TRUE,11), ('bar','cardapio',TRUE,9),
  ('confeitaria','insumos',TRUE,10), ('confeitaria','fichas',TRUE,11), ('confeitaria','cardapio',TRUE,9)
ON CONFLICT (tipo_empresa, modulo)
DO UPDATE SET ativo = EXCLUDED.ativo, ordem = EXCLUDED.ordem, updated_at = NOW();

CREATE OR REPLACE FUNCTION public.seed_empresa_modulos_from_onboarding(
  p_empresa_id UUID,
  p_tipo TEXT,
  p_usa_agendamentos BOOLEAN DEFAULT TRUE,
  p_usa_estoque BOOLEAN DEFAULT TRUE,
  p_usa_insumos BOOLEAN DEFAULT FALSE,
  p_usa_catalogo_eventos BOOLEAN DEFAULT FALSE
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.empresa_modulos (empresa_id, modulo, ativo, ordem)
  SELECT
    p_empresa_id,
    sm.modulo,
    CASE
      WHEN sm.modulo = 'agendamentos' THEN COALESCE(p_usa_agendamentos, sm.ativo)
      WHEN sm.modulo = 'estoque' THEN COALESCE(p_usa_estoque, sm.ativo)
      WHEN sm.modulo IN ('insumos','fichas') THEN COALESCE(p_usa_insumos, sm.ativo)
      WHEN sm.modulo IN ('cardapio','eventos') THEN COALESCE(p_usa_catalogo_eventos, sm.ativo)
      ELSE sm.ativo
    END,
    sm.ordem
  FROM public.setor_modulos sm
  WHERE sm.tipo_empresa = p_tipo
  ON CONFLICT (empresa_id, modulo)
  DO UPDATE SET ativo = EXCLUDED.ativo, ordem = EXCLUDED.ordem, updated_at = NOW();
END;
$$;

GRANT EXECUTE ON FUNCTION public.seed_empresa_modulos_from_onboarding(UUID, TEXT, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN) TO authenticated;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  nova_empresa_id UUID;
  v_tipo TEXT;
  v_nome_empresa TEXT;
  v_usa_agendamentos BOOLEAN;
  v_usa_estoque BOOLEAN;
  v_usa_insumos BOOLEAN;
  v_usa_catalogo_eventos BOOLEAN;
BEGIN
  v_tipo := COALESCE(NULLIF(NEW.raw_user_meta_data->>'tipo_empresa',''), 'prestador_servico');
  v_nome_empresa := COALESCE(NULLIF(NEW.raw_user_meta_data->>'nome_empresa',''), 'Minha empresa');
  v_usa_agendamentos := COALESCE((NEW.raw_user_meta_data->>'usa_agendamentos')::BOOLEAN, TRUE);
  v_usa_estoque := COALESCE((NEW.raw_user_meta_data->>'usa_estoque')::BOOLEAN, TRUE);
  v_usa_insumos := COALESCE((NEW.raw_user_meta_data->>'usa_insumos')::BOOLEAN, FALSE);
  v_usa_catalogo_eventos := COALESCE((NEW.raw_user_meta_data->>'usa_catalogo_eventos')::BOOLEAN, FALSE);

  INSERT INTO public.empresas (
    nome, tipo, email, logo_url, cor_primaria, cor_secundaria, cor_fundo, cor_texto, onboarding_concluido, onboarding_respostas
  ) VALUES (
    v_nome_empresa,
    v_tipo,
    NEW.email,
    '/nexlabs-logo.png',
    '#0A8DFF', '#F2B72E', '#04070D', '#F8FAFC',
    TRUE,
    jsonb_build_object(
      'tipo_empresa', v_tipo,
      'usa_agendamentos', v_usa_agendamentos,
      'usa_estoque', v_usa_estoque,
      'usa_insumos', v_usa_insumos,
      'usa_catalogo_eventos', v_usa_catalogo_eventos,
      'origem', COALESCE(NEW.raw_user_meta_data->>'onboarding_origem', 'cadastro')
    )
  )
  RETURNING id INTO nova_empresa_id;

  INSERT INTO public.perfis (id, empresa_id, nome)
  VALUES (
    NEW.id,
    nova_empresa_id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  );

  INSERT INTO public.configuracoes (empresa_id, cor_primaria, cor_secundaria, cor_fundo, cor_texto)
  VALUES (nova_empresa_id, '#0A8DFF', '#F2B72E', '#04070D', '#F8FAFC')
  ON CONFLICT (empresa_id) DO NOTHING;

  INSERT INTO public.assinaturas (empresa_id, tipo, status, valor, data_inicio, proxima_cobranca, observacoes)
  VALUES (nova_empresa_id, 'mensal', 'ativa', 0, CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days', 'Assinatura inicial criada automaticamente.');

  INSERT INTO public.cardapios (empresa_id, nome, descricao)
  VALUES (nova_empresa_id, 'Catálogo principal', 'Catálogo oficial gerado pelo VF Nexus')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.categorias_insumos (empresa_id, nome, icone, cor) VALUES
    (nova_empresa_id, 'Carnes', 'beef', '#D45050'),
    (nova_empresa_id, 'Vegetais', 'leaf', '#3DAA6B'),
    (nova_empresa_id, 'Laticínios', 'milk', '#F2B72E'),
    (nova_empresa_id, 'Bebidas', 'coffee', '#0A8DFF'),
    (nova_empresa_id, 'Destilados', 'wine', '#7C3AED'),
    (nova_empresa_id, 'Embalagens', 'package', '#64748B'),
    (nova_empresa_id, 'Temperos', 'flask', '#F59E0B'),
    (nova_empresa_id, 'Outros', 'box', '#0A8DFF');

  PERFORM public.seed_empresa_modulos_from_onboarding(nova_empresa_id, v_tipo, v_usa_agendamentos, v_usa_estoque, v_usa_insumos, v_usa_catalogo_eventos);

  RETURN NEW;
END;
$$;

-- Para empresas antigas que ainda não têm configuração individual, cria configuração individual baseada no setor.
INSERT INTO public.empresa_modulos (empresa_id, modulo, ativo, ordem)
SELECT e.id, sm.modulo, sm.ativo, sm.ordem
FROM public.empresas e
JOIN public.setor_modulos sm ON sm.tipo_empresa = e.tipo
ON CONFLICT (empresa_id, modulo) DO NOTHING;
