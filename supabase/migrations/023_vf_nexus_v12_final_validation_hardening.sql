-- ============================================================
-- VF Nexus V12 — validação final comercial, transações, fiscal e tema
-- Idempotente para Supabase/Postgres
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1) Identidade visual completa e persistente.
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS cor_superficie TEXT DEFAULT '#FFFFFF';
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS cor_superficie2 TEXT DEFAULT '#EEF4FB';
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS cor_borda TEXT DEFAULT '#DCE6F0';
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS cor_menu TEXT DEFAULT '#FFFFFF';
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS cor_card TEXT DEFAULT '#FFFFFF';
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS cor_muted TEXT DEFAULT '#667085';
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS cor_sucesso TEXT DEFAULT '#16A34A';
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS cor_alerta TEXT DEFAULT '#F59E0B';
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS cor_erro TEXT DEFAULT '#DC2626';
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS cor_info TEXT DEFAULT '#0A8DFF';
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS modo_tema TEXT DEFAULT 'light';
ALTER TABLE public.configuracoes ADD COLUMN IF NOT EXISTS preferencias_relatorio JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.configuracoes ADD COLUMN IF NOT EXISTS preferencias_cardapio JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.configuracoes ADD COLUMN IF NOT EXISTS preferencias_mobile JSONB DEFAULT '{}'::jsonb;

-- 2) Fiscal readiness: estrutura clara sem prometer emissão oficial sem provedor.
CREATE TABLE IF NOT EXISTS public.integracoes_fiscais_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE UNIQUE,
  provedor TEXT NOT NULL DEFAULT 'outro',
  ambiente TEXT NOT NULL DEFAULT 'homologacao' CHECK (ambiente IN ('homologacao','producao')),
  certificado_configurado BOOLEAN NOT NULL DEFAULT FALSE,
  cnpj TEXT,
  inscricao_estadual TEXT,
  inscricao_municipal TEXT,
  regime_tributario TEXT,
  cnae TEXT,
  serie_nfe TEXT DEFAULT '1',
  serie_nfce TEXT DEFAULT '1',
  serie_nfse TEXT DEFAULT '1',
  token_homologacao TEXT,
  token_producao TEXT,
  status TEXT NOT NULL DEFAULT 'nao_configurada',
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.documentos_fiscais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  venda_id UUID REFERENCES public.vendas(id) ON DELETE SET NULL,
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('nfe','nfce','nfse')),
  status TEXT NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho','emitindo','autorizada','rejeitada','cancelada')),
  numero TEXT,
  serie TEXT,
  chave_acesso TEXT,
  xml_url TEXT,
  danfe_url TEXT,
  mensagem_retorno TEXT,
  payload_envio JSONB DEFAULT '{}'::jsonb,
  payload_retorno JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.documentos_fiscais_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  documento_id UUID NOT NULL REFERENCES public.documentos_fiscais(id) ON DELETE CASCADE,
  produto_id UUID REFERENCES public.produtos(id) ON DELETE SET NULL,
  descricao TEXT NOT NULL,
  quantidade NUMERIC(12,3) NOT NULL DEFAULT 1,
  valor_unitario NUMERIC(14,2) NOT NULL DEFAULT 0,
  valor_total NUMERIC(14,2) NOT NULL DEFAULT 0,
  ncm TEXT,
  cfop TEXT,
  cest TEXT,
  cst_csosn TEXT,
  aliquota_icms NUMERIC(8,4),
  aliquota_pis NUMERIC(8,4),
  aliquota_cofins NUMERIC(8,4),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.documentos_fiscais_eventos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  documento_id UUID NOT NULL REFERENCES public.documentos_fiscais(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  status TEXT,
  mensagem TEXT,
  payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_documentos_fiscais_empresa_status ON public.documentos_fiscais(empresa_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_documentos_fiscais_itens_empresa ON public.documentos_fiscais_itens(empresa_id, documento_id);

ALTER TABLE public.integracoes_fiscais_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documentos_fiscais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documentos_fiscais_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documentos_fiscais_eventos ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['integracoes_fiscais_config','documentos_fiscais','documentos_fiscais_itens','documentos_fiscais_eventos'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I_select_empresa ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I_insert_empresa ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I_update_empresa ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I_delete_empresa ON public.%I', t, t);
    EXECUTE format('CREATE POLICY %I_select_empresa ON public.%I FOR SELECT USING (empresa_id = public.get_empresa_id() OR COALESCE(public.is_master_admin(), false))', t, t);
    EXECUTE format('CREATE POLICY %I_insert_empresa ON public.%I FOR INSERT WITH CHECK (empresa_id = public.get_empresa_id() OR COALESCE(public.is_master_admin(), false))', t, t);
    EXECUTE format('CREATE POLICY %I_update_empresa ON public.%I FOR UPDATE USING (empresa_id = public.get_empresa_id() OR COALESCE(public.is_master_admin(), false)) WITH CHECK (empresa_id = public.get_empresa_id() OR COALESCE(public.is_master_admin(), false))', t, t);
    EXECUTE format('CREATE POLICY %I_delete_empresa ON public.%I FOR DELETE USING (empresa_id = public.get_empresa_id() OR COALESCE(public.is_master_admin(), false))', t, t);
  END LOOP;
END $$;

-- 3) RPC transacional de venda completa.
CREATE OR REPLACE FUNCTION public.vf_registrar_venda_completa_v12(p_payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_empresa UUID := public.get_empresa_id();
  v_venda JSONB := COALESCE(p_payload->'venda', '{}'::jsonb);
  v_itens JSONB := COALESCE(p_payload->'itens', '[]'::jsonb);
  v_pagamentos JSONB := COALESCE(p_payload->'pagamentos', '[]'::jsonb);
  v_id UUID;
  v_item JSONB;
  v_pag JSONB;
  v_result JSONB;
BEGIN
  IF v_empresa IS NULL THEN RAISE EXCEPTION 'Empresa não localizada para a venda.'; END IF;
  IF jsonb_array_length(v_itens) = 0 THEN RAISE EXCEPTION 'Venda sem itens.'; END IF;

  INSERT INTO public.vendas (
    empresa_id, cliente_id, produto_id, produto_nome, quantidade, preco_unitario, custo_unitario,
    subtotal, desconto, desconto_geral, taxa_entrega, taxa_servico, total, lucro, canal, forma_pagamento,
    cliente_nome, cliente_whatsapp, observacoes, status, status_entrega, valor_recebido, troco, data_venda
  ) VALUES (
    v_empresa,
    NULLIF(v_venda->>'cliente_id','')::uuid,
    NULLIF(v_venda->>'produto_id','')::uuid,
    COALESCE(v_venda->>'produto_nome','Venda'),
    GREATEST(1, ROUND(COALESCE(NULLIF(v_venda->>'quantidade','')::numeric, 1)))::integer,
    COALESCE(NULLIF(v_venda->>'preco_unitario','')::numeric, 0),
    COALESCE(NULLIF(v_venda->>'custo_unitario','')::numeric, 0),
    COALESCE(NULLIF(v_venda->>'subtotal','')::numeric, 0),
    COALESCE(NULLIF(v_venda->>'desconto','')::numeric, 0),
    COALESCE(NULLIF(v_venda->>'desconto_geral','')::numeric, 0),
    COALESCE(NULLIF(v_venda->>'taxa_entrega','')::numeric, 0),
    COALESCE(NULLIF(v_venda->>'taxa_servico','')::numeric, 0),
    COALESCE(NULLIF(v_venda->>'total','')::numeric, 0),
    COALESCE(NULLIF(v_venda->>'lucro','')::numeric, 0),
    COALESCE(v_venda->>'canal','local'),
    COALESCE(v_venda->>'forma_pagamento','pix'),
    NULLIF(v_venda->>'cliente_nome',''),
    NULLIF(v_venda->>'cliente_whatsapp',''),
    NULLIF(v_venda->>'observacoes',''),
    COALESCE(v_venda->>'status','realizada'),
    COALESCE(v_venda->>'status_entrega','pendente'),
    COALESCE(NULLIF(v_venda->>'valor_recebido','')::numeric, 0),
    COALESCE(NULLIF(v_venda->>'troco','')::numeric, 0),
    COALESCE(NULLIF(v_venda->>'data_venda','')::date, CURRENT_DATE)
  ) RETURNING id INTO v_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(v_itens) LOOP
    INSERT INTO public.venda_itens (empresa_id, venda_id, produto_id, produto_nome, quantidade, preco_unitario, custo_unitario, desconto, subtotal, total, lucro)
    VALUES (v_empresa, v_id, NULLIF(v_item->>'produto_id','')::uuid, COALESCE(v_item->>'produto_nome','Item'), COALESCE(NULLIF(v_item->>'quantidade','')::numeric,1), COALESCE(NULLIF(v_item->>'preco_unitario','')::numeric,0), COALESCE(NULLIF(v_item->>'custo_unitario','')::numeric,0), COALESCE(NULLIF(v_item->>'desconto','')::numeric,0), COALESCE(NULLIF(v_item->>'subtotal','')::numeric,0), COALESCE(NULLIF(v_item->>'total','')::numeric,0), COALESCE(NULLIF(v_item->>'lucro','')::numeric,0));

    IF NULLIF(v_item->>'produto_id','') IS NOT NULL THEN
      UPDATE public.produto_estoque
         SET quantidade_atual = GREATEST(0, quantidade_atual - COALESCE(NULLIF(v_item->>'quantidade','')::numeric, 0)), updated_at = now()
       WHERE empresa_id = v_empresa AND produto_id = NULLIF(v_item->>'produto_id','')::uuid;
      INSERT INTO public.movimentacoes_produto_estoque (empresa_id, produto_id, tipo, quantidade, custo_unitario, custo_total, motivo, documento, usuario_id)
      VALUES (v_empresa, NULLIF(v_item->>'produto_id','')::uuid, 'saida', COALESCE(NULLIF(v_item->>'quantidade','')::numeric, 0), COALESCE(NULLIF(v_item->>'custo_unitario','')::numeric,0), COALESCE(NULLIF(v_item->>'custo_unitario','')::numeric,0) * COALESCE(NULLIF(v_item->>'quantidade','')::numeric,0), 'Baixa automática por venda transacional V12', 'venda:' || v_id::text, auth.uid());
    END IF;
  END LOOP;

  FOR v_pag IN SELECT * FROM jsonb_array_elements(v_pagamentos) LOOP
    INSERT INTO public.venda_pagamentos (empresa_id, venda_id, forma_pagamento, valor, valor_recebido, troco, data_recebimento, status)
    VALUES (v_empresa, v_id, COALESCE(v_pag->>'forma_pagamento','pix'), COALESCE(NULLIF(v_pag->>'valor','')::numeric,0), COALESCE(NULLIF(v_pag->>'valor_recebido','')::numeric, COALESCE(NULLIF(v_pag->>'valor','')::numeric,0)), COALESCE(NULLIF(v_pag->>'troco','')::numeric,0), COALESCE(NULLIF(v_pag->>'data_recebimento','')::date, CURRENT_DATE), COALESCE(v_pag->>'status','confirmado'));
  END LOOP;

  INSERT INTO public.lancamentos_financeiros (empresa_id, tipo, descricao, categoria, valor, data_vencimento, data_pagamento, forma_pagamento, status, origem, origem_id, observacoes)
  SELECT v_empresa, 'receita', 'Venda #' || COALESCE((SELECT numero::text FROM public.vendas WHERE id = v_id), v_id::text), 'Vendas', COALESCE(NULLIF(v_venda->>'total','')::numeric,0), COALESCE(NULLIF(v_venda->>'data_venda','')::date, CURRENT_DATE), COALESCE(NULLIF(v_venda->>'data_venda','')::date, CURRENT_DATE), COALESCE(v_venda->>'forma_pagamento','pix'), 'pago', 'venda', v_id, 'Lançamento automático transacional V12'
  WHERE NOT EXISTS (SELECT 1 FROM public.lancamentos_financeiros WHERE empresa_id = v_empresa AND origem = 'venda' AND origem_id = v_id);

  INSERT INTO public.venda_status_historico (empresa_id, venda_id, status_anterior, status_novo, motivo, usuario_id)
  VALUES (v_empresa, v_id, NULL, 'realizada', 'Venda registrada transacionalmente pela V12', auth.uid());

  INSERT INTO public.logs_auditoria (empresa_id, usuario_id, acao, entidade, entidade_id, detalhes)
  VALUES (v_empresa, auth.uid(), 'vendas.criar.transacional.v12', 'vendas', v_id, jsonb_build_object('total', v_venda->>'total', 'itens', jsonb_array_length(v_itens), 'pagamentos', jsonb_array_length(v_pagamentos)));

  SELECT to_jsonb(v.*) || jsonb_build_object('itens', COALESCE((SELECT jsonb_agg(to_jsonb(i.*)) FROM public.venda_itens i WHERE i.venda_id = v_id), '[]'::jsonb), 'pagamentos', COALESCE((SELECT jsonb_agg(to_jsonb(p.*)) FROM public.venda_pagamentos p WHERE p.venda_id = v_id), '[]'::jsonb)) INTO v_result FROM public.vendas v WHERE v.id = v_id;
  RETURN v_result;
END;
$$;

-- 4) RPC transacional para nota/abastecimento básico.
CREATE OR REPLACE FUNCTION public.vf_registrar_nota_abastecimento_v12(p_payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_empresa UUID := public.get_empresa_id();
  v_nota JSONB := COALESCE(p_payload->'nota', '{}'::jsonb);
  v_itens JSONB := COALESCE(p_payload->'itens', '[]'::jsonb);
  v_id UUID;
  v_item JSONB;
  v_result JSONB;
BEGIN
  IF v_empresa IS NULL THEN RAISE EXCEPTION 'Empresa não localizada para a nota.'; END IF;

  INSERT INTO public.notas_fiscais (empresa_id, numero, serie, chave_acesso, fornecedor_nome, data_emissao, data_entrada, valor_produtos, valor_frete, valor_impostos, valor_desconto, valor_total, status, observacoes, arquivo_url)
  VALUES (v_empresa, NULLIF(v_nota->>'numero',''), NULLIF(v_nota->>'serie',''), NULLIF(v_nota->>'chave_acesso',''), NULLIF(v_nota->>'fornecedor_nome',''), NULLIF(v_nota->>'data_emissao','')::date, COALESCE(NULLIF(v_nota->>'data_entrada','')::date, CURRENT_DATE), COALESCE(NULLIF(v_nota->>'valor_produtos','')::numeric,0), COALESCE(NULLIF(v_nota->>'valor_frete','')::numeric,0), COALESCE(NULLIF(v_nota->>'valor_impostos','')::numeric,0), COALESCE(NULLIF(v_nota->>'valor_desconto','')::numeric,0), COALESCE(NULLIF(v_nota->>'valor_total','')::numeric,0), COALESCE(v_nota->>'status','importada'), NULLIF(v_nota->>'observacoes',''), NULLIF(v_nota->>'arquivo_url',''))
  RETURNING id INTO v_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(v_itens) LOOP
    INSERT INTO public.nota_fiscal_itens (empresa_id, nota_id, produto_id, insumo_id, descricao, quantidade, unidade, valor_unitario, valor_total)
    VALUES (v_empresa, v_id, NULLIF(v_item->>'produto_id','')::uuid, NULLIF(v_item->>'insumo_id','')::uuid, COALESCE(v_item->>'descricao','Item'), COALESCE(NULLIF(v_item->>'quantidade','')::numeric,0), COALESCE(v_item->>'unidade','unidade'), COALESCE(NULLIF(v_item->>'valor_unitario','')::numeric,0), COALESCE(NULLIF(v_item->>'valor_total','')::numeric,0));
  END LOOP;

  INSERT INTO public.logs_auditoria (empresa_id, usuario_id, acao, entidade, entidade_id, detalhes)
  VALUES (v_empresa, auth.uid(), 'notas_fiscais.criar.transacional.v12', 'notas_fiscais', v_id, jsonb_build_object('numero', v_nota->>'numero', 'itens', jsonb_array_length(v_itens)));

  SELECT to_jsonb(n.*) || jsonb_build_object('itens', COALESCE((SELECT jsonb_agg(to_jsonb(i.*)) FROM public.nota_fiscal_itens i WHERE i.nota_id = v_id), '[]'::jsonb)) INTO v_result FROM public.notas_fiscais n WHERE n.id = v_id;
  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.vf_registrar_venda_completa_v12(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.vf_registrar_nota_abastecimento_v12(JSONB) TO authenticated;
