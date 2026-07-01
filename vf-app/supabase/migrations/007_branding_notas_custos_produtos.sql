-- ============================================================
-- VF Nexus — Branding aplicado, custos avançados e base NF/estoque
-- Migration idempotente para produção
-- ============================================================

-- Custos detalhados por produto/serviço
ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS custo_base NUMERIC(12,2) DEFAULT 0;
ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS custo_frete NUMERIC(12,2) DEFAULT 0;
ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS custo_taxas NUMERIC(12,2) DEFAULT 0;
ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS custo_embalagem NUMERIC(12,2) DEFAULT 0;
ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS custo_operacional NUMERIC(12,2) DEFAULT 0;
ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS custo_outros NUMERIC(12,2) DEFAULT 0;

-- Campos de identidade com defaults mais claros e profissionais
ALTER TABLE public.empresas ALTER COLUMN cor_primaria SET DEFAULT '#0A8DFF';
ALTER TABLE public.empresas ALTER COLUMN cor_secundaria SET DEFAULT '#F2B72E';
ALTER TABLE public.empresas ALTER COLUMN cor_fundo SET DEFAULT '#F5F8FC';
ALTER TABLE public.empresas ALTER COLUMN cor_texto SET DEFAULT '#102033';

UPDATE public.empresas
SET cor_fundo = COALESCE(NULLIF(cor_fundo, ''), '#F5F8FC'),
    cor_texto = COALESCE(NULLIF(cor_texto, ''), '#102033'),
    cor_primaria = COALESCE(NULLIF(cor_primaria, ''), '#0A8DFF'),
    cor_secundaria = COALESCE(NULLIF(cor_secundaria, ''), '#F2B72E')
WHERE cor_fundo IS NULL OR cor_texto IS NULL OR cor_primaria IS NULL OR cor_secundaria IS NULL;

-- Base para notas fiscais/importação de compras para abastecimento de estoque.
CREATE TABLE IF NOT EXISTS public.notas_fiscais (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  numero TEXT,
  serie TEXT,
  chave_acesso TEXT,
  fornecedor_nome TEXT,
  data_emissao DATE,
  data_entrada DATE DEFAULT CURRENT_DATE,
  valor_produtos NUMERIC(12,2) NOT NULL DEFAULT 0,
  valor_frete NUMERIC(12,2) NOT NULL DEFAULT 0,
  valor_impostos NUMERIC(12,2) NOT NULL DEFAULT 0,
  valor_desconto NUMERIC(12,2) NOT NULL DEFAULT 0,
  valor_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'importada' CHECK (status IN ('rascunho','importada','processada','cancelada')),
  observacoes TEXT,
  arquivo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.nota_fiscal_itens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nota_id UUID NOT NULL REFERENCES public.notas_fiscais(id) ON DELETE CASCADE,
  insumo_id UUID REFERENCES public.insumos(id) ON DELETE SET NULL,
  produto_id UUID REFERENCES public.produtos(id) ON DELETE SET NULL,
  descricao TEXT NOT NULL,
  quantidade NUMERIC(12,3) NOT NULL DEFAULT 0,
  unidade TEXT NOT NULL DEFAULT 'unidade',
  valor_unitario NUMERIC(12,4) NOT NULL DEFAULT 0,
  valor_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notas_fiscais_empresa_data ON public.notas_fiscais(empresa_id, data_entrada DESC);
CREATE INDEX IF NOT EXISTS idx_nota_fiscal_itens_nota ON public.nota_fiscal_itens(nota_id);

ALTER TABLE public.notas_fiscais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nota_fiscal_itens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notas_fiscais_select ON public.notas_fiscais;
DROP POLICY IF EXISTS notas_fiscais_insert ON public.notas_fiscais;
DROP POLICY IF EXISTS notas_fiscais_update ON public.notas_fiscais;
DROP POLICY IF EXISTS notas_fiscais_delete ON public.notas_fiscais;
CREATE POLICY notas_fiscais_select ON public.notas_fiscais FOR SELECT USING (empresa_id = public.get_empresa_id());
CREATE POLICY notas_fiscais_insert ON public.notas_fiscais FOR INSERT WITH CHECK (empresa_id = public.get_empresa_id());
CREATE POLICY notas_fiscais_update ON public.notas_fiscais FOR UPDATE USING (empresa_id = public.get_empresa_id()) WITH CHECK (empresa_id = public.get_empresa_id());
CREATE POLICY notas_fiscais_delete ON public.notas_fiscais FOR DELETE USING (empresa_id = public.get_empresa_id());

DROP POLICY IF EXISTS nota_fiscal_itens_select ON public.nota_fiscal_itens;
DROP POLICY IF EXISTS nota_fiscal_itens_insert ON public.nota_fiscal_itens;
DROP POLICY IF EXISTS nota_fiscal_itens_update ON public.nota_fiscal_itens;
DROP POLICY IF EXISTS nota_fiscal_itens_delete ON public.nota_fiscal_itens;
CREATE POLICY nota_fiscal_itens_select ON public.nota_fiscal_itens FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.notas_fiscais n WHERE n.id = nota_id AND n.empresa_id = public.get_empresa_id())
);
CREATE POLICY nota_fiscal_itens_insert ON public.nota_fiscal_itens FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.notas_fiscais n WHERE n.id = nota_id AND n.empresa_id = public.get_empresa_id())
);
CREATE POLICY nota_fiscal_itens_update ON public.nota_fiscal_itens FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.notas_fiscais n WHERE n.id = nota_id AND n.empresa_id = public.get_empresa_id())
);
CREATE POLICY nota_fiscal_itens_delete ON public.nota_fiscal_itens FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.notas_fiscais n WHERE n.id = nota_id AND n.empresa_id = public.get_empresa_id())
);

DROP TRIGGER IF EXISTS trg_notas_fiscais_updated_at ON public.notas_fiscais;
CREATE TRIGGER trg_notas_fiscais_updated_at BEFORE UPDATE ON public.notas_fiscais FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Bucket público para logos das empresas. Pode ser usado nos PDFs, relatórios e PWA.
INSERT INTO storage.buckets (id, name, public)
VALUES ('logos', 'logos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS logos_public_read ON storage.objects;
CREATE POLICY logos_public_read ON storage.objects
FOR SELECT USING (bucket_id = 'logos');

DROP POLICY IF EXISTS logos_insert_by_owner ON storage.objects;
CREATE POLICY logos_insert_by_owner ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'logos' AND auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS logos_update_by_owner ON storage.objects;
CREATE POLICY logos_update_by_owner ON storage.objects
FOR UPDATE USING (bucket_id = 'logos' AND auth.uid() IS NOT NULL) WITH CHECK (bucket_id = 'logos' AND auth.uid() IS NOT NULL);

-- Módulo de notas fiscais para os ramos que usam estoque.
INSERT INTO public.setor_modulos (tipo_empresa, modulo, ativo, ordem)
SELECT tipo_empresa, 'notas-fiscais', ativo, 13
FROM public.setor_modulos
WHERE modulo = 'estoque'
ON CONFLICT (tipo_empresa, modulo) DO NOTHING;
