-- ============================================================
-- VF APP — Notificações push de agendamento para PWA/Mobile
-- Migration idempotente: pode ser executada mais de uma vez.
-- ============================================================

ALTER TABLE public.configuracoes
  ADD COLUMN IF NOT EXISTS notificacao_agendamento_antecedencia TEXT NOT NULL DEFAULT '1_dia';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'configuracoes_notificacao_agendamento_antecedencia_check'
  ) THEN
    ALTER TABLE public.configuracoes
      ADD CONSTRAINT configuracoes_notificacao_agendamento_antecedencia_check
      CHECK (notificacao_agendamento_antecedencia IN ('1_dia', 'no_dia', '30_min', '10_min'));
  END IF;
END $$;

ALTER TABLE public.configuracoes
  ADD COLUMN IF NOT EXISTS notificacao_agendamento_ativa BOOLEAN NOT NULL DEFAULT TRUE;

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth_key TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(endpoint)
);

CREATE TABLE IF NOT EXISTS public.notificacoes_agendadas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  agendamento_id UUID NOT NULL REFERENCES public.agendamentos(id) ON DELETE CASCADE,
  enviar_em TIMESTAMPTZ NOT NULL,
  enviada BOOLEAN NOT NULL DEFAULT FALSE,
  enviada_em TIMESTAMPTZ,
  erro TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notificacoes_agendadas_envio ON public.notificacoes_agendadas(enviar_em, enviada);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_empresa ON public.push_subscriptions(empresa_id);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notificacoes_agendadas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS select_company_data ON public.push_subscriptions;
DROP POLICY IF EXISTS insert_company_data ON public.push_subscriptions;
DROP POLICY IF EXISTS update_company_data ON public.push_subscriptions;
DROP POLICY IF EXISTS delete_company_data ON public.push_subscriptions;
CREATE POLICY select_company_data ON public.push_subscriptions FOR SELECT USING (empresa_id = public.get_empresa_id());
CREATE POLICY insert_company_data ON public.push_subscriptions FOR INSERT WITH CHECK (empresa_id = public.get_empresa_id() AND usuario_id = auth.uid());
CREATE POLICY update_company_data ON public.push_subscriptions FOR UPDATE USING (empresa_id = public.get_empresa_id() AND usuario_id = auth.uid()) WITH CHECK (empresa_id = public.get_empresa_id() AND usuario_id = auth.uid());
CREATE POLICY delete_company_data ON public.push_subscriptions FOR DELETE USING (empresa_id = public.get_empresa_id() AND usuario_id = auth.uid());

DROP POLICY IF EXISTS select_company_data ON public.notificacoes_agendadas;
DROP POLICY IF EXISTS insert_company_data ON public.notificacoes_agendadas;
DROP POLICY IF EXISTS update_company_data ON public.notificacoes_agendadas;
DROP POLICY IF EXISTS delete_company_data ON public.notificacoes_agendadas;
CREATE POLICY select_company_data ON public.notificacoes_agendadas FOR SELECT USING (empresa_id = public.get_empresa_id());
CREATE POLICY insert_company_data ON public.notificacoes_agendadas FOR INSERT WITH CHECK (empresa_id = public.get_empresa_id());
CREATE POLICY update_company_data ON public.notificacoes_agendadas FOR UPDATE USING (empresa_id = public.get_empresa_id()) WITH CHECK (empresa_id = public.get_empresa_id());
CREATE POLICY delete_company_data ON public.notificacoes_agendadas FOR DELETE USING (empresa_id = public.get_empresa_id());

CREATE OR REPLACE FUNCTION public.calcular_envio_notificacao_agendamento(
  p_data DATE,
  p_hora TIME,
  p_antecedencia TEXT,
  p_fuso TEXT
)
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  agendamento_em TIMESTAMPTZ;
  envio_em TIMESTAMPTZ;
  fuso TEXT := COALESCE(NULLIF(p_fuso, ''), 'America/Sao_Paulo');
BEGIN
  agendamento_em := ((p_data::TEXT || ' ' || p_hora::TEXT)::TIMESTAMP AT TIME ZONE fuso);

  IF p_antecedencia = '1_dia' THEN
    envio_em := agendamento_em - INTERVAL '24 hours';
  ELSIF p_antecedencia = 'no_dia' THEN
    envio_em := ((p_data::TEXT || ' 08:00:00')::TIMESTAMP AT TIME ZONE fuso);
  ELSIF p_antecedencia = '30_min' THEN
    envio_em := agendamento_em - INTERVAL '30 minutes';
  ELSIF p_antecedencia = '10_min' THEN
    envio_em := agendamento_em - INTERVAL '10 minutes';
  ELSE
    envio_em := agendamento_em - INTERVAL '24 hours';
  END IF;

  RETURN envio_em;
END;
$$;

CREATE OR REPLACE FUNCTION public.sincronizar_notificacao_agendamento()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cfg RECORD;
  envio TIMESTAMPTZ;
BEGIN
  DELETE FROM public.notificacoes_agendadas
  WHERE agendamento_id = NEW.id
    AND enviada = FALSE;

  SELECT notificacao_agendamento_ativa, notificacao_agendamento_antecedencia, fuso_horario
  INTO cfg
  FROM public.configuracoes
  WHERE empresa_id = NEW.empresa_id
  LIMIT 1;

  IF NEW.status = 'cancelado' OR COALESCE(cfg.notificacao_agendamento_ativa, TRUE) = FALSE THEN
    RETURN NEW;
  END IF;

  envio := public.calcular_envio_notificacao_agendamento(
    NEW.data_agendamento,
    NEW.hora_inicio,
    COALESCE(cfg.notificacao_agendamento_antecedencia, '1_dia'),
    COALESCE(cfg.fuso_horario, 'America/Sao_Paulo')
  );

  IF envio IS NULL OR envio <= NOW() THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.notificacoes_agendadas (empresa_id, agendamento_id, enviar_em)
  VALUES (NEW.empresa_id, NEW.id, envio);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sincronizar_notificacao_agendamento ON public.agendamentos;
CREATE TRIGGER trg_sincronizar_notificacao_agendamento
AFTER INSERT OR UPDATE OF data_agendamento, hora_inicio, status ON public.agendamentos
FOR EACH ROW EXECUTE FUNCTION public.sincronizar_notificacao_agendamento();
