-- ============================================================
-- VF APP — Segurança, cálculos, estoque e histórico
-- Migration idempotente para bancos em produção.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------
-- 1. IA: log de uso por empresa para limitar custo diário
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ia_usage_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  usuario_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ia_usage_log_empresa_created ON public.ia_usage_log(empresa_id, created_at DESC);
ALTER TABLE public.ia_usage_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS select_company_data ON public.ia_usage_log;
DROP POLICY IF EXISTS insert_company_data ON public.ia_usage_log;
DROP POLICY IF EXISTS update_company_data ON public.ia_usage_log;
DROP POLICY IF EXISTS delete_company_data ON public.ia_usage_log;
CREATE POLICY select_company_data ON public.ia_usage_log FOR SELECT USING (empresa_id = public.get_empresa_id());
CREATE POLICY insert_company_data ON public.ia_usage_log FOR INSERT WITH CHECK (empresa_id = public.get_empresa_id() AND usuario_id = auth.uid());
CREATE POLICY update_company_data ON public.ia_usage_log FOR UPDATE USING (FALSE) WITH CHECK (FALSE);
CREATE POLICY delete_company_data ON public.ia_usage_log FOR DELETE USING (FALSE);

-- ------------------------------------------------------------
-- 2. Bloqueio real de escrita por assinatura no RLS
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.empresa_assinatura_ativa(p_empresa_id UUID DEFAULT public.get_empresa_id())
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN p_empresa_id IS NULL THEN FALSE
    WHEN NOT EXISTS (SELECT 1 FROM public.assinaturas a WHERE a.empresa_id = p_empresa_id) THEN TRUE
    ELSE EXISTS (
      SELECT 1
      FROM public.assinaturas a
      WHERE a.empresa_id = p_empresa_id
        AND a.status NOT IN ('bloqueada','vencida','cancelada')
    )
  END;
$$;

GRANT EXECUTE ON FUNCTION public.empresa_assinatura_ativa(UUID) TO authenticated;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'categorias_insumos','fornecedores','insumos','produtos','movimentacoes_estoque','vendas','configuracoes',
    'eventos','cardapios','cardapio_itens','promocoes','despesas','agendamentos','push_subscriptions','notificacoes_agendadas'
  ]
  LOOP
    IF to_regclass(format('public.%I', t)) IS NOT NULL THEN
      EXECUTE format('DROP POLICY IF EXISTS select_company_data ON public.%I', t);
      EXECUTE format('DROP POLICY IF EXISTS insert_company_data ON public.%I', t);
      EXECUTE format('DROP POLICY IF EXISTS update_company_data ON public.%I', t);
      EXECUTE format('DROP POLICY IF EXISTS delete_company_data ON public.%I', t);

      EXECUTE format('CREATE POLICY select_company_data ON public.%I FOR SELECT USING (empresa_id = public.get_empresa_id())', t);
      EXECUTE format('CREATE POLICY insert_company_data ON public.%I FOR INSERT WITH CHECK (empresa_id = public.get_empresa_id() AND public.empresa_assinatura_ativa(empresa_id))', t);
      EXECUTE format('CREATE POLICY update_company_data ON public.%I FOR UPDATE USING (empresa_id = public.get_empresa_id()) WITH CHECK (empresa_id = public.get_empresa_id() AND public.empresa_assinatura_ativa(empresa_id))', t);
      EXECUTE format('CREATE POLICY delete_company_data ON public.%I FOR DELETE USING (empresa_id = public.get_empresa_id() AND public.empresa_assinatura_ativa(empresa_id))', t);
    END IF;
  END LOOP;
END $$;

-- Ficha técnica não tem empresa_id: valida pela empresa do produto/insumo.
DROP POLICY IF EXISTS ficha_select ON public.ficha_tecnica;
DROP POLICY IF EXISTS ficha_insert ON public.ficha_tecnica;
DROP POLICY IF EXISTS ficha_update ON public.ficha_tecnica;
DROP POLICY IF EXISTS ficha_delete ON public.ficha_tecnica;
CREATE POLICY ficha_select ON public.ficha_tecnica
  FOR SELECT USING (produto_id IN (SELECT id FROM public.produtos WHERE empresa_id = public.get_empresa_id()));
CREATE POLICY ficha_insert ON public.ficha_tecnica
  FOR INSERT WITH CHECK (
    produto_id IN (SELECT id FROM public.produtos WHERE empresa_id = public.get_empresa_id())
    AND insumo_id IN (SELECT id FROM public.insumos WHERE empresa_id = public.get_empresa_id())
    AND public.empresa_assinatura_ativa(public.get_empresa_id())
  );
CREATE POLICY ficha_update ON public.ficha_tecnica
  FOR UPDATE USING (produto_id IN (SELECT id FROM public.produtos WHERE empresa_id = public.get_empresa_id()))
  WITH CHECK (
    produto_id IN (SELECT id FROM public.produtos WHERE empresa_id = public.get_empresa_id())
    AND insumo_id IN (SELECT id FROM public.insumos WHERE empresa_id = public.get_empresa_id())
    AND public.empresa_assinatura_ativa(public.get_empresa_id())
  );
CREATE POLICY ficha_delete ON public.ficha_tecnica
  FOR DELETE USING (
    produto_id IN (SELECT id FROM public.produtos WHERE empresa_id = public.get_empresa_id())
    AND public.empresa_assinatura_ativa(public.get_empresa_id())
  );

-- Itens de evento também dependem da empresa do evento/produto.
DROP POLICY IF EXISTS evento_itens_select ON public.evento_itens;
DROP POLICY IF EXISTS evento_itens_insert ON public.evento_itens;
DROP POLICY IF EXISTS evento_itens_update ON public.evento_itens;
DROP POLICY IF EXISTS evento_itens_delete ON public.evento_itens;
CREATE POLICY evento_itens_select ON public.evento_itens
  FOR SELECT USING (evento_id IN (SELECT id FROM public.eventos WHERE empresa_id = public.get_empresa_id()));
CREATE POLICY evento_itens_insert ON public.evento_itens
  FOR INSERT WITH CHECK (
    evento_id IN (SELECT id FROM public.eventos WHERE empresa_id = public.get_empresa_id())
    AND produto_id IN (SELECT id FROM public.produtos WHERE empresa_id = public.get_empresa_id())
    AND public.empresa_assinatura_ativa(public.get_empresa_id())
  );
CREATE POLICY evento_itens_update ON public.evento_itens
  FOR UPDATE USING (evento_id IN (SELECT id FROM public.eventos WHERE empresa_id = public.get_empresa_id()))
  WITH CHECK (
    evento_id IN (SELECT id FROM public.eventos WHERE empresa_id = public.get_empresa_id())
    AND produto_id IN (SELECT id FROM public.produtos WHERE empresa_id = public.get_empresa_id())
    AND public.empresa_assinatura_ativa(public.get_empresa_id())
  );
CREATE POLICY evento_itens_delete ON public.evento_itens
  FOR DELETE USING (
    evento_id IN (SELECT id FROM public.eventos WHERE empresa_id = public.get_empresa_id())
    AND public.empresa_assinatura_ativa(public.get_empresa_id())
  );

-- ------------------------------------------------------------
-- 3. Cálculo SQL: usar margens configuráveis no produto
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.atualizar_custo_produto()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  target_produto_id UUID;
  total NUMERIC := 0;
  prod RECORD;
  cfg RECORD;
  novo_preco NUMERIC := 0;
  margem_min NUMERIC := 200;
  margem_prem NUMERIC := 400;
BEGIN
  target_produto_id := COALESCE(NEW.produto_id, OLD.produto_id);

  SELECT COALESCE(SUM(custo_calculado), 0)
    INTO total
  FROM public.ficha_tecnica
  WHERE produto_id = target_produto_id;

  SELECT * INTO prod FROM public.produtos WHERE id = target_produto_id;
  SELECT margem_minima, margem_premium INTO cfg FROM public.configuracoes WHERE empresa_id = prod.empresa_id LIMIT 1;

  margem_min := COALESCE(cfg.margem_minima, 200);
  margem_prem := COALESCE(cfg.margem_premium, 400);

  IF COALESCE(prod.preco_manual, FALSE) AND COALESCE(prod.preco_venda, 0) > 0 THEN
    novo_preco := prod.preco_venda;
  ELSE
    novo_preco := ROUND(total * (1 + COALESCE(prod.margem_aplicada, 300) / 100), 2);
  END IF;

  UPDATE public.produtos SET
    custo_total     = ROUND(total, 2),
    preco_venda     = novo_preco,
    preco_minimo    = ROUND(total * (1 + margem_min / 100), 2),
    preco_premium   = ROUND(total * (1 + margem_prem / 100), 2),
    cmv_percentual  = CASE WHEN novo_preco > 0 THEN ROUND((total / novo_preco) * 100, 2) ELSE 0 END,
    lucro_bruto     = ROUND(novo_preco - total, 2),
    margem_bruta    = CASE WHEN novo_preco > 0 THEN ROUND(((novo_preco - total) / novo_preco) * 100, 2) ELSE 0 END,
    updated_at      = NOW()
  WHERE id = target_produto_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- ------------------------------------------------------------
-- 4. Histórico de preços
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.historico_precos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  produto_id UUID NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
  preco_anterior NUMERIC(12,2),
  preco_novo NUMERIC(12,2),
  custo_no_momento NUMERIC(12,2),
  alterado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_historico_precos_produto ON public.historico_precos(produto_id, alterado_em DESC);
ALTER TABLE public.historico_precos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS select_company_data ON public.historico_precos;
DROP POLICY IF EXISTS insert_company_data ON public.historico_precos;
DROP POLICY IF EXISTS update_company_data ON public.historico_precos;
DROP POLICY IF EXISTS delete_company_data ON public.historico_precos;
CREATE POLICY select_company_data ON public.historico_precos FOR SELECT USING (empresa_id = public.get_empresa_id());
CREATE POLICY insert_company_data ON public.historico_precos FOR INSERT WITH CHECK (empresa_id = public.get_empresa_id());
CREATE POLICY update_company_data ON public.historico_precos FOR UPDATE USING (FALSE) WITH CHECK (FALSE);
CREATE POLICY delete_company_data ON public.historico_precos FOR DELETE USING (FALSE);

CREATE OR REPLACE FUNCTION public.registrar_historico_preco()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.preco_venda IS DISTINCT FROM NEW.preco_venda THEN
    INSERT INTO public.historico_precos (empresa_id, produto_id, preco_anterior, preco_novo, custo_no_momento)
    VALUES (NEW.empresa_id, NEW.id, OLD.preco_venda, NEW.preco_venda, NEW.custo_total);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_registrar_historico_preco ON public.produtos;
CREATE TRIGGER trg_registrar_historico_preco
AFTER UPDATE OF preco_venda ON public.produtos
FOR EACH ROW EXECUTE FUNCTION public.registrar_historico_preco();

-- ------------------------------------------------------------
-- 5. Vendas: status para estorno/cancelamento sem apagar histórico
-- ------------------------------------------------------------
ALTER TABLE public.vendas ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'realizada';
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'vendas_status_check') THEN
    ALTER TABLE public.vendas ADD CONSTRAINT vendas_status_check CHECK (status IN ('realizada','cancelada','estornada'));
  END IF;
END $$;

-- Reforço para colunas de notificação caso a migration 002 ainda não tenha sido executada.
ALTER TABLE public.configuracoes ADD COLUMN IF NOT EXISTS notificacao_agendamento_antecedencia TEXT NOT NULL DEFAULT '1_dia';
ALTER TABLE public.configuracoes ADD COLUMN IF NOT EXISTS notificacao_agendamento_ativa BOOLEAN NOT NULL DEFAULT TRUE;
