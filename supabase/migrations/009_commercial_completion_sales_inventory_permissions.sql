-- ============================================================
-- VF Nexus — finalização comercial do MVP SaaS
-- Vendas multi-itens, estoque por produto, caixa diário e permissões RBAC
-- ============================================================

-- 1) Vendas mais comerciais: subtotal, cliente vinculado e numeração simples por empresa.
ALTER TABLE public.vendas ADD COLUMN IF NOT EXISTS cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL;
ALTER TABLE public.vendas ADD COLUMN IF NOT EXISTS subtotal NUMERIC(12,2) DEFAULT 0;
ALTER TABLE public.vendas ADD COLUMN IF NOT EXISTS numero BIGINT;
ALTER TABLE public.vendas ADD COLUMN IF NOT EXISTS observacoes TEXT;

CREATE INDEX IF NOT EXISTS idx_vendas_empresa_data ON public.vendas(empresa_id, data_venda DESC);
CREATE INDEX IF NOT EXISTS idx_vendas_empresa_cliente ON public.vendas(empresa_id, cliente_id);

-- 2) Itens da venda: permite carrinho com vários produtos/serviços na mesma venda.
CREATE TABLE IF NOT EXISTS public.venda_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  venda_id UUID NOT NULL REFERENCES public.vendas(id) ON DELETE CASCADE,
  produto_id UUID REFERENCES public.produtos(id) ON DELETE SET NULL,
  produto_nome TEXT NOT NULL,
  quantidade NUMERIC(12,3) NOT NULL DEFAULT 1,
  preco_unitario NUMERIC(12,2) NOT NULL DEFAULT 0,
  custo_unitario NUMERIC(12,2) NOT NULL DEFAULT 0,
  desconto NUMERIC(12,2) NOT NULL DEFAULT 0,
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  lucro NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_venda_itens_empresa ON public.venda_itens(empresa_id);
CREATE INDEX IF NOT EXISTS idx_venda_itens_venda ON public.venda_itens(venda_id);
CREATE INDEX IF NOT EXISTS idx_venda_itens_produto ON public.venda_itens(produto_id);

ALTER TABLE public.venda_itens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS venda_itens_select_empresa ON public.venda_itens;
CREATE POLICY venda_itens_select_empresa ON public.venda_itens FOR SELECT USING (empresa_id = public.get_empresa_id());
DROP POLICY IF EXISTS venda_itens_insert_empresa ON public.venda_itens;
CREATE POLICY venda_itens_insert_empresa ON public.venda_itens FOR INSERT WITH CHECK (empresa_id = public.get_empresa_id());
DROP POLICY IF EXISTS venda_itens_update_empresa ON public.venda_itens;
CREATE POLICY venda_itens_update_empresa ON public.venda_itens FOR UPDATE USING (empresa_id = public.get_empresa_id()) WITH CHECK (empresa_id = public.get_empresa_id());
DROP POLICY IF EXISTS venda_itens_delete_empresa ON public.venda_itens;
CREATE POLICY venda_itens_delete_empresa ON public.venda_itens FOR DELETE USING (empresa_id = public.get_empresa_id());

-- 3) Estoque de produtos finais para varejo/serviços híbridos.
CREATE TABLE IF NOT EXISTS public.produto_estoque (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  produto_id UUID NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
  quantidade_atual NUMERIC(12,3) NOT NULL DEFAULT 0,
  estoque_minimo NUMERIC(12,3) NOT NULL DEFAULT 0,
  localizacao TEXT,
  custo_medio NUMERIC(12,2) DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, produto_id)
);

CREATE TABLE IF NOT EXISTS public.movimentacoes_produto_estoque (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  produto_id UUID NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('entrada','saida','ajuste','perda','transferencia')),
  quantidade NUMERIC(12,3) NOT NULL,
  custo_unitario NUMERIC(12,2),
  custo_total NUMERIC(12,2),
  motivo TEXT,
  documento TEXT,
  usuario_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_produto_estoque_empresa ON public.produto_estoque(empresa_id);
CREATE INDEX IF NOT EXISTS idx_produto_estoque_produto ON public.produto_estoque(produto_id);
CREATE INDEX IF NOT EXISTS idx_mov_prod_estoque_empresa ON public.movimentacoes_produto_estoque(empresa_id, created_at DESC);

ALTER TABLE public.produto_estoque ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimentacoes_produto_estoque ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS produto_estoque_select_empresa ON public.produto_estoque;
CREATE POLICY produto_estoque_select_empresa ON public.produto_estoque FOR SELECT USING (empresa_id = public.get_empresa_id());
DROP POLICY IF EXISTS produto_estoque_insert_empresa ON public.produto_estoque;
CREATE POLICY produto_estoque_insert_empresa ON public.produto_estoque FOR INSERT WITH CHECK (empresa_id = public.get_empresa_id());
DROP POLICY IF EXISTS produto_estoque_update_empresa ON public.produto_estoque;
CREATE POLICY produto_estoque_update_empresa ON public.produto_estoque FOR UPDATE USING (empresa_id = public.get_empresa_id()) WITH CHECK (empresa_id = public.get_empresa_id());
DROP POLICY IF EXISTS produto_estoque_delete_empresa ON public.produto_estoque;
CREATE POLICY produto_estoque_delete_empresa ON public.produto_estoque FOR DELETE USING (empresa_id = public.get_empresa_id());

DROP POLICY IF EXISTS mov_prod_estoque_select_empresa ON public.movimentacoes_produto_estoque;
CREATE POLICY mov_prod_estoque_select_empresa ON public.movimentacoes_produto_estoque FOR SELECT USING (empresa_id = public.get_empresa_id());
DROP POLICY IF EXISTS mov_prod_estoque_insert_empresa ON public.movimentacoes_produto_estoque;
CREATE POLICY mov_prod_estoque_insert_empresa ON public.movimentacoes_produto_estoque FOR INSERT WITH CHECK (empresa_id = public.get_empresa_id());

-- Mantém o saldo de estoque de produto atualizado por trigger.
CREATE OR REPLACE FUNCTION public.aplicar_movimentacao_produto_estoque()
RETURNS TRIGGER AS $$
DECLARE
  fator NUMERIC := 0;
BEGIN
  IF NEW.tipo IN ('entrada','ajuste') THEN
    fator := 1;
  ELSIF NEW.tipo IN ('saida','perda','transferencia') THEN
    fator := -1;
  END IF;

  INSERT INTO public.produto_estoque (empresa_id, produto_id, quantidade_atual, custo_medio, updated_at)
  VALUES (NEW.empresa_id, NEW.produto_id, GREATEST(0, NEW.quantidade * fator), COALESCE(NEW.custo_unitario, 0), now())
  ON CONFLICT (empresa_id, produto_id)
  DO UPDATE SET
    quantidade_atual = GREATEST(0, public.produto_estoque.quantidade_atual + (NEW.quantidade * fator)),
    custo_medio = CASE WHEN NEW.tipo = 'entrada' AND COALESCE(NEW.custo_unitario, 0) > 0 THEN NEW.custo_unitario ELSE public.produto_estoque.custo_medio END,
    updated_at = now();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_aplicar_mov_prod_estoque ON public.movimentacoes_produto_estoque;
CREATE TRIGGER trg_aplicar_mov_prod_estoque
AFTER INSERT ON public.movimentacoes_produto_estoque
FOR EACH ROW EXECUTE FUNCTION public.aplicar_movimentacao_produto_estoque();

-- 4) Caixa/fechamento mais forte para operação diária.
CREATE TABLE IF NOT EXISTS public.caixas_diarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  data_caixa DATE NOT NULL,
  saldo_inicial NUMERIC(12,2) NOT NULL DEFAULT 0,
  dinheiro NUMERIC(12,2) NOT NULL DEFAULT 0,
  pix NUMERIC(12,2) NOT NULL DEFAULT 0,
  cartao_credito NUMERIC(12,2) NOT NULL DEFAULT 0,
  cartao_debito NUMERIC(12,2) NOT NULL DEFAULT 0,
  outros NUMERIC(12,2) NOT NULL DEFAULT 0,
  sangrias NUMERIC(12,2) NOT NULL DEFAULT 0,
  suprimentos NUMERIC(12,2) NOT NULL DEFAULT 0,
  saldo_final NUMERIC(12,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto','fechado','reaberto')),
  observacoes TEXT,
  usuario_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, data_caixa)
);

ALTER TABLE public.caixas_diarios ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS caixas_select_empresa ON public.caixas_diarios;
CREATE POLICY caixas_select_empresa ON public.caixas_diarios FOR SELECT USING (empresa_id = public.get_empresa_id());
DROP POLICY IF EXISTS caixas_insert_empresa ON public.caixas_diarios;
CREATE POLICY caixas_insert_empresa ON public.caixas_diarios FOR INSERT WITH CHECK (empresa_id = public.get_empresa_id());
DROP POLICY IF EXISTS caixas_update_empresa ON public.caixas_diarios;
CREATE POLICY caixas_update_empresa ON public.caixas_diarios FOR UPDATE USING (empresa_id = public.get_empresa_id()) WITH CHECK (empresa_id = public.get_empresa_id());

-- 5) RBAC inicial: base para permissões reais por colaborador/cargo.
CREATE TABLE IF NOT EXISTS public.permissoes_equipe (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  equipe_usuario_id UUID REFERENCES public.equipe_usuarios(id) ON DELETE CASCADE,
  cargo TEXT,
  modulo TEXT NOT NULL,
  acao TEXT NOT NULL CHECK (acao IN ('ver','criar','editar','excluir','exportar','administrar')),
  permitido BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, equipe_usuario_id, cargo, modulo, acao)
);

ALTER TABLE public.permissoes_equipe ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS permissoes_select_empresa ON public.permissoes_equipe;
CREATE POLICY permissoes_select_empresa ON public.permissoes_equipe FOR SELECT USING (empresa_id = public.get_empresa_id());
DROP POLICY IF EXISTS permissoes_write_empresa ON public.permissoes_equipe;
CREATE POLICY permissoes_write_empresa ON public.permissoes_equipe FOR ALL USING (empresa_id = public.get_empresa_id()) WITH CHECK (empresa_id = public.get_empresa_id());

-- 6) Módulos finais ativáveis por setor.
INSERT INTO public.setor_modulos (tipo_empresa, modulo, ativo, ordem)
SELECT e.tipo, m.modulo, m.ativo, m.ordem
FROM (SELECT DISTINCT tipo FROM public.empresas UNION SELECT 'outro') e
CROSS JOIN (VALUES
  ('caixa', true, 18),
  ('permissoes', true, 19)
) AS m(modulo, ativo, ordem)
ON CONFLICT (tipo_empresa, modulo) DO NOTHING;
