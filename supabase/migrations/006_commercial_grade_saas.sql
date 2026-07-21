-- ============================================================
-- VF Nexus — Camada comercial profissional: equipe, auditoria e fechamento
-- Migration idempotente para produção
-- ============================================================

CREATE TABLE IF NOT EXISTS public.equipe_usuarios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  email TEXT,
  telefone TEXT,
  cargo TEXT NOT NULL DEFAULT 'atendente' CHECK (cargo IN ('dono','gerente','atendente','vendedor','financeiro','operacional','outro')),
  permissoes TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo','inativo','convidado')),
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.logs_auditoria (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  usuario_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  acao TEXT NOT NULL,
  entidade TEXT,
  entidade_id TEXT,
  detalhes JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.fechamentos_diarios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  data_fechamento DATE NOT NULL,
  total_vendas NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_receitas NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_despesas NUMERIC(12,2) NOT NULL DEFAULT 0,
  saldo_final NUMERIC(12,2) NOT NULL DEFAULT 0,
  dinheiro NUMERIC(12,2) NOT NULL DEFAULT 0,
  pix NUMERIC(12,2) NOT NULL DEFAULT 0,
  cartao_credito NUMERIC(12,2) NOT NULL DEFAULT 0,
  cartao_debito NUMERIC(12,2) NOT NULL DEFAULT 0,
  outros NUMERIC(12,2) NOT NULL DEFAULT 0,
  observacoes TEXT,
  status TEXT NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto','fechado')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (empresa_id, data_fechamento)
);

CREATE INDEX IF NOT EXISTS idx_equipe_empresa_status ON public.equipe_usuarios(empresa_id, status);
CREATE INDEX IF NOT EXISTS idx_logs_auditoria_empresa_data ON public.logs_auditoria(empresa_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fechamentos_empresa_data ON public.fechamentos_diarios(empresa_id, data_fechamento DESC);

ALTER TABLE public.equipe_usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logs_auditoria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fechamentos_diarios ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['equipe_usuarios','logs_auditoria','fechamentos_diarios'] LOOP
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

DROP TRIGGER IF EXISTS trg_equipe_usuarios_updated_at ON public.equipe_usuarios;
CREATE TRIGGER trg_equipe_usuarios_updated_at BEFORE UPDATE ON public.equipe_usuarios FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS trg_fechamentos_diarios_updated_at ON public.fechamentos_diarios;
CREATE TRIGGER trg_fechamentos_diarios_updated_at BEFORE UPDATE ON public.fechamentos_diarios FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Bucket opcional para comprovantes; usado em evolução futura/produção para salvar PDFs e reenviar link.
INSERT INTO storage.buckets (id, name, public)
VALUES ('comprovantes', 'comprovantes', false)
ON CONFLICT (id) DO NOTHING;

-- Novos módulos comerciais disponíveis por padrão para ramos existentes.
INSERT INTO public.setor_modulos (tipo_empresa, modulo, ativo, ordem)
SELECT e.tipo, m.modulo, true, m.ordem
FROM (SELECT DISTINCT COALESCE(tipo, 'outro') AS tipo FROM public.empresas) e
CROSS JOIN (VALUES ('fechamento', 11), ('equipe', 20), ('auditoria', 21)) AS m(modulo, ordem)
ON CONFLICT (tipo_empresa, modulo) DO NOTHING;
