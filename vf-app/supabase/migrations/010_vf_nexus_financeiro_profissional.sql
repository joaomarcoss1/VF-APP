-- ============================================================
-- VF Nexus — 010 Financeiro profissional
-- Contas a pagar/receber, categorias, centros de custo e anexos
-- ============================================================

CREATE TABLE IF NOT EXISTS public.categorias_financeiras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('receita','despesa','ambos')) DEFAULT 'ambos',
  cor TEXT DEFAULT '#0F4C81',
  ativa BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, nome, tipo)
);

CREATE TABLE IF NOT EXISTS public.centros_custo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  descricao TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, nome)
);

CREATE TABLE IF NOT EXISTS public.formas_pagamento_empresa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'outro',
  taxa_percentual NUMERIC(8,4) DEFAULT 0,
  dias_recebimento INTEGER DEFAULT 0,
  ativa BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, nome)
);

CREATE TABLE IF NOT EXISTS public.contas_pagar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  fornecedor_id UUID REFERENCES public.fornecedores(id) ON DELETE SET NULL,
  categoria_id UUID REFERENCES public.categorias_financeiras(id) ON DELETE SET NULL,
  centro_custo_id UUID REFERENCES public.centros_custo(id) ON DELETE SET NULL,
  descricao TEXT NOT NULL,
  valor NUMERIC(12,2) NOT NULL DEFAULT 0,
  data_competencia DATE,
  data_vencimento DATE NOT NULL,
  data_pagamento DATE,
  forma_pagamento TEXT,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','pago','vencido','cancelado')),
  recorrente BOOLEAN NOT NULL DEFAULT false,
  recorrencia TEXT,
  documento TEXT,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.contas_receber (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  venda_id UUID REFERENCES public.vendas(id) ON DELETE SET NULL,
  categoria_id UUID REFERENCES public.categorias_financeiras(id) ON DELETE SET NULL,
  centro_custo_id UUID REFERENCES public.centros_custo(id) ON DELETE SET NULL,
  descricao TEXT NOT NULL,
  valor NUMERIC(12,2) NOT NULL DEFAULT 0,
  data_competencia DATE,
  data_vencimento DATE NOT NULL,
  data_recebimento DATE,
  forma_pagamento TEXT,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','recebido','vencido','cancelado')),
  recorrente BOOLEAN NOT NULL DEFAULT false,
  recorrencia TEXT,
  documento TEXT,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.anexos_financeiros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  lancamento_id UUID REFERENCES public.lancamentos_financeiros(id) ON DELETE CASCADE,
  conta_pagar_id UUID REFERENCES public.contas_pagar(id) ON DELETE CASCADE,
  conta_receber_id UUID REFERENCES public.contas_receber(id) ON DELETE CASCADE,
  nome_arquivo TEXT NOT NULL,
  url TEXT NOT NULL,
  tipo_arquivo TEXT,
  tamanho_bytes BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.lancamentos_financeiros ADD COLUMN IF NOT EXISTS categoria_id UUID REFERENCES public.categorias_financeiras(id) ON DELETE SET NULL;
ALTER TABLE public.lancamentos_financeiros ADD COLUMN IF NOT EXISTS centro_custo_id UUID REFERENCES public.centros_custo(id) ON DELETE SET NULL;
ALTER TABLE public.lancamentos_financeiros ADD COLUMN IF NOT EXISTS data_competencia DATE;
ALTER TABLE public.lancamentos_financeiros ADD COLUMN IF NOT EXISTS origem TEXT;
ALTER TABLE public.lancamentos_financeiros ADD COLUMN IF NOT EXISTS origem_id UUID;

CREATE INDEX IF NOT EXISTS idx_contas_pagar_empresa_venc ON public.contas_pagar(empresa_id, data_vencimento, status);
CREATE INDEX IF NOT EXISTS idx_contas_receber_empresa_venc ON public.contas_receber(empresa_id, data_vencimento, status);
CREATE INDEX IF NOT EXISTS idx_lanc_fin_empresa_comp ON public.lancamentos_financeiros(empresa_id, data_competencia);

ALTER TABLE public.categorias_financeiras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.centros_custo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.formas_pagamento_empresa ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contas_pagar ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contas_receber ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anexos_financeiros ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['categorias_financeiras','centros_custo','formas_pagamento_empresa','contas_pagar','contas_receber','anexos_financeiros'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I_select_empresa ON public.%I', t, t);
    EXECUTE format('CREATE POLICY %I_select_empresa ON public.%I FOR SELECT USING (empresa_id = public.get_empresa_id())', t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I_insert_empresa ON public.%I', t, t);
    EXECUTE format('CREATE POLICY %I_insert_empresa ON public.%I FOR INSERT WITH CHECK (empresa_id = public.get_empresa_id())', t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I_update_empresa ON public.%I', t, t);
    EXECUTE format('CREATE POLICY %I_update_empresa ON public.%I FOR UPDATE USING (empresa_id = public.get_empresa_id()) WITH CHECK (empresa_id = public.get_empresa_id())', t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I_delete_empresa ON public.%I', t, t);
    EXECUTE format('CREATE POLICY %I_delete_empresa ON public.%I FOR DELETE USING (empresa_id = public.get_empresa_id())', t, t);
  END LOOP;
END $$;

-- Categorias padrão por empresa já existente, sem duplicar.
INSERT INTO public.categorias_financeiras (empresa_id, nome, tipo, cor)
SELECT e.id, c.nome, c.tipo, c.cor
FROM public.empresas e
CROSS JOIN (VALUES
  ('Vendas','receita','#16A34A'),
  ('Serviços','receita','#2563EB'),
  ('Fornecedores','despesa','#F59E0B'),
  ('Aluguel','despesa','#DC2626'),
  ('Marketing','despesa','#8B5CF6'),
  ('Impostos','despesa','#64748B')
) AS c(nome,tipo,cor)
ON CONFLICT DO NOTHING;
