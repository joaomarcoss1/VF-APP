-- ============================================================
-- VF Nexus — 015 Concretização de regras de negócio críticas
-- Garante que vendas, estoque, compras, financeiro, OS e auditoria
-- funcionem de forma interna no banco, não apenas pela interface.
-- ============================================================

-- Campos de origem e rastreio para evitar duplicidades.
ALTER TABLE public.lancamentos_financeiros ADD COLUMN IF NOT EXISTS origem TEXT;
ALTER TABLE public.lancamentos_financeiros ADD COLUMN IF NOT EXISTS origem_id UUID;
ALTER TABLE public.contas_receber ADD COLUMN IF NOT EXISTS origem TEXT;
ALTER TABLE public.contas_receber ADD COLUMN IF NOT EXISTS origem_id UUID;
ALTER TABLE public.contas_pagar ADD COLUMN IF NOT EXISTS origem TEXT;
ALTER TABLE public.contas_pagar ADD COLUMN IF NOT EXISTS origem_id UUID;
ALTER TABLE public.vendas ADD COLUMN IF NOT EXISTS data_cancelamento TIMESTAMPTZ;
ALTER TABLE public.vendas ADD COLUMN IF NOT EXISTS motivo_cancelamento TEXT;
ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS gerar_conta_pagar BOOLEAN DEFAULT true;
ALTER TABLE public.ordens_servico ADD COLUMN IF NOT EXISTS gera_recebimento BOOLEAN DEFAULT true;
ALTER TABLE public.ordens_servico ADD COLUMN IF NOT EXISTS conta_receber_id UUID REFERENCES public.contas_receber(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_lanc_fin_origem_empresa ON public.lancamentos_financeiros(empresa_id, origem, origem_id) WHERE origem IS NOT NULL AND origem_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS ux_contas_receber_origem_empresa ON public.contas_receber(empresa_id, origem, origem_id) WHERE origem IS NOT NULL AND origem_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS ux_contas_pagar_origem_empresa ON public.contas_pagar(empresa_id, origem, origem_id) WHERE origem IS NOT NULL AND origem_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mov_estoque_documento ON public.movimentacoes_estoque(documento, tipo);
CREATE INDEX IF NOT EXISTS idx_mov_prod_estoque_documento ON public.movimentacoes_produto_estoque(documento, tipo);
CREATE UNIQUE INDEX IF NOT EXISTS ux_venda_pagamentos_confirmado ON public.venda_pagamentos(empresa_id, venda_id, forma_pagamento) WHERE status = 'confirmado';

-- Auditoria leve e segura.
CREATE OR REPLACE FUNCTION public.vf_auditar(
  p_empresa_id UUID,
  p_acao TEXT,
  p_entidade TEXT DEFAULT NULL,
  p_entidade_id UUID DEFAULT NULL,
  p_detalhes JSONB DEFAULT '{}'::jsonb
) RETURNS VOID AS $$
BEGIN
  INSERT INTO public.logs_auditoria (empresa_id, usuario_id, acao, entidade, entidade_id, detalhes)
  VALUES (p_empresa_id, auth.uid(), p_acao, p_entidade, p_entidade_id, p_detalhes);
EXCEPTION WHEN OTHERS THEN
  -- Auditoria não pode quebrar a operação principal.
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Venda registrada: gera pagamento, financeiro, conta recebida e histórico.
CREATE OR REPLACE FUNCTION public.vf_venda_after_insert()
RETURNS TRIGGER AS $$
DECLARE
  v_forma TEXT := COALESCE(NEW.forma_pagamento, 'pix');
  v_descricao TEXT := 'Venda ' || COALESCE('#' || NEW.numero::text, substring(NEW.id::text, 1, 8)) || ' — ' || COALESCE(NEW.produto_nome, 'Venda');
BEGIN
  INSERT INTO public.venda_pagamentos (empresa_id, venda_id, forma_pagamento, valor, data_recebimento, status)
  VALUES (NEW.empresa_id, NEW.id, v_forma, COALESCE(NEW.total, 0), COALESCE(NEW.data_venda, CURRENT_DATE), 'confirmado')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.lancamentos_financeiros (
    empresa_id, tipo, descricao, categoria, valor, data_vencimento, data_pagamento,
    forma_pagamento, status, origem, origem_id, observacoes
  ) VALUES (
    NEW.empresa_id, 'receita', v_descricao, 'Vendas', COALESCE(NEW.total, 0),
    COALESCE(NEW.data_venda, CURRENT_DATE), COALESCE(NEW.data_venda, CURRENT_DATE),
    v_forma, 'pago', 'venda', NEW.id, 'Gerado automaticamente pela venda.'
  ) ON CONFLICT (empresa_id, origem, origem_id) WHERE origem IS NOT NULL AND origem_id IS NOT NULL DO NOTHING;

  INSERT INTO public.contas_receber (
    empresa_id, cliente_id, venda_id, descricao, valor, data_vencimento, data_recebimento,
    forma_pagamento, status, origem, origem_id, observacoes
  ) VALUES (
    NEW.empresa_id, NEW.cliente_id, NEW.id, v_descricao, COALESCE(NEW.total, 0),
    COALESCE(NEW.data_venda, CURRENT_DATE), COALESCE(NEW.data_venda, CURRENT_DATE),
    v_forma, 'recebido', 'venda', NEW.id, 'Liquidada automaticamente pela venda.'
  ) ON CONFLICT (empresa_id, origem, origem_id) WHERE origem IS NOT NULL AND origem_id IS NOT NULL DO NOTHING;

  INSERT INTO public.venda_status_historico (empresa_id, venda_id, status_anterior, status_novo, motivo, usuario_id)
  VALUES (NEW.empresa_id, NEW.id, NULL, COALESCE(NEW.status, 'realizada'), 'Venda registrada', auth.uid());

  UPDATE public.clientes
  SET total_compras = COALESCE(total_compras, 0) + COALESCE(NEW.total, 0),
      ultima_interacao = now(),
      updated_at = now()
  WHERE id = NEW.cliente_id AND empresa_id = NEW.empresa_id;

  PERFORM public.vf_auditar(NEW.empresa_id, 'venda.criar', 'vendas', NEW.id, jsonb_build_object('total', NEW.total, 'cliente_id', NEW.cliente_id));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS tr_vf_venda_after_insert ON public.vendas;
CREATE TRIGGER tr_vf_venda_after_insert
AFTER INSERT ON public.vendas
FOR EACH ROW EXECUTE FUNCTION public.vf_venda_after_insert();

-- Item de venda: baixa estoque de produto final e insumos de ficha técnica.
CREATE OR REPLACE FUNCTION public.vf_venda_item_after_insert()
RETURNS TRIGGER AS $$
DECLARE
  f RECORD;
  v_doc TEXT := 'venda:' || NEW.venda_id::text;
BEGIN
  IF NEW.produto_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.movimentacoes_produto_estoque
      WHERE empresa_id = NEW.empresa_id AND produto_id = NEW.produto_id AND documento = v_doc AND tipo = 'saida'
    ) THEN
      INSERT INTO public.movimentacoes_produto_estoque (
        empresa_id, produto_id, tipo, quantidade, custo_unitario, custo_total, motivo, documento, usuario_id, origem, origem_id
      ) VALUES (
        NEW.empresa_id, NEW.produto_id, 'saida', COALESCE(NEW.quantidade, 0), COALESCE(NEW.custo_unitario, 0),
        COALESCE(NEW.quantidade, 0) * COALESCE(NEW.custo_unitario, 0),
        'Baixa automática por venda', v_doc, auth.uid(), 'venda', NEW.venda_id
      );
    END IF;

    FOR f IN SELECT ft.insumo_id, ft.quantidade, ft.unidade, ft.custo_calculado
             FROM public.ficha_tecnica ft
             WHERE ft.produto_id = NEW.produto_id LOOP
      INSERT INTO public.movimentacoes_estoque (
        empresa_id, insumo_id, tipo, quantidade, unidade, custo_unitario, custo_total, motivo, documento, usuario_id
      ) VALUES (
        NEW.empresa_id, f.insumo_id, 'saida', COALESCE(f.quantidade, 0) * COALESCE(NEW.quantidade, 0),
        COALESCE(f.unidade, 'unidade'),
        CASE WHEN COALESCE(f.quantidade, 0) > 0 THEN COALESCE(f.custo_calculado, 0) / NULLIF(f.quantidade, 0) ELSE 0 END,
        COALESCE(f.custo_calculado, 0) * COALESCE(NEW.quantidade, 0),
        'Baixa automática de insumo por venda/ficha técnica', v_doc, auth.uid()
      );
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS tr_vf_venda_item_after_insert ON public.venda_itens;
CREATE TRIGGER tr_vf_venda_item_after_insert
AFTER INSERT ON public.venda_itens
FOR EACH ROW EXECUTE FUNCTION public.vf_venda_item_after_insert();

-- Estorno/cancelamento: reverte estoque, pagamentos e financeiro.
CREATE OR REPLACE FUNCTION public.vf_venda_after_status_update()
RETURNS TRIGGER AS $$
DECLARE
  m RECORD;
BEGIN
  IF NEW.status IN ('estornada','cancelada') AND COALESCE(OLD.status, 'realizada') IS DISTINCT FROM NEW.status THEN
    FOR m IN SELECT * FROM public.movimentacoes_produto_estoque WHERE documento = 'venda:' || NEW.id::text AND tipo = 'saida' LOOP
      IF NOT EXISTS (SELECT 1 FROM public.movimentacoes_produto_estoque WHERE documento = 'estorno:' || NEW.id::text AND produto_id = m.produto_id) THEN
        INSERT INTO public.movimentacoes_produto_estoque (empresa_id, produto_id, tipo, quantidade, custo_unitario, custo_total, motivo, documento, usuario_id, origem, origem_id)
        VALUES (m.empresa_id, m.produto_id, 'entrada', m.quantidade, m.custo_unitario, m.custo_total, 'Estorno automático de venda', 'estorno:' || NEW.id::text, auth.uid(), 'estorno_venda', NEW.id);
      END IF;
    END LOOP;

    FOR m IN SELECT * FROM public.movimentacoes_estoque WHERE documento = 'venda:' || NEW.id::text AND tipo = 'saida' LOOP
      IF NOT EXISTS (SELECT 1 FROM public.movimentacoes_estoque WHERE documento = 'estorno:' || NEW.id::text AND insumo_id = m.insumo_id) THEN
        INSERT INTO public.movimentacoes_estoque (empresa_id, insumo_id, tipo, quantidade, unidade, custo_unitario, custo_total, motivo, documento, usuario_id)
        VALUES (m.empresa_id, m.insumo_id, 'entrada', m.quantidade, m.unidade, m.custo_unitario, m.custo_total, 'Estorno automático de venda', 'estorno:' || NEW.id::text, auth.uid());
      END IF;
    END LOOP;

    UPDATE public.venda_pagamentos SET status = 'estornado' WHERE venda_id = NEW.id;
    UPDATE public.lancamentos_financeiros SET status = 'cancelado', updated_at = now() WHERE origem = 'venda' AND origem_id = NEW.id;
    UPDATE public.contas_receber SET status = 'cancelado', updated_at = now() WHERE origem = 'venda' AND origem_id = NEW.id;

    INSERT INTO public.venda_status_historico (empresa_id, venda_id, status_anterior, status_novo, motivo, usuario_id)
    VALUES (NEW.empresa_id, NEW.id, OLD.status, NEW.status, COALESCE(NEW.motivo_cancelamento, 'Alteração de status'), auth.uid());

    PERFORM public.vf_auditar(NEW.empresa_id, 'venda.' || NEW.status, 'vendas', NEW.id, jsonb_build_object('total', NEW.total));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS tr_vf_venda_after_status_update ON public.vendas;
CREATE TRIGGER tr_vf_venda_after_status_update
AFTER UPDATE OF status ON public.vendas
FOR EACH ROW EXECUTE FUNCTION public.vf_venda_after_status_update();

-- Compra: gera conta a pagar.
CREATE OR REPLACE FUNCTION public.vf_compra_after_insert()
RETURNS TRIGGER AS $$
DECLARE
  v_descricao TEXT := 'Compra/nota ' || COALESCE(NEW.numero, substring(NEW.id::text, 1, 8));
BEGIN
  IF COALESCE(NEW.gerar_conta_pagar, true) AND COALESCE(NEW.valor_total, 0) > 0 AND COALESCE(NEW.status, 'rascunho') <> 'cancelada' THEN
    INSERT INTO public.contas_pagar (empresa_id, fornecedor_id, descricao, valor, data_vencimento, forma_pagamento, status, origem, origem_id, observacoes)
    VALUES (NEW.empresa_id, NEW.fornecedor_id, v_descricao, NEW.valor_total, COALESCE(NEW.data_recebimento, NEW.data_compra, CURRENT_DATE), NEW.forma_pagamento, 'pendente', 'compra', NEW.id, 'Gerada automaticamente pela compra/nota.')
    ON CONFLICT (empresa_id, origem, origem_id) WHERE origem IS NOT NULL AND origem_id IS NOT NULL DO NOTHING;
  END IF;
  PERFORM public.vf_auditar(NEW.empresa_id, 'compra.criar', 'compras', NEW.id, jsonb_build_object('valor_total', NEW.valor_total));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS tr_vf_compra_after_insert ON public.compras;
CREATE TRIGGER tr_vf_compra_after_insert
AFTER INSERT ON public.compras
FOR EACH ROW EXECUTE FUNCTION public.vf_compra_after_insert();

-- Item de compra: abastece produto final ou insumo.
CREATE OR REPLACE FUNCTION public.vf_compra_item_after_insert()
RETURNS TRIGGER AS $$
DECLARE
  v_doc TEXT := 'compra:' || NEW.compra_id::text;
BEGIN
  IF NEW.tipo_item = 'produto' AND NEW.produto_id IS NOT NULL THEN
    INSERT INTO public.movimentacoes_produto_estoque (empresa_id, produto_id, tipo, quantidade, custo_unitario, custo_total, motivo, documento, usuario_id, origem, origem_id)
    VALUES (NEW.empresa_id, NEW.produto_id, 'entrada', NEW.quantidade, NEW.custo_unitario + COALESCE(NEW.frete_rateado,0) + COALESCE(NEW.taxas_rateadas,0), NEW.custo_total, 'Entrada automática por compra/nota', v_doc, auth.uid(), 'compra', NEW.compra_id);
  ELSIF NEW.tipo_item = 'insumo' AND NEW.insumo_id IS NOT NULL THEN
    INSERT INTO public.movimentacoes_estoque (empresa_id, insumo_id, tipo, quantidade, unidade, custo_unitario, custo_total, motivo, documento, usuario_id)
    VALUES (NEW.empresa_id, NEW.insumo_id, 'entrada', NEW.quantidade, 'unidade', NEW.custo_unitario + COALESCE(NEW.frete_rateado,0) + COALESCE(NEW.taxas_rateadas,0), NEW.custo_total, 'Entrada automática por compra/nota', v_doc, auth.uid());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS tr_vf_compra_item_after_insert ON public.compra_itens;
CREATE TRIGGER tr_vf_compra_item_after_insert
AFTER INSERT ON public.compra_itens
FOR EACH ROW EXECUTE FUNCTION public.vf_compra_item_after_insert();

-- Ordem de serviço finalizada: gera conta a receber.
CREATE OR REPLACE FUNCTION public.vf_os_after_update()
RETURNS TRIGGER AS $$
DECLARE
  v_valor NUMERIC := COALESCE(NULLIF(NEW.valor_final, 0), NEW.valor_orcado, 0);
BEGIN
  IF NEW.status = 'finalizada' AND COALESCE(OLD.status, '') IS DISTINCT FROM NEW.status AND COALESCE(NEW.gera_recebimento, true) AND v_valor > 0 THEN
    INSERT INTO public.contas_receber (empresa_id, cliente_id, descricao, valor, data_vencimento, status, origem, origem_id, observacoes)
    VALUES (NEW.empresa_id, NEW.cliente_id, 'Ordem de serviço — ' || NEW.titulo, v_valor, COALESCE(NEW.data_finalizacao, CURRENT_DATE), 'pendente', 'ordem_servico', NEW.id, 'Gerada automaticamente ao finalizar a OS.')
    ON CONFLICT (empresa_id, origem, origem_id) WHERE origem IS NOT NULL AND origem_id IS NOT NULL DO UPDATE SET valor = EXCLUDED.valor, updated_at = now();
    PERFORM public.vf_auditar(NEW.empresa_id, 'ordem_servico.finalizar', 'ordens_servico', NEW.id, jsonb_build_object('valor', v_valor));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS tr_vf_os_after_update ON public.ordens_servico;
CREATE TRIGGER tr_vf_os_after_update
AFTER UPDATE OF status ON public.ordens_servico
FOR EACH ROW EXECUTE FUNCTION public.vf_os_after_update();

-- Módulos e rotas comerciais finais.
INSERT INTO public.setor_modulos (tipo_empresa, modulo, ativo, ordem)
VALUES
  ('prestador_servico','ordens-servico',true,18),
  ('barbearia','ordens-servico',true,18),
  ('fotografia','ordens-servico',true,18),
  ('eletronicos','ordens-servico',true,18),
  ('loja_variedades','notas-fiscais',true,11),
  ('roupas','notas-fiscais',true,11),
  ('eletronicos','notas-fiscais',true,11)
ON CONFLICT (tipo_empresa, modulo) DO UPDATE SET ativo = EXCLUDED.ativo, ordem = EXCLUDED.ordem;
