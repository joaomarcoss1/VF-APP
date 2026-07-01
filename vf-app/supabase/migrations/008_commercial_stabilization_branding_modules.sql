-- ============================================================
-- VF Nexus — estabilização comercial final
-- Branding consistente, storage seguro, módulos e campos de produto por ramo
-- ============================================================

-- Defaults claros e profissionais para novas empresas.
ALTER TABLE public.empresas ALTER COLUMN cor_primaria SET DEFAULT '#0A8DFF';
ALTER TABLE public.empresas ALTER COLUMN cor_secundaria SET DEFAULT '#F2B72E';
ALTER TABLE public.empresas ALTER COLUMN cor_fundo SET DEFAULT '#F5F8FC';
ALTER TABLE public.empresas ALTER COLUMN cor_texto SET DEFAULT '#102033';

UPDATE public.empresas
SET cor_fundo = '#F5F8FC'
WHERE cor_fundo IS NULL OR cor_fundo = '' OR lower(cor_fundo) IN ('#04070d', '#000000', '#0a0a0a');

UPDATE public.empresas
SET cor_texto = '#102033'
WHERE cor_texto IS NULL OR cor_texto = '' OR lower(cor_texto) IN ('#f8fafc', '#ffffff');

-- Campos complementares para varejo e serviços. São opcionais e não quebram os ramos de alimentação.
ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS sku TEXT;
ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS codigo_barras TEXT;
ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS marca TEXT;
ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS modelo TEXT;
ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS tamanho TEXT;
ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS cor TEXT;
ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS duracao_min INTEGER;
ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS tipo_cadastro TEXT DEFAULT 'produto' CHECK (tipo_cadastro IN ('alimentacao','varejo','servico','hibrido','produto'));

CREATE INDEX IF NOT EXISTS idx_produtos_empresa_sku ON public.produtos(empresa_id, sku);
CREATE INDEX IF NOT EXISTS idx_produtos_empresa_codigo_barras ON public.produtos(empresa_id, codigo_barras);

-- Garante que os módulos comerciais novos existam para todos os setores.
INSERT INTO public.setor_modulos (tipo_empresa, modulo, ativo, ordem)
SELECT e.tipo, m.modulo, m.ativo, m.ordem
FROM (SELECT DISTINCT tipo FROM public.empresas UNION SELECT 'outro') e
CROSS JOIN (VALUES
  ('clientes', true, 5),
  ('financeiro', true, 11),
  ('fechamento', true, 12),
  ('despesas', true, 13),
  ('comprovantes', true, 14),
  ('equipe', true, 15),
  ('auditoria', false, 16),
  ('notas-fiscais', true, 17)
) AS m(modulo, ativo, ordem)
ON CONFLICT (tipo_empresa, modulo) DO NOTHING;

-- Segurança mais restrita para logos: cada empresa grava apenas na sua própria pasta.
INSERT INTO storage.buckets (id, name, public)
VALUES ('logos', 'logos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS logos_public_read ON storage.objects;
CREATE POLICY logos_public_read ON storage.objects
FOR SELECT USING (bucket_id = 'logos');

DROP POLICY IF EXISTS logos_insert_by_owner ON storage.objects;
CREATE POLICY logos_insert_by_owner ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'logos'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = public.get_empresa_id()::text
);

DROP POLICY IF EXISTS logos_update_by_owner ON storage.objects;
CREATE POLICY logos_update_by_owner ON storage.objects
FOR UPDATE USING (
  bucket_id = 'logos'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = public.get_empresa_id()::text
) WITH CHECK (
  bucket_id = 'logos'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = public.get_empresa_id()::text
);

DROP POLICY IF EXISTS logos_delete_by_owner ON storage.objects;
CREATE POLICY logos_delete_by_owner ON storage.objects
FOR DELETE USING (
  bucket_id = 'logos'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = public.get_empresa_id()::text
);
