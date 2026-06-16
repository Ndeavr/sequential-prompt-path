
CREATE TABLE IF NOT EXISTS public.sms_test_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  triggered_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  phone text NOT NULL,
  event_id uuid REFERENCES public.sms_events_v2(id) ON DELETE SET NULL,
  message_sid text,
  queued_at timestamptz,
  sent_at timestamptz,
  delivered_at timestamptz,
  failed_at timestamptz,
  callback_received_at timestamptz,
  callback_received boolean NOT NULL DEFAULT false,
  success boolean NOT NULL DEFAULT false,
  error text
);
GRANT SELECT, INSERT, UPDATE ON public.sms_test_runs TO authenticated;
GRANT ALL ON public.sms_test_runs TO service_role;
ALTER TABLE public.sms_test_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read sms_test_runs" ON public.sms_test_runs FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins insert sms_test_runs" ON public.sms_test_runs FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins update sms_test_runs" ON public.sms_test_runs FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE INDEX IF NOT EXISTS idx_sms_test_runs_created ON public.sms_test_runs(created_at DESC);

CREATE TABLE IF NOT EXISTS public.timeline_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  occurred_at timestamptz NOT NULL DEFAULT now(),
  entity_type text NOT NULL,
  entity_id uuid,
  kind text NOT NULL,
  status text,
  reference text,
  detail text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.timeline_events TO authenticated;
GRANT ALL ON public.timeline_events TO service_role;
ALTER TABLE public.timeline_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read timeline_events" ON public.timeline_events FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "contractor reads own timeline_events" ON public.timeline_events FOR SELECT TO authenticated USING (
  entity_type = 'contractor' AND entity_id IN (SELECT id FROM public.contractors WHERE user_id = auth.uid())
);
CREATE INDEX IF NOT EXISTS idx_timeline_events_entity ON public.timeline_events(entity_type, entity_id, occurred_at DESC);

CREATE OR REPLACE FUNCTION public.sms_events_to_timeline()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_kind text;
  v_eid uuid;
  v_etype text;
BEGIN
  IF NEW.contractor_id IS NOT NULL THEN
    v_etype := 'contractor'; v_eid := NEW.contractor_id;
  ELSIF NEW.lead_id IS NOT NULL THEN
    v_etype := 'lead'; v_eid := NEW.lead_id;
  ELSE
    RETURN NEW;
  END IF;
  v_kind := CASE NEW.status
    WHEN 'queued' THEN 'sms_queued' WHEN 'sending' THEN 'sms_queued'
    WHEN 'sent' THEN 'sms_sent' WHEN 'delivered' THEN 'sms_delivered'
    WHEN 'failed' THEN 'sms_failed' WHEN 'undelivered' THEN 'sms_failed'
    WHEN 'blocked' THEN 'sms_failed' WHEN 'invalid_phone' THEN 'sms_failed'
    ELSE NULL END;
  IF v_kind IS NULL THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = NEW.status THEN RETURN NEW; END IF;
  INSERT INTO public.timeline_events (entity_type, entity_id, kind, status, reference, detail, payload, occurred_at)
  VALUES (v_etype, v_eid, v_kind, NEW.status, NEW.twilio_sid, NEW.message_preview,
    jsonb_build_object('error_code', NEW.error_code, 'error_message', NEW.error_message, 'template_key', NEW.template_key),
    COALESCE(NEW.delivered_at, NEW.sent_at, NEW.failed_at, NEW.updated_at, now()));
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_sms_events_to_timeline ON public.sms_events_v2;
CREATE TRIGGER trg_sms_events_to_timeline
AFTER INSERT OR UPDATE OF status ON public.sms_events_v2
FOR EACH ROW EXECUTE FUNCTION public.sms_events_to_timeline();

CREATE OR REPLACE VIEW public.v_sms_infrastructure_status
WITH (security_invoker = true) AS
WITH last_test AS (
  SELECT max(created_at) AS at,
         max(created_at) FILTER (WHERE success) AS last_success_at
  FROM public.sms_test_runs
),
last_callback AS (
  SELECT max(webhook_received_at) AS at FROM public.sms_events_v2
),
deliv AS (
  SELECT
    count(*) FILTER (WHERE status IN ('sent','delivered','failed','undelivered')) AS total,
    count(*) FILTER (WHERE status = 'delivered') AS delivered,
    count(*) FILTER (WHERE status IN ('failed','undelivered')) AS failed
  FROM public.sms_events_v2 WHERE created_at > now() - interval '24 hours'
)
SELECT
  CASE
    WHEN (SELECT at FROM last_callback) IS NULL THEN 'ERROR'
    WHEN (SELECT last_success_at FROM last_test) IS NULL THEN 'WARNING'
    WHEN (SELECT last_success_at FROM last_test) < now() - interval '24 hours' THEN 'WARNING'
    WHEN (SELECT total FROM deliv) > 10 AND (SELECT delivered FROM deliv)::numeric / NULLIF((SELECT total FROM deliv),0) < 0.9 THEN 'ERROR'
    ELSE 'HEALTHY' END AS status,
  (SELECT at FROM last_callback) AS last_callback_at,
  (SELECT last_success_at FROM last_test) AS last_test_success_at,
  (SELECT total FROM deliv) AS sent_24h,
  (SELECT delivered FROM deliv) AS delivered_24h,
  (SELECT failed FROM deliv) AS failed_24h,
  CASE WHEN (SELECT total FROM deliv) > 0
    THEN round((SELECT delivered FROM deliv)::numeric * 100 / (SELECT total FROM deliv), 2)
    ELSE NULL END AS delivery_rate_24h;
GRANT SELECT ON public.v_sms_infrastructure_status TO authenticated, service_role;

CREATE OR REPLACE VIEW public.v_sms_kpi_today
WITH (security_invoker = true) AS
SELECT
  count(*) FILTER (WHERE status IN ('sent','delivered','failed','undelivered')) AS sent,
  count(*) FILTER (WHERE status = 'delivered') AS delivered,
  count(*) FILTER (WHERE status IN ('failed','undelivered','blocked')) AS failed,
  0 AS replies
FROM public.sms_events_v2 WHERE created_at >= date_trunc('day', now());
GRANT SELECT ON public.v_sms_kpi_today TO authenticated, service_role;

CREATE OR REPLACE VIEW public.v_sms_kpi_7d
WITH (security_invoker = true) AS
SELECT
  date_trunc('day', created_at)::date AS day,
  count(*) FILTER (WHERE status IN ('sent','delivered','failed','undelivered')) AS sent,
  count(*) FILTER (WHERE status = 'delivered') AS delivered,
  count(*) FILTER (WHERE status IN ('failed','undelivered','blocked')) AS failed
FROM public.sms_events_v2 WHERE created_at > now() - interval '7 days'
GROUP BY 1 ORDER BY 1;
GRANT SELECT ON public.v_sms_kpi_7d TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.sms_infrastructure_score()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_status record; v_score int := 0;
BEGIN
  SELECT * INTO v_status FROM public.v_sms_infrastructure_status;
  IF v_status.last_callback_at IS NOT NULL THEN v_score := v_score + 25; END IF;
  IF v_status.last_callback_at > now() - interval '24 hours' THEN v_score := v_score + 15; END IF;
  IF v_status.last_test_success_at IS NOT NULL THEN v_score := v_score + 20; END IF;
  IF v_status.last_test_success_at > now() - interval '24 hours' THEN v_score := v_score + 15; END IF;
  IF v_status.delivery_rate_24h IS NULL OR v_status.delivery_rate_24h >= 90 THEN v_score := v_score + 25; END IF;
  RETURN jsonb_build_object(
    'score', v_score, 'status', v_status.status,
    'last_callback_at', v_status.last_callback_at,
    'last_test_success_at', v_status.last_test_success_at,
    'sent_24h', v_status.sent_24h, 'delivered_24h', v_status.delivered_24h,
    'delivery_rate_24h', v_status.delivery_rate_24h
  );
END $$;
GRANT EXECUTE ON FUNCTION public.sms_infrastructure_score() TO authenticated, service_role;
