-- ============================================================
-- VF Nexus — 011 Vendas, compras, estoque e OS profissionais
-- ============================================================

ALTER TABLE public.vendas ADD COLUMN IF NOT EXISTS desconto_geral NUMERIC(12,2) DEFAULT 0;
ALTER TABLE public.vendas ADD COLUMN IF NOT EXISTS frete NUMERIC(12,2) DEFAULT 0;
ALTER TABLE public.vendas ADD COLUMN IF NOT EXISTS impostos_estimados NUMERIC(12,2) DEFAULT 0;
ALTER TABLE public.vendas ADD COLUMN IF NOT EXISTS origem TEXT DEFAULT 'manual';
ALTER TABLE public.vendas ADD COLUMN IF NOT EXISTS origem_id UUID;
ALTER TABLE public.vendas ADD COLUMN IF NOT EXISTS data_cancelamento TIMESTAMPTZ;
ALTER TABLE public.vendas ADD COLUMN IF NOT EXISTS motivo_cancelamento TEXT;

CREATE TABLE IF NOT EXISTS public.venda_pagamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  venda_id UUID NOT NULL REFERENCES public.vendas(id) ON DELETE CASCADE,
  forma_pagamento TEXT NOT NULL,
  valor NUMERIC(12,2) NOT NULL DEFAULT 0,
  taxa NUMERIC(12,2) DEFAULT 0,
  data_recebimento DATE,
  status TEXT NOT NULL DEFAULT 'confirmado' CHECK (status IN ('pendente','confirmado','cancelado','estornado')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.venda_status_historico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  venda_id UUID NOT NULL REFERENCES public.vendas(id) ON DELETE CASCADE,
  status_anterior TEXT,
  status_novo TEXT NOT NULL,
  motivo TEXT,
  usuario_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.compras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  fornecedor_id UUID REFERENCES public.fornecedores(id) ON DELETE SET NULL,
  numero TEXT,
  status TEXT NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho','aprovada','recebida','cancelada')),
  data_compra DATE NOT NULL DEFAULT CURRENT_DATE,
  data_recebimento DATE,
  valor_produtos NUMERIC(12,2) DEFAULT 0,
  valor_frete NUMERIC(12,2) DEFAULT 0,
  valor_taxas NUMERIC(12,2) DEFAULT 0,
  desconto NUMERIC(12,2) DEFAULT 0,
  valor_total NUMERIC(12,2) DEFAULT 0,
  forma_pagamento TEXT,
  gerar_conta_pagar BOOLEAN DEFAULT true,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.compra_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  compra_id UUID NOT NULL REFERENCES public.compras(id) ON DELETE CASCADE,
  produto_id UUID REFERENCES public.produtos(id) ON DELETE SET NULL,
  insumo_id UUID REFERENCES public.insumos(id) ON DELETE SET NULL,
  tipo_item TEXT NOT NULL CHECK (tipo_item IN ('produto','insumo')),
  nome TEXT NOT NULL,
  quantidade NUMERIC(12,3) NOT NULL DEFAULT 1,
  custo_unitario NUMERIC(12,2) NOT NULL DEFAULT 0,
  frete_rateado NUMERIC(12,2) DEFAULT 0,
  taxas_rateadas NUMERIC(12,2) DEFAULT 0,
  custo_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ordens_servico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  agendamento_id UUID REFERENCES public.agendamentos(id) ON DELETE SET NULL,
  numero BIGINT,
  titulo TEXT NOT NULL,
  descricao TEXT,
  status TEXT NOT NULL DEFAULT 'aberta' CHECK (status IN ('aberta','orcamento','aprovada','execucao','finalizada','cancelada')),
  valor_orcado NUMERIC(12,2) DEFAULT 0,
  valor_final NUMERIC(12,2) DEFAULT 0,
  data_abertura DATE NOT NULL DEFAULT CURRENT_DATE,
  data_previsao DATE,
  data_finalizacao DATE,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.produto_estoque ADD COLUMN IF NOT EXISTS sku TEXT;
ALTER TABLE public.produto_estoque ADD COLUMN IF NOT EXISTS codigo_barras TEXT;
ALTER TABLE public.produto_estoque ADD COLUMN IF NOT EXISTS ultima_compra DATE;
ALTER TABLE public.produto_estoque ADD COLUMN IF NOT EXISTS bloquear_venda_sem_estoque BOOLEAN DEFAULT false;
ALTER TABLE public.movimentacoes_produto_estoque ADD COLUMN IF NOT EXISTS origem TEXT;
ALTER TABLE public.movimentacoes_produto_estoque ADD COLUMN IF NOT EXISTS origem_id UUID;

CREATE INDEX IF NOT EXISTS idx_venda_pagamentos_empresa ON public.venda_pagamentos(empresa_id, venda_id);
CREATE INDEX IF NOT EXISTS idx_compras_empresa_data ON public.compras(empresa_id, data_compra DESC);
CREATE INDEX IF NOT EXISTS idx_os_empresa_status ON public.ordens_servico(empresa_id, status);

ALTER TABLE public.venda_pagamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venda_status_historico ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compra_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ordens_servico ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['venda_pagamentos','venda_status_historico','compras','compra_itens','ordens_servico'] LOOP
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
