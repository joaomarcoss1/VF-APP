-- ============================================================
-- VF Nexus — CRM, financeiro, comprovantes e refinamento SaaS
-- Migration idempotente para produção
-- ============================================================

CREATE TABLE IF NOT EXISTS public.clientes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  telefone TEXT,
  whatsapp TEXT,
  email TEXT,
  endereco TEXT,
  documento TEXT,
  tipo TEXT NOT NULL DEFAULT 'cliente' CHECK (tipo IN ('cliente','fornecedor','lead')),
  origem TEXT,
  observacoes TEXT,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  total_compras NUMERIC(12,2) NOT NULL DEFAULT 0,
  ultima_interacao TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.lancamentos_financeiros (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('receita','despesa')),
  descricao TEXT NOT NULL,
  categoria TEXT,
  valor NUMERIC(12,2) NOT NULL DEFAULT 0,
  data_vencimento DATE NOT NULL DEFAULT CURRENT_DATE,
  data_pagamento DATE,
  forma_pagamento TEXT,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','pago','cancelado')),
  recorrente BOOLEAN NOT NULL DEFAULT FALSE,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.comprovantes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL DEFAULT 'venda' CHECK (tipo IN ('venda','agendamento','avulso')),
  venda_id UUID REFERENCES public.vendas(id) ON DELETE SET NULL,
  agendamento_id UUID REFERENCES public.agendamentos(id) ON DELETE SET NULL,
  cliente_nome TEXT,
  cliente_whatsapp TEXT,
  descricao TEXT,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  forma_pagamento TEXT,
  mensagem TEXT,
  pdf_url TEXT,
  enviado_whatsapp BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clientes_empresa_nome ON public.clientes(empresa_id, nome);
CREATE INDEX IF NOT EXISTS idx_clientes_empresa_whatsapp ON public.clientes(empresa_id, whatsapp);
CREATE INDEX IF NOT EXISTS idx_lancamentos_financeiros_empresa_data ON public.lancamentos_financeiros(empresa_id, data_vencimento, status);
CREATE INDEX IF NOT EXISTS idx_comprovantes_empresa_created ON public.comprovantes(empresa_id, created_at DESC);

ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lancamentos_financeiros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comprovantes ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['clientes','lancamentos_financeiros','comprovantes'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I_select ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I_insert ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I_update ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I_delete ON public.%I', t, t);
    EXECUTE format('CREATE POLICY %I_select ON public.%I FOR SELECT USING (empresa_id = public.get_empresa_id())', t, t);
    EXECUTE format('CREATE POLICY %I_insert ON public.%I FOR INSERT WITH CHECK (empresa_id = public.get_empresa_id())', t, t);
    EXECUTE format('CREATE POLICY %I_update ON public.%I FOR UPDATE USING (empresa_id = public.get_empresa_id()) WITH CHECK (empresa_id = public.get_empresa_id())', t, t);
    EXECUTE format('CREATE POLICY %I_delete ON public.%I FOR DELETE USING (empresa_id = public.get_empresa_id())', t, t);
  END LOOP;
END $$;

DROP TRIGGER IF EXISTS trg_clientes_updated_at ON public.clientes;
CREATE TRIGGER trg_clientes_updated_at BEFORE UPDATE ON public.clientes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS trg_lancamentos_financeiros_updated_at ON public.lancamentos_financeiros;
CREATE TRIGGER trg_lancamentos_financeiros_updated_at BEFORE UPDATE ON public.lancamentos_financeiros FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS trg_comprovantes_updated_at ON public.comprovantes;
CREATE TRIGGER trg_comprovantes_updated_at BEFORE UPDATE ON public.comprovantes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Libera novos módulos comuns para os setores, sem sobrescrever escolhas feitas pelo Master Admin.
INSERT INTO public.setor_modulos (tipo_empresa, modulo, ativo, ordem)
SELECT e.tipo, m.modulo, true, m.ordem
FROM (SELECT DISTINCT tipo FROM public.empresas WHERE tipo IS NOT NULL) e
CROSS JOIN (VALUES ('clientes', 2), ('financeiro', 10), ('comprovantes', 12)) AS m(modulo, ordem)
ON CONFLICT (tipo_empresa, modulo) DO NOTHING;
