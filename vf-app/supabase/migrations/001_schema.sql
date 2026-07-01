-- ============================================================
-- VF APP — SCHEMA COMPLETO PARA SUPABASE
-- Execute este arquivo inteiro no SQL Editor do Supabase.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABELAS BASE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.empresas (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome          TEXT NOT NULL,
  tipo          TEXT NOT NULL DEFAULT 'restaurante' CHECK (tipo IN ('restaurante','bar','hamburgueria','delivery','buffet','cafeteria','lanchonete','outro')),
  cnpj          TEXT,
  telefone      TEXT,
  email         TEXT,
  endereco      TEXT,
  logo_url      TEXT,
  cor_primaria  TEXT DEFAULT '#C9A84C',
  cor_secundaria TEXT DEFAULT '#E2C070',
  cor_fundo     TEXT DEFAULT '#0A0A0A',
  cor_texto     TEXT DEFAULT '#F5F0E8',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.perfis (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  empresa_id    UUID REFERENCES public.empresas(id) ON DELETE SET NULL,
  nome          TEXT,
  avatar_url    TEXT,
  plano         TEXT DEFAULT 'free' CHECK (plano IN ('free','pro','enterprise')),
  is_master     BOOLEAN DEFAULT FALSE,
  bloqueado     BOOLEAN DEFAULT FALSE,
  motivo_bloqueio TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.categorias_insumos (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id  UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome        TEXT NOT NULL,
  icone       TEXT DEFAULT 'package',
  cor         TEXT DEFAULT '#C9A84C',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.fornecedores (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id  UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome        TEXT NOT NULL,
  telefone    TEXT,
  whatsapp    TEXT,
  email       TEXT,
  cnpj        TEXT,
  endereco    TEXT,
  observacoes TEXT,
  ativo       BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.insumos (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id            UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  categoria_id          UUID REFERENCES public.categorias_insumos(id) ON DELETE SET NULL,
  fornecedor_id         UUID REFERENCES public.fornecedores(id) ON DELETE SET NULL,
  nome                  TEXT NOT NULL,
  descricao             TEXT,
  unidade_compra        TEXT NOT NULL CHECK (unidade_compra IN ('kg','g','litro','ml','unidade','caixa','fardo','duzia')),
  quantidade_compra     NUMERIC(12,4) NOT NULL CHECK (quantidade_compra > 0),
  valor_compra          NUMERIC(12,2) NOT NULL CHECK (valor_compra >= 0),
  custo_por_kg          NUMERIC(12,4),
  custo_por_grama       NUMERIC(12,6),
  custo_por_litro       NUMERIC(12,4),
  custo_por_ml          NUMERIC(12,6),
  custo_por_unidade     NUMERIC(12,4),
  estoque_atual         NUMERIC(12,4) DEFAULT 0,
  estoque_minimo        NUMERIC(12,4) DEFAULT 0,
  estoque_ideal         NUMERIC(12,4) DEFAULT 0,
  data_vencimento       DATE,
  ativo                 BOOLEAN DEFAULT TRUE,
  data_ultima_compra    DATE DEFAULT CURRENT_DATE,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.produtos (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id         UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome               TEXT NOT NULL,
  descricao          TEXT,
  categoria          TEXT NOT NULL DEFAULT 'prato' CHECK (categoria IN ('prato','drink','lanche','sobremesa','bebida','cafe','entrada','outro')),
  foto_url           TEXT,
  tempo_preparo_min  INTEGER DEFAULT 0,
  rendimento         NUMERIC(8,2) DEFAULT 1,
  unidade_rendimento TEXT DEFAULT 'porção',
  modo_preparo       TEXT,
  custo_total        NUMERIC(12,2) DEFAULT 0,
  margem_aplicada    NUMERIC(8,2) DEFAULT 300,
  preco_venda        NUMERIC(12,2),
  preco_manual       BOOLEAN DEFAULT FALSE,
  preco_minimo       NUMERIC(12,2),
  preco_premium      NUMERIC(12,2),
  cmv_percentual     NUMERIC(8,2),
  margem_bruta       NUMERIC(8,2),
  lucro_bruto        NUMERIC(12,2),
  ativo              BOOLEAN DEFAULT TRUE,
  destaque           BOOLEAN DEFAULT FALSE,
  disponivel         BOOLEAN DEFAULT TRUE,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ficha_tecnica (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  produto_id      UUID NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
  insumo_id       UUID NOT NULL REFERENCES public.insumos(id) ON DELETE RESTRICT,
  quantidade      NUMERIC(12,4) NOT NULL CHECK (quantidade > 0),
  unidade         TEXT NOT NULL CHECK (unidade IN ('kg','g','litro','ml','unidade')),
  custo_calculado NUMERIC(12,4),
  observacao      TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(produto_id, insumo_id)
);

CREATE TABLE IF NOT EXISTS public.movimentacoes_estoque (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id      UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  insumo_id       UUID NOT NULL REFERENCES public.insumos(id) ON DELETE RESTRICT,
  tipo            TEXT NOT NULL CHECK (tipo IN ('entrada','saida','ajuste','perda','transferencia')),
  quantidade      NUMERIC(12,4) NOT NULL CHECK (quantidade >= 0),
  unidade         TEXT NOT NULL,
  custo_unitario  NUMERIC(12,4),
  custo_total     NUMERIC(12,2),
  motivo          TEXT,
  documento       TEXT,
  usuario_id      UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.vendas (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id      UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  produto_id      UUID REFERENCES public.produtos(id) ON DELETE SET NULL,
  produto_nome    TEXT NOT NULL,
  quantidade      INTEGER NOT NULL DEFAULT 1 CHECK (quantidade > 0),
  preco_unitario  NUMERIC(12,2) NOT NULL,
  custo_unitario  NUMERIC(12,2) NOT NULL,
  desconto        NUMERIC(12,2) DEFAULT 0,
  total           NUMERIC(12,2) NOT NULL,
  lucro           NUMERIC(12,2) NOT NULL,
  canal           TEXT DEFAULT 'local' CHECK (canal IN ('local','delivery','ifood','rappi','whatsapp','evento')),
  data_venda      DATE NOT NULL DEFAULT CURRENT_DATE,
  hora_venda      TIME DEFAULT NOW()::TIME,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.configuracoes (
  id                         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id                 UUID NOT NULL UNIQUE REFERENCES public.empresas(id) ON DELETE CASCADE,
  margem_minima              NUMERIC(8,2) DEFAULT 200,
  margem_ideal               NUMERIC(8,2) DEFAULT 300,
  margem_premium             NUMERIC(8,2) DEFAULT 400,
  cmv_meta                   NUMERIC(8,2) DEFAULT 30,
  moeda                      TEXT DEFAULT 'BRL',
  fuso_horario               TEXT DEFAULT 'America/Sao_Paulo',
  dias_alerta_vencimento     INTEGER DEFAULT 3,
  percentual_alerta_estoque  NUMERIC(8,2) DEFAULT 20,
  custo_fixo_mensal          NUMERIC(12,2) DEFAULT 0,
  percentual_impostos        NUMERIC(8,2) DEFAULT 0,
  taxa_cartao_percentual     NUMERIC(8,2) DEFAULT 0,
  taxa_delivery_percentual   NUMERIC(8,2) DEFAULT 0,
  cor_primaria               TEXT DEFAULT '#C9A84C',
  cor_secundaria             TEXT DEFAULT '#E2C070',
  cor_fundo                  TEXT DEFAULT '#0A0A0A',
  cor_texto                  TEXT DEFAULT '#F5F0E8',
  updated_at                 TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.eventos (
  id                              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id                      UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome                            TEXT NOT NULL,
  tipo_evento                     TEXT NOT NULL DEFAULT 'outro' CHECK (tipo_evento IN ('aniversario','casamento','corporativo','confraternizacao','buffet','delivery','outro')),
  data_evento                     DATE,
  pessoas                         INTEGER NOT NULL DEFAULT 1 CHECK (pessoas > 0),
  margem_lucro                    NUMERIC(8,2) NOT NULL DEFAULT 200,
  taxa_operacional_percentual     NUMERIC(8,2) NOT NULL DEFAULT 0,
  custo_operacional_extra         NUMERIC(12,2) NOT NULL DEFAULT 0,
  desconto                        NUMERIC(12,2) NOT NULL DEFAULT 0,
  custo_produtos                  NUMERIC(12,2) NOT NULL DEFAULT 0,
  custo_total                     NUMERIC(12,2) NOT NULL DEFAULT 0,
  preco_sugerido                  NUMERIC(12,2) NOT NULL DEFAULT 0,
  preco_por_pessoa                NUMERIC(12,2) NOT NULL DEFAULT 0,
  lucro_estimado                  NUMERIC(12,2) NOT NULL DEFAULT 0,
  cmv_percentual                  NUMERIC(8,2) NOT NULL DEFAULT 0,
  observacoes                     TEXT,
  status                          TEXT NOT NULL DEFAULT 'orcamento' CHECK (status IN ('orcamento','aprovado','realizado','cancelado')),
  created_at                      TIMESTAMPTZ DEFAULT NOW(),
  updated_at                      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.evento_itens (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  evento_id             UUID NOT NULL REFERENCES public.eventos(id) ON DELETE CASCADE,
  produto_id            UUID NOT NULL REFERENCES public.produtos(id) ON DELETE RESTRICT,
  produto_nome          TEXT NOT NULL,
  categoria             TEXT,
  rendimento_unitario   NUMERIC(12,4) NOT NULL DEFAULT 1,
  unidade_rendimento    TEXT NOT NULL DEFAULT 'porções',
  consumo_por_pessoa    NUMERIC(12,4) NOT NULL DEFAULT 1,
  quantidade_produtos   NUMERIC(12,4) NOT NULL DEFAULT 0,
  rendimento_total      NUMERIC(12,4) NOT NULL DEFAULT 0,
  sobra_estimada        NUMERIC(12,4) NOT NULL DEFAULT 0,
  custo_unitario        NUMERIC(12,4) NOT NULL DEFAULT 0,
  preco_unitario_base   NUMERIC(12,2) NOT NULL DEFAULT 0,
  custo_total           NUMERIC(12,2) NOT NULL DEFAULT 0,
  receita_sugerida      NUMERIC(12,2) NOT NULL DEFAULT 0,
  observacoes           TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);



CREATE TABLE IF NOT EXISTS public.cardapios (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id  UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome        TEXT NOT NULL,
  descricao   TEXT,
  ativo       BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.cardapio_itens (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id          UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  cardapio_id         UUID NOT NULL REFERENCES public.cardapios(id) ON DELETE CASCADE,
  produto_id          UUID NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
  categoria           TEXT,
  descricao_cardapio  TEXT,
  ordem               INTEGER DEFAULT 0,
  exibir              BOOLEAN DEFAULT TRUE,
  destaque            BOOLEAN DEFAULT FALSE,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(cardapio_id, produto_id)
);

CREATE TABLE IF NOT EXISTS public.promocoes (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id            UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  produto_id            UUID NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
  nome                  TEXT NOT NULL,
  descricao             TEXT,
  preco_promocional     NUMERIC(12,2) NOT NULL CHECK (preco_promocional >= 0),
  desconto_percentual   NUMERIC(6,2),
  data_inicio           DATE,
  data_fim              DATE,
  status                TEXT NOT NULL DEFAULT 'ativa' CHECK (status IN ('ativa','agendada','expirada','pausada')),
  exibir_cardapio       BOOLEAN DEFAULT TRUE,
  destaque              BOOLEAN DEFAULT FALSE,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),
  CHECK (data_fim IS NULL OR data_inicio IS NULL OR data_fim >= data_inicio)
);



CREATE TABLE IF NOT EXISTS public.despesas (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id    UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome          TEXT NOT NULL,
  tipo          TEXT NOT NULL DEFAULT 'fixa' CHECK (tipo IN ('fixa','variavel','imposto','mao_de_obra','entrega','outro')),
  valor         NUMERIC(12,2) NOT NULL DEFAULT 0,
  recorrencia   TEXT NOT NULL DEFAULT 'mensal' CHECK (recorrencia IN ('mensal','semanal','diaria','eventual')),
  percentual    NUMERIC(8,2),
  ativa         BOOLEAN DEFAULT TRUE,
  observacoes   TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.assinaturas (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id        UUID NOT NULL UNIQUE REFERENCES public.empresas(id) ON DELETE CASCADE,
  tipo              TEXT NOT NULL DEFAULT 'mensal' CHECK (tipo IN ('mensal','vitalicia')),
  status            TEXT NOT NULL DEFAULT 'ativa' CHECK (status IN ('ativa','vencida','bloqueada','cancelada')),
  valor             NUMERIC(12,2) NOT NULL DEFAULT 0,
  data_inicio       DATE NOT NULL DEFAULT CURRENT_DATE,
  proxima_cobranca  DATE,
  data_vitalicia    DATE,
  observacoes       TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.master_admins (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL UNIQUE,
  nome        TEXT,
  ativo       BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.master_admins ADD COLUMN IF NOT EXISTS user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_master_admins_user_id ON public.master_admins(user_id) WHERE ativo = TRUE;

-- Colunas novas para projetos já existentes
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS cor_primaria TEXT DEFAULT '#C9A84C';
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS cor_secundaria TEXT DEFAULT '#E2C070';
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS cor_fundo TEXT DEFAULT '#0A0A0A';
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS cor_texto TEXT DEFAULT '#F5F0E8';
ALTER TABLE public.perfis ADD COLUMN IF NOT EXISTS is_master BOOLEAN DEFAULT FALSE;
ALTER TABLE public.perfis ADD COLUMN IF NOT EXISTS bloqueado BOOLEAN DEFAULT FALSE;
ALTER TABLE public.perfis ADD COLUMN IF NOT EXISTS motivo_bloqueio TEXT;
ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS preco_manual BOOLEAN DEFAULT FALSE;
ALTER TABLE public.configuracoes ADD COLUMN IF NOT EXISTS custo_fixo_mensal NUMERIC(12,2) DEFAULT 0;
ALTER TABLE public.configuracoes ADD COLUMN IF NOT EXISTS percentual_impostos NUMERIC(8,2) DEFAULT 0;
ALTER TABLE public.configuracoes ADD COLUMN IF NOT EXISTS taxa_cartao_percentual NUMERIC(8,2) DEFAULT 0;
ALTER TABLE public.configuracoes ADD COLUMN IF NOT EXISTS taxa_delivery_percentual NUMERIC(8,2) DEFAULT 0;
ALTER TABLE public.configuracoes ADD COLUMN IF NOT EXISTS cor_primaria TEXT DEFAULT '#C9A84C';
ALTER TABLE public.configuracoes ADD COLUMN IF NOT EXISTS cor_secundaria TEXT DEFAULT '#E2C070';
ALTER TABLE public.configuracoes ADD COLUMN IF NOT EXISTS cor_fundo TEXT DEFAULT '#0A0A0A';
ALTER TABLE public.configuracoes ADD COLUMN IF NOT EXISTS cor_texto TEXT DEFAULT '#F5F0E8';

-- ============================================================
-- FUNÇÕES E TRIGGERS DE CÁLCULO
-- ============================================================

CREATE OR REPLACE FUNCTION public.calcular_custos_insumo()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  custo_base NUMERIC;
BEGIN
  custo_base := COALESCE(NEW.valor_compra, 0) / NULLIF(NEW.quantidade_compra, 0);

  NEW.custo_por_kg := NULL;
  NEW.custo_por_grama := NULL;
  NEW.custo_por_litro := NULL;
  NEW.custo_por_ml := NULL;
  NEW.custo_por_unidade := NULL;

  CASE NEW.unidade_compra
    WHEN 'kg' THEN
      NEW.custo_por_kg := custo_base;
      NEW.custo_por_grama := custo_base / 1000;
    WHEN 'g' THEN
      NEW.custo_por_grama := custo_base;
      NEW.custo_por_kg := custo_base * 1000;
    WHEN 'litro' THEN
      NEW.custo_por_litro := custo_base;
      NEW.custo_por_ml := custo_base / 1000;
    WHEN 'ml' THEN
      NEW.custo_por_ml := custo_base;
      NEW.custo_por_litro := custo_base * 1000;
    WHEN 'duzia' THEN
      NEW.custo_por_unidade := custo_base / 12;
    ELSE
      NEW.custo_por_unidade := custo_base;
  END CASE;

  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_calcular_custos_insumo ON public.insumos;
CREATE TRIGGER trg_calcular_custos_insumo
  BEFORE INSERT OR UPDATE OF unidade_compra, quantidade_compra, valor_compra ON public.insumos
  FOR EACH ROW EXECUTE FUNCTION public.calcular_custos_insumo();

CREATE OR REPLACE FUNCTION public.calcular_custo_ficha()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  ins RECORD;
BEGIN
  SELECT * INTO ins FROM public.insumos WHERE id = NEW.insumo_id;

  CASE NEW.unidade
    WHEN 'kg'     THEN NEW.custo_calculado := COALESCE(ins.custo_por_kg, 0) * NEW.quantidade;
    WHEN 'g'      THEN NEW.custo_calculado := COALESCE(ins.custo_por_grama, 0) * NEW.quantidade;
    WHEN 'litro'  THEN NEW.custo_calculado := COALESCE(ins.custo_por_litro, 0) * NEW.quantidade;
    WHEN 'ml'     THEN NEW.custo_calculado := COALESCE(ins.custo_por_ml, 0) * NEW.quantidade;
    ELSE               NEW.custo_calculado := COALESCE(ins.custo_por_unidade, 0) * NEW.quantidade;
  END CASE;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_calcular_custo_ficha ON public.ficha_tecnica;
CREATE TRIGGER trg_calcular_custo_ficha
  BEFORE INSERT OR UPDATE OF insumo_id, quantidade, unidade ON public.ficha_tecnica
  FOR EACH ROW EXECUTE FUNCTION public.calcular_custo_ficha();

CREATE OR REPLACE FUNCTION public.atualizar_custo_produto()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  target_produto_id UUID;
  total NUMERIC := 0;
  prod RECORD;
  novo_preco NUMERIC := 0;
BEGIN
  target_produto_id := COALESCE(NEW.produto_id, OLD.produto_id);

  SELECT COALESCE(SUM(custo_calculado), 0)
    INTO total
  FROM public.ficha_tecnica
  WHERE produto_id = target_produto_id;

  SELECT * INTO prod FROM public.produtos WHERE id = target_produto_id;
  IF COALESCE(prod.preco_manual, FALSE) AND COALESCE(prod.preco_venda, 0) > 0 THEN
    novo_preco := prod.preco_venda;
  ELSE
    novo_preco := ROUND(total * (1 + COALESCE(prod.margem_aplicada, 300) / 100), 2);
  END IF;

  UPDATE public.produtos SET
    custo_total     = ROUND(total, 2),
    preco_venda     = novo_preco,
    preco_minimo    = ROUND(total * 2, 2),
    preco_premium   = ROUND(total * 5, 2),
    cmv_percentual  = CASE WHEN novo_preco > 0 THEN ROUND((total / novo_preco) * 100, 2) ELSE 0 END,
    lucro_bruto     = ROUND(novo_preco - total, 2),
    margem_bruta    = CASE WHEN novo_preco > 0 THEN ROUND(((novo_preco - total) / novo_preco) * 100, 2) ELSE 0 END,
    updated_at      = NOW()
  WHERE id = target_produto_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_atualizar_custo_produto ON public.ficha_tecnica;
CREATE TRIGGER trg_atualizar_custo_produto
  AFTER INSERT OR UPDATE OR DELETE ON public.ficha_tecnica
  FOR EACH ROW EXECUTE FUNCTION public.atualizar_custo_produto();

CREATE OR REPLACE FUNCTION public.atualizar_estoque()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.tipo = 'entrada' THEN
    UPDATE public.insumos SET estoque_atual = estoque_atual + NEW.quantidade, updated_at = NOW() WHERE id = NEW.insumo_id;
  ELSIF NEW.tipo IN ('saida','perda') THEN
    UPDATE public.insumos SET estoque_atual = estoque_atual - NEW.quantidade, updated_at = NOW() WHERE id = NEW.insumo_id;
  ELSIF NEW.tipo = 'ajuste' THEN
    UPDATE public.insumos SET estoque_atual = NEW.quantidade, updated_at = NOW() WHERE id = NEW.insumo_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_atualizar_estoque ON public.movimentacoes_estoque;
CREATE TRIGGER trg_atualizar_estoque
  AFTER INSERT ON public.movimentacoes_estoque
  FOR EACH ROW EXECUTE FUNCTION public.atualizar_estoque();


CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['empresas','perfis','fornecedores','insumos','produtos','configuracoes','eventos','cardapios','cardapio_itens','promocoes','despesas','assinaturas']
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_set_updated_at ON public.%I', t);
    EXECUTE format('CREATE TRIGGER trg_set_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()', t);
  END LOOP;
END $$;

-- ============================================================
-- RLS E POLÍTICAS
-- ============================================================

ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perfis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorias_insumos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fornecedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insumos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ficha_tecnica ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimentacoes_estoque ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eventos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evento_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promocoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cardapio_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cardapios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.despesas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assinaturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.master_admins ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.get_empresa_id()
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT empresa_id FROM public.perfis WHERE id = auth.uid() LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_empresa_id() TO authenticated;

CREATE OR REPLACE FUNCTION public.is_master_admin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.master_admins m
    WHERE m.ativo = TRUE
      AND (m.user_id = auth.uid() OR m.email = auth.jwt()->>'email')
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_master_admin() TO authenticated;

DROP POLICY IF EXISTS perfil_select ON public.perfis;
DROP POLICY IF EXISTS perfil_update ON public.perfis;
CREATE POLICY perfil_select ON public.perfis FOR SELECT USING (id = auth.uid());
CREATE POLICY perfil_update ON public.perfis FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS master_admins_select ON public.master_admins;
CREATE POLICY master_admins_select ON public.master_admins FOR SELECT USING (email = auth.jwt()->>'email' AND ativo = TRUE);


DROP POLICY IF EXISTS empresa_select ON public.empresas;
DROP POLICY IF EXISTS empresa_update ON public.empresas;
CREATE POLICY empresa_select ON public.empresas FOR SELECT USING (id = public.get_empresa_id());
CREATE POLICY empresa_update ON public.empresas FOR UPDATE USING (id = public.get_empresa_id()) WITH CHECK (id = public.get_empresa_id());

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['categorias_insumos','fornecedores','insumos','produtos','movimentacoes_estoque','vendas','configuracoes','eventos','cardapios','cardapio_itens','promocoes','despesas']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS select_company_data ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS insert_company_data ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS update_company_data ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS delete_company_data ON public.%I', t);

    EXECUTE format('CREATE POLICY select_company_data ON public.%I FOR SELECT USING (empresa_id = public.get_empresa_id())', t);
    EXECUTE format('CREATE POLICY insert_company_data ON public.%I FOR INSERT WITH CHECK (empresa_id = public.get_empresa_id())', t);
    EXECUTE format('CREATE POLICY update_company_data ON public.%I FOR UPDATE USING (empresa_id = public.get_empresa_id()) WITH CHECK (empresa_id = public.get_empresa_id())', t);
    EXECUTE format('CREATE POLICY delete_company_data ON public.%I FOR DELETE USING (empresa_id = public.get_empresa_id())', t);
  END LOOP;
END $$;



DROP POLICY IF EXISTS assinaturas_select ON public.assinaturas;
DROP POLICY IF EXISTS assinaturas_insert ON public.assinaturas;
DROP POLICY IF EXISTS assinaturas_update ON public.assinaturas;
DROP POLICY IF EXISTS assinaturas_delete ON public.assinaturas;
CREATE POLICY assinaturas_select ON public.assinaturas FOR SELECT USING (empresa_id = public.get_empresa_id());

DROP POLICY IF EXISTS ficha_select ON public.ficha_tecnica;
DROP POLICY IF EXISTS ficha_insert ON public.ficha_tecnica;
DROP POLICY IF EXISTS ficha_update ON public.ficha_tecnica;
DROP POLICY IF EXISTS ficha_delete ON public.ficha_tecnica;

CREATE POLICY ficha_select ON public.ficha_tecnica
  FOR SELECT USING (
    produto_id IN (SELECT id FROM public.produtos WHERE empresa_id = public.get_empresa_id())
  );

CREATE POLICY ficha_insert ON public.ficha_tecnica
  FOR INSERT WITH CHECK (
    produto_id IN (SELECT id FROM public.produtos WHERE empresa_id = public.get_empresa_id())
    AND insumo_id IN (SELECT id FROM public.insumos WHERE empresa_id = public.get_empresa_id())
  );

CREATE POLICY ficha_update ON public.ficha_tecnica
  FOR UPDATE USING (
    produto_id IN (SELECT id FROM public.produtos WHERE empresa_id = public.get_empresa_id())
  ) WITH CHECK (
    produto_id IN (SELECT id FROM public.produtos WHERE empresa_id = public.get_empresa_id())
    AND insumo_id IN (SELECT id FROM public.insumos WHERE empresa_id = public.get_empresa_id())
  );

CREATE POLICY ficha_delete ON public.ficha_tecnica
  FOR DELETE USING (
    produto_id IN (SELECT id FROM public.produtos WHERE empresa_id = public.get_empresa_id())
  );


DROP POLICY IF EXISTS evento_itens_select ON public.evento_itens;
DROP POLICY IF EXISTS evento_itens_insert ON public.evento_itens;
DROP POLICY IF EXISTS evento_itens_update ON public.evento_itens;
DROP POLICY IF EXISTS evento_itens_delete ON public.evento_itens;

CREATE POLICY evento_itens_select ON public.evento_itens
  FOR SELECT USING (
    evento_id IN (SELECT id FROM public.eventos WHERE empresa_id = public.get_empresa_id())
  );

CREATE POLICY evento_itens_insert ON public.evento_itens
  FOR INSERT WITH CHECK (
    evento_id IN (SELECT id FROM public.eventos WHERE empresa_id = public.get_empresa_id())
    AND produto_id IN (SELECT id FROM public.produtos WHERE empresa_id = public.get_empresa_id())
  );

CREATE POLICY evento_itens_update ON public.evento_itens
  FOR UPDATE USING (
    evento_id IN (SELECT id FROM public.eventos WHERE empresa_id = public.get_empresa_id())
  ) WITH CHECK (
    evento_id IN (SELECT id FROM public.eventos WHERE empresa_id = public.get_empresa_id())
    AND produto_id IN (SELECT id FROM public.produtos WHERE empresa_id = public.get_empresa_id())
  );

CREATE POLICY evento_itens_delete ON public.evento_itens
  FOR DELETE USING (
    evento_id IN (SELECT id FROM public.eventos WHERE empresa_id = public.get_empresa_id())
  );

-- ============================================================
-- BOOTSTRAP DE NOVO USUÁRIO
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  nova_empresa_id UUID;
BEGIN
  INSERT INTO public.empresas (nome, tipo, email)
  VALUES ('Minha Empresa', 'restaurante', NEW.email)
  RETURNING id INTO nova_empresa_id;

  INSERT INTO public.perfis (id, empresa_id, nome)
  VALUES (
    NEW.id,
    nova_empresa_id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  );

  INSERT INTO public.configuracoes (empresa_id) VALUES (nova_empresa_id);

  INSERT INTO public.assinaturas (empresa_id, tipo, status, valor, data_inicio, proxima_cobranca, observacoes)
  VALUES (nova_empresa_id, 'mensal', 'ativa', 0, CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days', 'Assinatura inicial criada automaticamente.');

  INSERT INTO public.cardapios (empresa_id, nome, descricao)
  VALUES (nova_empresa_id, 'Cardápio principal', 'Cardápio oficial gerado pelo VF App');

  INSERT INTO public.categorias_insumos (empresa_id, nome, icone, cor) VALUES
    (nova_empresa_id, 'Carnes', 'beef', '#D45050'),
    (nova_empresa_id, 'Vegetais', 'leaf', '#3DAA6B'),
    (nova_empresa_id, 'Laticínios', 'milk', '#E2C070'),
    (nova_empresa_id, 'Bebidas', 'coffee', '#4A8FD4'),
    (nova_empresa_id, 'Destilados', 'wine', '#9A4AD4'),
    (nova_empresa_id, 'Embalagens', 'package', '#9A9488'),
    (nova_empresa_id, 'Temperos', 'flask', '#E8B84B'),
    (nova_empresa_id, 'Outros', 'box', '#C9A84C');

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- ÍNDICES E VIEW DO DASHBOARD
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_perfis_empresa ON public.perfis(empresa_id);
CREATE INDEX IF NOT EXISTS idx_insumos_empresa ON public.insumos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_produtos_empresa ON public.produtos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_vendas_empresa_data ON public.vendas(empresa_id, data_venda DESC);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_insumo ON public.movimentacoes_estoque(insumo_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ficha_produto ON public.ficha_tecnica(produto_id);
CREATE INDEX IF NOT EXISTS idx_eventos_empresa_data ON public.eventos(empresa_id, data_evento DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_evento_itens_evento ON public.evento_itens(evento_id);
CREATE INDEX IF NOT EXISTS idx_evento_itens_produto ON public.evento_itens(produto_id);
CREATE INDEX IF NOT EXISTS idx_cardapios_empresa ON public.cardapios(empresa_id, ativo);
CREATE INDEX IF NOT EXISTS idx_cardapio_itens_cardapio ON public.cardapio_itens(cardapio_id, ordem);
CREATE INDEX IF NOT EXISTS idx_cardapio_itens_produto ON public.cardapio_itens(produto_id);
CREATE INDEX IF NOT EXISTS idx_promocoes_empresa_produto ON public.promocoes(empresa_id, produto_id, status);
CREATE INDEX IF NOT EXISTS idx_promocoes_periodo ON public.promocoes(data_inicio, data_fim, status);
CREATE INDEX IF NOT EXISTS idx_despesas_empresa ON public.despesas(empresa_id, ativa);
CREATE INDEX IF NOT EXISTS idx_assinaturas_empresa ON public.assinaturas(empresa_id, status, proxima_cobranca);
CREATE INDEX IF NOT EXISTS idx_master_admins_email ON public.master_admins(email, ativo);

CREATE OR REPLACE VIEW public.vw_dashboard
WITH (security_invoker = true)
AS
WITH produto_stats AS (
  SELECT
    empresa_id,
    COUNT(*) FILTER (WHERE ativo) AS total_produtos,
    COALESCE(AVG(margem_bruta) FILTER (WHERE ativo), 0) AS margem_media,
    COALESCE(AVG(cmv_percentual) FILTER (WHERE ativo), 0) AS cmv_medio
  FROM public.produtos
  GROUP BY empresa_id
),
insumo_stats AS (
  SELECT
    empresa_id,
    COUNT(*) FILTER (WHERE ativo) AS total_insumos,
    COUNT(*) FILTER (WHERE ativo AND estoque_atual <= estoque_minimo AND estoque_minimo > 0) AS alertas_estoque_critico,
    COUNT(*) FILTER (
      WHERE ativo
        AND data_vencimento IS NOT NULL
        AND data_vencimento <= CURRENT_DATE + INTERVAL '3 days'
        AND data_vencimento >= CURRENT_DATE
    ) AS alertas_vencimento
  FROM public.insumos
  GROUP BY empresa_id
),
venda_stats AS (
  SELECT
    empresa_id,
    COALESCE(SUM(total) FILTER (WHERE data_venda >= DATE_TRUNC('month', CURRENT_DATE)), 0) AS faturamento_mes,
    COALESCE(SUM(lucro) FILTER (WHERE data_venda >= DATE_TRUNC('month', CURRENT_DATE)), 0) AS lucro_mes
  FROM public.vendas
  GROUP BY empresa_id
)
SELECT
  e.id AS empresa_id,
  COALESCE(ps.total_produtos, 0) AS total_produtos,
  COALESCE(ins.total_insumos, 0) AS total_insumos,
  COALESCE(ps.margem_media, 0) AS margem_media,
  COALESCE(ps.cmv_medio, 0) AS cmv_medio,
  COALESCE(vs.faturamento_mes, 0) AS faturamento_mes,
  COALESCE(vs.lucro_mes, 0) AS lucro_mes,
  COALESCE(ins.alertas_estoque_critico, 0) AS alertas_estoque_critico,
  COALESCE(ins.alertas_vencimento, 0) AS alertas_vencimento
FROM public.empresas e
LEFT JOIN produto_stats ps ON ps.empresa_id = e.id
LEFT JOIN insumo_stats ins ON ins.empresa_id = e.id
LEFT JOIN venda_stats vs ON vs.empresa_id = e.id;

-- Admin master inicial; ajuste o email se desejar.
INSERT INTO public.master_admins (email, nome, ativo) VALUES ('joaomarcosgpp@hotmail.com', 'João Marcos', TRUE) ON CONFLICT (email) DO UPDATE SET ativo = EXCLUDED.ativo;

-- ============================================================
-- EXTENSÃO MULTIRRAMO / VENDAS / AGENDAMENTOS / MOBILE PWA
-- Esta seção é idempotente e pode ser executada em bancos já existentes.
-- ============================================================

ALTER TABLE public.empresas DROP CONSTRAINT IF EXISTS empresas_tipo_check;
ALTER TABLE public.empresas ADD CONSTRAINT empresas_tipo_check CHECK (tipo IN (
  'alimenticio','restaurante','bar','hamburgueria','delivery','buffet','cafeteria','lanchonete','confeitaria',
  'roupas','eletronicos','loja_variedades','prestador_servico','barbearia','fotografia','outro'
));

ALTER TABLE public.produtos DROP CONSTRAINT IF EXISTS produtos_categoria_check;
ALTER TABLE public.produtos ADD CONSTRAINT produtos_categoria_check CHECK (categoria IN (
  'prato','drink','lanche','sobremesa','bebida','cafe','entrada','produto','roupa','calcado','acessorio','eletronico',
  'servico','pacote_foto','corte','barba','doce','bolo','variado','outro'
));

ALTER TABLE public.vendas DROP CONSTRAINT IF EXISTS vendas_canal_check;
ALTER TABLE public.vendas ADD CONSTRAINT vendas_canal_check CHECK (canal IN ('local','loja','delivery','ifood','rappi','whatsapp','instagram','site','evento','servico'));

ALTER TABLE public.configuracoes ADD COLUMN IF NOT EXISTS taxa_servico_percentual NUMERIC(8,2) DEFAULT 0;
ALTER TABLE public.configuracoes ADD COLUMN IF NOT EXISTS taxa_entrega_padrao NUMERIC(12,2) DEFAULT 0;

ALTER TABLE public.vendas ADD COLUMN IF NOT EXISTS cliente_nome TEXT;
ALTER TABLE public.vendas ADD COLUMN IF NOT EXISTS cliente_whatsapp TEXT;
ALTER TABLE public.vendas ADD COLUMN IF NOT EXISTS forma_pagamento TEXT DEFAULT 'pix';
ALTER TABLE public.vendas ADD COLUMN IF NOT EXISTS taxa_entrega NUMERIC(12,2) DEFAULT 0;
ALTER TABLE public.vendas ADD COLUMN IF NOT EXISTS taxa_servico NUMERIC(12,2) DEFAULT 0;
ALTER TABLE public.vendas ADD COLUMN IF NOT EXISTS observacoes TEXT;

CREATE TABLE IF NOT EXISTS public.agendamentos (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id        UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  produto_id        UUID REFERENCES public.produtos(id) ON DELETE SET NULL,
  cliente_nome      TEXT NOT NULL,
  cliente_whatsapp  TEXT,
  cliente_email     TEXT,
  servico_nome      TEXT NOT NULL,
  descricao         TEXT,
  data_agendamento  DATE NOT NULL,
  hora_inicio       TIME NOT NULL,
  hora_fim          TIME,
  valor             NUMERIC(12,2) NOT NULL DEFAULT 0,
  desconto          NUMERIC(12,2) NOT NULL DEFAULT 0,
  taxa_servico      NUMERIC(12,2) NOT NULL DEFAULT 0,
  total             NUMERIC(12,2) NOT NULL DEFAULT 0,
  forma_pagamento   TEXT DEFAULT 'pix',
  status            TEXT NOT NULL DEFAULT 'agendado' CHECK (status IN ('agendado','confirmado','realizado','cancelado','remarcado')),
  observacoes       TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.agendamentos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS select_company_data ON public.agendamentos;
DROP POLICY IF EXISTS insert_company_data ON public.agendamentos;
DROP POLICY IF EXISTS update_company_data ON public.agendamentos;
DROP POLICY IF EXISTS delete_company_data ON public.agendamentos;
CREATE POLICY select_company_data ON public.agendamentos FOR SELECT USING (empresa_id = public.get_empresa_id());
CREATE POLICY insert_company_data ON public.agendamentos FOR INSERT WITH CHECK (empresa_id = public.get_empresa_id());
CREATE POLICY update_company_data ON public.agendamentos FOR UPDATE USING (empresa_id = public.get_empresa_id()) WITH CHECK (empresa_id = public.get_empresa_id());
CREATE POLICY delete_company_data ON public.agendamentos FOR DELETE USING (empresa_id = public.get_empresa_id());

DROP TRIGGER IF EXISTS trg_set_updated_at ON public.agendamentos;
CREATE TRIGGER trg_set_updated_at BEFORE UPDATE ON public.agendamentos FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_agendamentos_empresa_data ON public.agendamentos(empresa_id, data_agendamento, hora_inicio);
CREATE INDEX IF NOT EXISTS idx_agendamentos_status ON public.agendamentos(status, data_agendamento);

-- Receita/lucro do dashboard passam a considerar taxas e vendas de qualquer setor.
CREATE OR REPLACE VIEW public.vw_dashboard
WITH (security_invoker = true)
AS
WITH produto_stats AS (
  SELECT
    empresa_id,
    COUNT(*) FILTER (WHERE ativo) AS total_produtos,
    COALESCE(AVG(margem_bruta) FILTER (WHERE ativo), 0) AS margem_media,
    COALESCE(AVG(cmv_percentual) FILTER (WHERE ativo), 0) AS cmv_medio
  FROM public.produtos
  GROUP BY empresa_id
),
insumo_stats AS (
  SELECT
    empresa_id,
    COUNT(*) FILTER (WHERE ativo) AS total_insumos,
    COUNT(*) FILTER (WHERE ativo AND estoque_atual <= estoque_minimo AND estoque_minimo > 0) AS alertas_estoque_critico,
    COUNT(*) FILTER (
      WHERE ativo
        AND data_vencimento IS NOT NULL
        AND data_vencimento <= CURRENT_DATE + INTERVAL '3 days'
        AND data_vencimento >= CURRENT_DATE
    ) AS alertas_vencimento
  FROM public.insumos
  GROUP BY empresa_id
),
venda_stats AS (
  SELECT
    empresa_id,
    COALESCE(SUM(total) FILTER (WHERE data_venda >= DATE_TRUNC('month', CURRENT_DATE)), 0) AS faturamento_mes,
    COALESCE(SUM(lucro) FILTER (WHERE data_venda >= DATE_TRUNC('month', CURRENT_DATE)), 0) AS lucro_mes
  FROM public.vendas
  GROUP BY empresa_id
)
SELECT
  e.id AS empresa_id,
  COALESCE(ps.total_produtos, 0) AS total_produtos,
  COALESCE(ins.total_insumos, 0) AS total_insumos,
  COALESCE(ps.margem_media, 0) AS margem_media,
  COALESCE(ps.cmv_medio, 0) AS cmv_medio,
  COALESCE(vs.faturamento_mes, 0) AS faturamento_mes,
  COALESCE(vs.lucro_mes, 0) AS lucro_mes,
  COALESCE(ins.alertas_estoque_critico, 0) AS alertas_estoque_critico,
  COALESCE(ins.alertas_vencimento, 0) AS alertas_vencimento
FROM public.empresas e
LEFT JOIN produto_stats ps ON ps.empresa_id = e.id
LEFT JOIN insumo_stats ins ON ins.empresa_id = e.id
LEFT JOIN venda_stats vs ON vs.empresa_id = e.id;


-- ============================================================
-- CONTROLE DE FUNCIONALIDADES POR SETOR / RAMO
-- O administrador master edita esta tabela pelo painel Master Admin.
-- O app lê esta configuração para mostrar/ocultar telas e bloquear rotas.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.setor_modulos (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tipo_empresa  TEXT NOT NULL,
  modulo        TEXT NOT NULL,
  ativo         BOOLEAN NOT NULL DEFAULT TRUE,
  ordem         INTEGER DEFAULT 0,
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tipo_empresa, modulo)
);

ALTER TABLE public.setor_modulos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS setor_modulos_select ON public.setor_modulos;
CREATE POLICY setor_modulos_select ON public.setor_modulos FOR SELECT TO authenticated USING (TRUE);

DROP TRIGGER IF EXISTS trg_set_updated_at ON public.setor_modulos;
CREATE TRIGGER trg_set_updated_at BEFORE UPDATE ON public.setor_modulos FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_setor_modulos_tipo ON public.setor_modulos(tipo_empresa, ordem);

INSERT INTO public.setor_modulos (tipo_empresa, modulo, ativo, ordem) VALUES
  ('alimenticio','dashboard',TRUE,0),
  ('alimenticio','produtos',TRUE,1),
  ('alimenticio','vendas',TRUE,2),
  ('alimenticio','agendamentos',TRUE,3),
  ('alimenticio','estoque',TRUE,4),
  ('alimenticio','fornecedores',TRUE,5),
  ('alimenticio','promocoes',TRUE,6),
  ('alimenticio','relatorios',TRUE,7),
  ('alimenticio','despesas',TRUE,8),
  ('alimenticio','cardapio',TRUE,9),
  ('alimenticio','insumos',TRUE,10),
  ('alimenticio','fichas',TRUE,11),
  ('alimenticio','eventos',TRUE,12),
  ('alimenticio','simulador',TRUE,13),
  ('alimenticio','ia',TRUE,14),
  ('alimenticio','configuracoes',TRUE,15),
  ('restaurante','dashboard',TRUE,0),
  ('restaurante','produtos',TRUE,1),
  ('restaurante','vendas',TRUE,2),
  ('restaurante','agendamentos',TRUE,3),
  ('restaurante','estoque',TRUE,4),
  ('restaurante','fornecedores',TRUE,5),
  ('restaurante','promocoes',TRUE,6),
  ('restaurante','relatorios',TRUE,7),
  ('restaurante','despesas',TRUE,8),
  ('restaurante','cardapio',TRUE,9),
  ('restaurante','insumos',TRUE,10),
  ('restaurante','fichas',TRUE,11),
  ('restaurante','eventos',TRUE,12),
  ('restaurante','simulador',TRUE,13),
  ('restaurante','ia',TRUE,14),
  ('restaurante','configuracoes',TRUE,15),
  ('bar','dashboard',TRUE,0),
  ('bar','produtos',TRUE,1),
  ('bar','vendas',TRUE,2),
  ('bar','agendamentos',TRUE,3),
  ('bar','estoque',TRUE,4),
  ('bar','fornecedores',TRUE,5),
  ('bar','promocoes',TRUE,6),
  ('bar','relatorios',TRUE,7),
  ('bar','despesas',TRUE,8),
  ('bar','cardapio',TRUE,9),
  ('bar','insumos',TRUE,10),
  ('bar','fichas',TRUE,11),
  ('bar','eventos',TRUE,12),
  ('bar','simulador',TRUE,13),
  ('bar','ia',TRUE,14),
  ('bar','configuracoes',TRUE,15),
  ('hamburgueria','dashboard',TRUE,0),
  ('hamburgueria','produtos',TRUE,1),
  ('hamburgueria','vendas',TRUE,2),
  ('hamburgueria','agendamentos',TRUE,3),
  ('hamburgueria','estoque',TRUE,4),
  ('hamburgueria','fornecedores',TRUE,5),
  ('hamburgueria','promocoes',TRUE,6),
  ('hamburgueria','relatorios',TRUE,7),
  ('hamburgueria','despesas',TRUE,8),
  ('hamburgueria','cardapio',TRUE,9),
  ('hamburgueria','insumos',TRUE,10),
  ('hamburgueria','fichas',TRUE,11),
  ('hamburgueria','eventos',TRUE,12),
  ('hamburgueria','simulador',TRUE,13),
  ('hamburgueria','ia',TRUE,14),
  ('hamburgueria','configuracoes',TRUE,15),
  ('delivery','dashboard',TRUE,0),
  ('delivery','produtos',TRUE,1),
  ('delivery','vendas',TRUE,2),
  ('delivery','agendamentos',TRUE,3),
  ('delivery','estoque',TRUE,4),
  ('delivery','fornecedores',TRUE,5),
  ('delivery','promocoes',TRUE,6),
  ('delivery','relatorios',TRUE,7),
  ('delivery','despesas',TRUE,8),
  ('delivery','cardapio',TRUE,9),
  ('delivery','insumos',TRUE,10),
  ('delivery','fichas',TRUE,11),
  ('delivery','eventos',TRUE,12),
  ('delivery','simulador',TRUE,13),
  ('delivery','ia',TRUE,14),
  ('delivery','configuracoes',TRUE,15),
  ('buffet','dashboard',TRUE,0),
  ('buffet','produtos',TRUE,1),
  ('buffet','vendas',TRUE,2),
  ('buffet','agendamentos',TRUE,3),
  ('buffet','estoque',TRUE,4),
  ('buffet','fornecedores',TRUE,5),
  ('buffet','promocoes',TRUE,6),
  ('buffet','relatorios',TRUE,7),
  ('buffet','despesas',TRUE,8),
  ('buffet','cardapio',TRUE,9),
  ('buffet','insumos',TRUE,10),
  ('buffet','fichas',TRUE,11),
  ('buffet','eventos',TRUE,12),
  ('buffet','simulador',TRUE,13),
  ('buffet','ia',TRUE,14),
  ('buffet','configuracoes',TRUE,15),
  ('cafeteria','dashboard',TRUE,0),
  ('cafeteria','produtos',TRUE,1),
  ('cafeteria','vendas',TRUE,2),
  ('cafeteria','agendamentos',TRUE,3),
  ('cafeteria','estoque',TRUE,4),
  ('cafeteria','fornecedores',TRUE,5),
  ('cafeteria','promocoes',TRUE,6),
  ('cafeteria','relatorios',TRUE,7),
  ('cafeteria','despesas',TRUE,8),
  ('cafeteria','cardapio',TRUE,9),
  ('cafeteria','insumos',TRUE,10),
  ('cafeteria','fichas',TRUE,11),
  ('cafeteria','eventos',FALSE,12),
  ('cafeteria','simulador',TRUE,13),
  ('cafeteria','ia',TRUE,14),
  ('cafeteria','configuracoes',TRUE,15),
  ('lanchonete','dashboard',TRUE,0),
  ('lanchonete','produtos',TRUE,1),
  ('lanchonete','vendas',TRUE,2),
  ('lanchonete','agendamentos',TRUE,3),
  ('lanchonete','estoque',TRUE,4),
  ('lanchonete','fornecedores',TRUE,5),
  ('lanchonete','promocoes',TRUE,6),
  ('lanchonete','relatorios',TRUE,7),
  ('lanchonete','despesas',TRUE,8),
  ('lanchonete','cardapio',TRUE,9),
  ('lanchonete','insumos',TRUE,10),
  ('lanchonete','fichas',TRUE,11),
  ('lanchonete','eventos',FALSE,12),
  ('lanchonete','simulador',TRUE,13),
  ('lanchonete','ia',TRUE,14),
  ('lanchonete','configuracoes',TRUE,15),
  ('confeitaria','dashboard',TRUE,0),
  ('confeitaria','produtos',TRUE,1),
  ('confeitaria','vendas',TRUE,2),
  ('confeitaria','agendamentos',TRUE,3),
  ('confeitaria','estoque',TRUE,4),
  ('confeitaria','fornecedores',TRUE,5),
  ('confeitaria','promocoes',TRUE,6),
  ('confeitaria','relatorios',TRUE,7),
  ('confeitaria','despesas',TRUE,8),
  ('confeitaria','cardapio',TRUE,9),
  ('confeitaria','insumos',TRUE,10),
  ('confeitaria','fichas',TRUE,11),
  ('confeitaria','eventos',TRUE,12),
  ('confeitaria','simulador',TRUE,13),
  ('confeitaria','ia',TRUE,14),
  ('confeitaria','configuracoes',TRUE,15),
  ('roupas','dashboard',TRUE,0),
  ('roupas','produtos',TRUE,1),
  ('roupas','vendas',TRUE,2),
  ('roupas','agendamentos',TRUE,3),
  ('roupas','estoque',TRUE,4),
  ('roupas','fornecedores',TRUE,5),
  ('roupas','promocoes',TRUE,6),
  ('roupas','relatorios',TRUE,7),
  ('roupas','despesas',TRUE,8),
  ('roupas','cardapio',TRUE,9),
  ('roupas','insumos',FALSE,10),
  ('roupas','fichas',FALSE,11),
  ('roupas','eventos',TRUE,12),
  ('roupas','simulador',TRUE,13),
  ('roupas','ia',TRUE,14),
  ('roupas','configuracoes',TRUE,15),
  ('eletronicos','dashboard',TRUE,0),
  ('eletronicos','produtos',TRUE,1),
  ('eletronicos','vendas',TRUE,2),
  ('eletronicos','agendamentos',TRUE,3),
  ('eletronicos','estoque',TRUE,4),
  ('eletronicos','fornecedores',TRUE,5),
  ('eletronicos','promocoes',TRUE,6),
  ('eletronicos','relatorios',TRUE,7),
  ('eletronicos','despesas',TRUE,8),
  ('eletronicos','cardapio',TRUE,9),
  ('eletronicos','insumos',FALSE,10),
  ('eletronicos','fichas',FALSE,11),
  ('eletronicos','eventos',TRUE,12),
  ('eletronicos','simulador',TRUE,13),
  ('eletronicos','ia',TRUE,14),
  ('eletronicos','configuracoes',TRUE,15),
  ('loja_variedades','dashboard',TRUE,0),
  ('loja_variedades','produtos',TRUE,1),
  ('loja_variedades','vendas',TRUE,2),
  ('loja_variedades','agendamentos',TRUE,3),
  ('loja_variedades','estoque',TRUE,4),
  ('loja_variedades','fornecedores',TRUE,5),
  ('loja_variedades','promocoes',TRUE,6),
  ('loja_variedades','relatorios',TRUE,7),
  ('loja_variedades','despesas',TRUE,8),
  ('loja_variedades','cardapio',TRUE,9),
  ('loja_variedades','insumos',FALSE,10),
  ('loja_variedades','fichas',FALSE,11),
  ('loja_variedades','eventos',TRUE,12),
  ('loja_variedades','simulador',TRUE,13),
  ('loja_variedades','ia',TRUE,14),
  ('loja_variedades','configuracoes',TRUE,15),
  ('prestador_servico','dashboard',TRUE,0),
  ('prestador_servico','produtos',TRUE,1),
  ('prestador_servico','vendas',TRUE,2),
  ('prestador_servico','agendamentos',TRUE,3),
  ('prestador_servico','estoque',FALSE,4),
  ('prestador_servico','fornecedores',TRUE,5),
  ('prestador_servico','promocoes',TRUE,6),
  ('prestador_servico','relatorios',TRUE,7),
  ('prestador_servico','despesas',TRUE,8),
  ('prestador_servico','cardapio',FALSE,9),
  ('prestador_servico','insumos',FALSE,10),
  ('prestador_servico','fichas',FALSE,11),
  ('prestador_servico','eventos',FALSE,12),
  ('prestador_servico','simulador',TRUE,13),
  ('prestador_servico','ia',TRUE,14),
  ('prestador_servico','configuracoes',TRUE,15),
  ('barbearia','dashboard',TRUE,0),
  ('barbearia','produtos',TRUE,1),
  ('barbearia','vendas',TRUE,2),
  ('barbearia','agendamentos',TRUE,3),
  ('barbearia','estoque',TRUE,4),
  ('barbearia','fornecedores',TRUE,5),
  ('barbearia','promocoes',TRUE,6),
  ('barbearia','relatorios',TRUE,7),
  ('barbearia','despesas',TRUE,8),
  ('barbearia','cardapio',FALSE,9),
  ('barbearia','insumos',FALSE,10),
  ('barbearia','fichas',FALSE,11),
  ('barbearia','eventos',FALSE,12),
  ('barbearia','simulador',TRUE,13),
  ('barbearia','ia',TRUE,14),
  ('barbearia','configuracoes',TRUE,15),
  ('fotografia','dashboard',TRUE,0),
  ('fotografia','produtos',TRUE,1),
  ('fotografia','vendas',TRUE,2),
  ('fotografia','agendamentos',TRUE,3),
  ('fotografia','estoque',FALSE,4),
  ('fotografia','fornecedores',TRUE,5),
  ('fotografia','promocoes',TRUE,6),
  ('fotografia','relatorios',TRUE,7),
  ('fotografia','despesas',TRUE,8),
  ('fotografia','cardapio',TRUE,9),
  ('fotografia','insumos',FALSE,10),
  ('fotografia','fichas',FALSE,11),
  ('fotografia','eventos',FALSE,12),
  ('fotografia','simulador',TRUE,13),
  ('fotografia','ia',TRUE,14),
  ('fotografia','configuracoes',TRUE,15),
  ('outro','dashboard',TRUE,0),
  ('outro','produtos',TRUE,1),
  ('outro','vendas',TRUE,2),
  ('outro','agendamentos',TRUE,3),
  ('outro','estoque',TRUE,4),
  ('outro','fornecedores',TRUE,5),
  ('outro','promocoes',TRUE,6),
  ('outro','relatorios',TRUE,7),
  ('outro','despesas',TRUE,8),
  ('outro','cardapio',TRUE,9),
  ('outro','insumos',FALSE,10),
  ('outro','fichas',FALSE,11),
  ('outro','eventos',FALSE,12),
  ('outro','simulador',TRUE,13),
  ('outro','ia',TRUE,14),
  ('outro','configuracoes',TRUE,15)
ON CONFLICT (tipo_empresa, modulo) DO UPDATE SET
  ativo = EXCLUDED.ativo,
  ordem = EXCLUDED.ordem,
  updated_at = NOW();
