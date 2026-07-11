
-- ─── Canonical engagement events ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.pipeline_engagement_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  channel TEXT,
  status TEXT,
  provider TEXT,
  provider_message_id TEXT,
  tracking_id TEXT,
  contractor_id UUID,
  prospect_id UUID,
  lead_id UUID,
  user_id UUID,
  session_id UUID,
  destination_url TEXT,
  error_code TEXT,
  error_message TEXT,
  source_table TEXT,
  source_row_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  idempotency_key TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_pipeline_engagement_idem
  ON public.pipeline_engagement_events (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_pipeline_engagement_type_time
  ON public.pipeline_engagement_events (event_type, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_pipeline_engagement_contractor
  ON public.pipeline_engagement_events (contractor_id, occurred_at DESC)
  WHERE contractor_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pipeline_engagement_prospect
  ON public.pipeline_engagement_events (prospect_id, occurred_at DESC)
  WHERE prospect_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pipeline_engagement_tracking
  ON public.pipeline_engagement_events (tracking_id)
  WHERE tracking_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pipeline_engagement_provider_msg
  ON public.pipeline_engagement_events (provider, provider_message_id)
  WHERE provider_message_id IS NOT NULL;

GRANT SELECT ON public.pipeline_engagement_events TO authenticated;
GRANT ALL ON public.pipeline_engagement_events TO service_role;

ALTER TABLE public.pipeline_engagement_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "engagement_admin_select" ON public.pipeline_engagement_events;
CREATE POLICY "engagement_admin_select" ON public.pipeline_engagement_events
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "engagement_service_all" ON public.pipeline_engagement_events;
CREATE POLICY "engagement_service_all" ON public.pipeline_engagement_events
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ─── Helper: record + dedupe + surface failures ────────────────────────────
CREATE OR REPLACE FUNCTION public.record_engagement_event(
  _event_type TEXT,
  _channel TEXT DEFAULT NULL,
  _status TEXT DEFAULT NULL,
  _provider TEXT DEFAULT NULL,
  _provider_message_id TEXT DEFAULT NULL,
  _tracking_id TEXT DEFAULT NULL,
  _contractor_id UUID DEFAULT NULL,
  _prospect_id UUID DEFAULT NULL,
  _lead_id UUID DEFAULT NULL,
  _user_id UUID DEFAULT NULL,
  _session_id UUID DEFAULT NULL,
  _destination_url TEXT DEFAULT NULL,
  _error_code TEXT DEFAULT NULL,
  _error_message TEXT DEFAULT NULL,
  _source_table TEXT DEFAULT NULL,
  _source_row_id TEXT DEFAULT NULL,
  _metadata JSONB DEFAULT '{}'::jsonb,
  _idempotency_key TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _id UUID;
  _key TEXT;
BEGIN
  _key := COALESCE(
    _idempotency_key,
    CASE
      WHEN _provider_message_id IS NOT NULL
        THEN _provider || ':' || _provider_message_id || ':' || _event_type
      WHEN _tracking_id IS NOT NULL AND _event_type = 'clicked'
        THEN 'click:' || _tracking_id || ':' || floor(extract(epoch FROM now())/60)::text
      ELSE NULL
    END
  );

  INSERT INTO public.pipeline_engagement_events (
    event_type, channel, status, provider, provider_message_id, tracking_id,
    contractor_id, prospect_id, lead_id, user_id, session_id,
    destination_url, error_code, error_message,
    source_table, source_row_id, metadata, idempotency_key
  ) VALUES (
    _event_type, _channel, _status, _provider, _provider_message_id, _tracking_id,
    _contractor_id, _prospect_id, _lead_id, _user_id, _session_id,
    _destination_url, _error_code, _error_message,
    _source_table, _source_row_id, COALESCE(_metadata,'{}'::jsonb), _key
  )
  ON CONFLICT (idempotency_key) DO NOTHING
  RETURNING id INTO _id;

  -- Mirror failures into the pipeline error registry when available
  IF _event_type IN ('failed','bounced','undelivered') AND _error_code IS NOT NULL THEN
    BEGIN
      PERFORM public.record_pipeline_error(
        _category := 'engagement',
        _error_code := _error_code,
        _error_message := COALESCE(_error_message, _event_type),
        _entity_type := COALESCE(_channel,'engagement'),
        _entity_id := COALESCE(_contractor_id::text, _prospect_id::text, _provider_message_id),
        _step_key := _event_type,
        _metadata := jsonb_build_object('provider',_provider,'channel',_channel,'provider_message_id',_provider_message_id)
      );
    EXCEPTION WHEN undefined_function THEN NULL;
    END;
  END IF;

  RETURN _id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_engagement_event(
  TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,UUID,UUID,UUID,UUID,UUID,TEXT,TEXT,TEXT,TEXT,TEXT,JSONB,TEXT
) TO authenticated, service_role;

-- ─── Trigger: SMS log status changes ───────────────────────────────────────
CREATE OR REPLACE FUNCTION public.trg_engagement_from_sms_log()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _evt TEXT;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  _evt := CASE lower(coalesce(NEW.status,''))
    WHEN 'queued' THEN 'queued'
    WHEN 'sent' THEN 'sent'
    WHEN 'delivered' THEN 'delivered'
    WHEN 'undelivered' THEN 'undelivered'
    WHEN 'failed' THEN 'failed'
    WHEN 'bounced' THEN 'bounced'
    WHEN 'clicked' THEN 'clicked'
    ELSE NULL
  END;

  IF _evt IS NULL THEN RETURN NEW; END IF;

  PERFORM public.record_engagement_event(
    _event_type := _evt,
    _channel := 'sms',
    _status := NEW.status,
    _provider := 'twilio',
    _provider_message_id := NEW.provider_message_id,
    _contractor_id := NEW.contractor_id,
    _error_message := NEW.error,
    _error_code := CASE WHEN NEW.error IS NOT NULL THEN 'TWILIO_ERROR' ELSE NULL END,
    _source_table := 'acq_sms_logs',
    _source_row_id := NEW.id::text
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_engagement_from_sms_log ON public.acq_sms_logs;
CREATE TRIGGER trg_engagement_from_sms_log
AFTER INSERT OR UPDATE OF status ON public.acq_sms_logs
FOR EACH ROW EXECUTE FUNCTION public.trg_engagement_from_sms_log();

-- ─── Trigger: email log status changes ─────────────────────────────────────
CREATE OR REPLACE FUNCTION public.trg_engagement_from_email_log()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _evt TEXT;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status IS NOT DISTINCT FROM OLD.status
     AND NEW.opened_at IS NOT DISTINCT FROM OLD.opened_at
     AND NEW.clicked_at IS NOT DISTINCT FROM OLD.clicked_at THEN
    RETURN NEW;
  END IF;

  _evt := CASE lower(coalesce(NEW.status,''))
    WHEN 'queued' THEN 'queued'
    WHEN 'sent' THEN 'sent'
    WHEN 'delivered' THEN 'delivered'
    WHEN 'opened' THEN 'opened'
    WHEN 'clicked' THEN 'clicked'
    WHEN 'bounced' THEN 'bounced'
    WHEN 'failed' THEN 'failed'
    WHEN 'complained' THEN 'complained'
    ELSE NULL
  END;

  IF _evt IS NULL THEN RETURN NEW; END IF;

  PERFORM public.record_engagement_event(
    _event_type := _evt,
    _channel := 'email',
    _status := NEW.status,
    _provider := 'resend',
    _provider_message_id := NEW.provider_message_id,
    _contractor_id := NEW.contractor_id,
    _error_message := NEW.error,
    _error_code := CASE WHEN NEW.error IS NOT NULL THEN 'RESEND_ERROR' ELSE NULL END,
    _source_table := 'acq_email_logs',
    _source_row_id := NEW.id::text,
    _metadata := jsonb_build_object('sequence_code', NEW.sequence_code, 'recipient', NEW.recipient_email)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_engagement_from_email_log ON public.acq_email_logs;
CREATE TRIGGER trg_engagement_from_email_log
AFTER INSERT OR UPDATE ON public.acq_email_logs
FOR EACH ROW EXECUTE FUNCTION public.trg_engagement_from_email_log();

-- ─── Trigger: onboarding sessions ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.trg_engagement_from_onboarding()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.record_engagement_event(
      _event_type := 'onboarding_started',
      _channel := 'onboarding',
      _user_id := NEW.user_id,
      _session_id := NEW.id,
      _source_table := 'contractor_onboarding_sessions',
      _source_row_id := NEW.id::text,
      _metadata := jsonb_build_object('current_step', NEW.current_step, 'business_name', NEW.business_name),
      _idempotency_key := 'onboarding_started:' || NEW.id::text
    );
    RETURN NEW;
  END IF;

  IF NEW.current_step IS DISTINCT FROM OLD.current_step THEN
    PERFORM public.record_engagement_event(
      _event_type := 'onboarding_step',
      _channel := 'onboarding',
      _status := NEW.current_step,
      _user_id := NEW.user_id,
      _session_id := NEW.id,
      _source_table := 'contractor_onboarding_sessions',
      _source_row_id := NEW.id::text,
      _idempotency_key := 'onboarding_step:' || NEW.id::text || ':' || NEW.current_step
    );
  END IF;

  IF NEW.completed_at IS NOT NULL AND OLD.completed_at IS NULL THEN
    PERFORM public.record_engagement_event(
      _event_type := 'onboarding_completed',
      _channel := 'onboarding',
      _user_id := NEW.user_id,
      _session_id := NEW.id,
      _source_table := 'contractor_onboarding_sessions',
      _source_row_id := NEW.id::text,
      _idempotency_key := 'onboarding_completed:' || NEW.id::text
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_engagement_from_onboarding ON public.contractor_onboarding_sessions;
CREATE TRIGGER trg_engagement_from_onboarding
AFTER INSERT OR UPDATE ON public.contractor_onboarding_sessions
FOR EACH ROW EXECUTE FUNCTION public.trg_engagement_from_onboarding();

-- ─── Trigger: paid (contractor_subscriptions active) ───────────────────────
CREATE OR REPLACE FUNCTION public.trg_engagement_from_subscription()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'active' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'active') THEN
    PERFORM public.record_engagement_event(
      _event_type := 'paid',
      _channel := 'payment',
      _status := NEW.status,
      _contractor_id := NEW.contractor_id,
      _source_table := 'contractor_subscriptions',
      _source_row_id := NEW.id::text,
      _idempotency_key := 'paid:sub:' || NEW.id::text
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_engagement_from_subscription ON public.contractor_subscriptions;
CREATE TRIGGER trg_engagement_from_subscription
AFTER INSERT OR UPDATE OF status ON public.contractor_subscriptions
FOR EACH ROW EXECUTE FUNCTION public.trg_engagement_from_subscription();

-- ─── Trigger: activation sessions ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.trg_engagement_from_activation_session()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.checkout_url IS NOT NULL THEN
    PERFORM public.record_engagement_event(
      _event_type := 'checkout_started',
      _channel := 'payment',
      _status := NEW.status,
      _lead_id := NEW.lead_id,
      _source_table := 'activation_sessions',
      _source_row_id := NEW.id::text,
      _idempotency_key := 'checkout_started:' || NEW.id::text
    );
  END IF;

  IF NEW.paid_at IS NOT NULL AND (OLD.paid_at IS NULL) THEN
    PERFORM public.record_engagement_event(
      _event_type := 'paid',
      _channel := 'payment',
      _lead_id := NEW.lead_id,
      _source_table := 'activation_sessions',
      _source_row_id := NEW.id::text,
      _idempotency_key := 'paid:activation:' || NEW.id::text
    );
  END IF;

  IF NEW.activated_at IS NOT NULL AND (OLD.activated_at IS NULL) THEN
    PERFORM public.record_engagement_event(
      _event_type := 'activated',
      _channel := 'activation',
      _lead_id := NEW.lead_id,
      _source_table := 'activation_sessions',
      _source_row_id := NEW.id::text,
      _idempotency_key := 'activated:' || NEW.id::text
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_engagement_from_activation_session ON public.activation_sessions;
CREATE TRIGGER trg_engagement_from_activation_session
AFTER INSERT OR UPDATE ON public.activation_sessions
FOR EACH ROW EXECUTE FUNCTION public.trg_engagement_from_activation_session();

-- ─── Views for cockpit ─────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.v_engagement_funnel_24h
WITH (security_invoker = true) AS
SELECT
  event_type,
  COALESCE(channel,'unknown') AS channel,
  count(*) FILTER (WHERE occurred_at >= now() - interval '24 hours') AS count_24h,
  count(*) FILTER (WHERE occurred_at >= now() - interval '7 days') AS count_7d,
  count(*) AS count_total,
  max(occurred_at) AS last_at
FROM public.pipeline_engagement_events
GROUP BY event_type, COALESCE(channel,'unknown');

GRANT SELECT ON public.v_engagement_funnel_24h TO authenticated, service_role;

CREATE OR REPLACE VIEW public.v_engagement_recent
WITH (security_invoker = true) AS
SELECT
  e.id, e.event_type, e.channel, e.status, e.provider,
  e.provider_message_id, e.tracking_id,
  e.contractor_id, e.prospect_id, e.lead_id,
  e.error_code, e.error_message,
  e.source_table, e.source_row_id,
  e.metadata, e.occurred_at
FROM public.pipeline_engagement_events e
ORDER BY e.occurred_at DESC
LIMIT 500;

GRANT SELECT ON public.v_engagement_recent TO authenticated, service_role;
