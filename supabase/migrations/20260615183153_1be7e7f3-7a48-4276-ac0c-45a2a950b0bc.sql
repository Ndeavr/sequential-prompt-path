
-- ============================================================
-- PHASE 1: Unified SMS audit table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.sms_events_v2 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid,
  contractor_id uuid,
  campaign_id uuid,
  template_key text,
  message_type text NOT NULL DEFAULT 'other',
  raw_phone text,
  normalized_phone text,
  country_code text,
  area_code text,
  carrier text,
  from_number text,
  message_preview text,
  body_hash text,
  twilio_sid text,
  status text NOT NULL DEFAULT 'queued',
  error_code text,
  error_message text,
  attempt_number int NOT NULL DEFAULT 1,
  next_retry_at timestamptz,
  sent_at timestamptz,
  delivered_at timestamptz,
  failed_at timestamptz,
  webhook_received_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sms_events_v2_status_check CHECK (status IN (
    'queued','sending','sent','delivered','undelivered','failed',
    'invalid_phone','blocked','opted_out','retry_scheduled','contact_required'
  ))
);

GRANT SELECT ON public.sms_events_v2 TO authenticated;
GRANT ALL ON public.sms_events_v2 TO service_role;

ALTER TABLE public.sms_events_v2 ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_read_sms_events_v2" ON public.sms_events_v2
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "service_role_sms_events_v2_all" ON public.sms_events_v2
  FOR ALL TO public
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_sms_events_v2_status ON public.sms_events_v2(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_sms_events_v2_twilio_sid ON public.sms_events_v2(twilio_sid) WHERE twilio_sid IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sms_events_v2_phone_created ON public.sms_events_v2(normalized_phone, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sms_events_v2_contractor ON public.sms_events_v2(contractor_id, created_at DESC) WHERE contractor_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sms_events_v2_lead ON public.sms_events_v2(lead_id) WHERE lead_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sms_events_v2_retry ON public.sms_events_v2(next_retry_at) WHERE status = 'retry_scheduled';
CREATE INDEX IF NOT EXISTS idx_sms_events_v2_created ON public.sms_events_v2(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sms_events_v2_error_code ON public.sms_events_v2(error_code) WHERE error_code IS NOT NULL;

CREATE OR REPLACE FUNCTION public.touch_sms_events_v2_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_sms_events_v2_touch ON public.sms_events_v2;
CREATE TRIGGER trg_sms_events_v2_touch
  BEFORE UPDATE ON public.sms_events_v2
  FOR EACH ROW EXECUTE FUNCTION public.touch_sms_events_v2_updated_at();

-- ============================================================
-- Opt-out registry
-- ============================================================
CREATE TABLE IF NOT EXISTS public.sms_opt_outs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  normalized_phone text NOT NULL UNIQUE,
  reason text,
  source text,
  opted_out_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.sms_opt_outs TO authenticated;
GRANT ALL ON public.sms_opt_outs TO service_role;
ALTER TABLE public.sms_opt_outs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_read_sms_opt_outs" ON public.sms_opt_outs
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "service_role_sms_opt_outs_all" ON public.sms_opt_outs
  FOR ALL TO public
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================================
-- Retry queue
-- ============================================================
CREATE TABLE IF NOT EXISTS public.sms_retry_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.sms_events_v2(id) ON DELETE CASCADE,
  attempt int NOT NULL,
  scheduled_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  processed_at timestamptz,
  result_event_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.sms_retry_queue TO authenticated;
GRANT ALL ON public.sms_retry_queue TO service_role;
ALTER TABLE public.sms_retry_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_read_sms_retry_queue" ON public.sms_retry_queue
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "service_role_sms_retry_queue_all" ON public.sms_retry_queue
  FOR ALL TO public
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_sms_retry_queue_pending ON public.sms_retry_queue(scheduled_at) WHERE status = 'pending';

-- ============================================================
-- Carrier cache
-- ============================================================
CREATE TABLE IF NOT EXISTS public.phone_carrier_cache (
  normalized_phone text PRIMARY KEY,
  carrier text,
  line_type text,
  country_code text,
  raw_payload jsonb,
  fetched_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.phone_carrier_cache TO authenticated;
GRANT ALL ON public.phone_carrier_cache TO service_role;
ALTER TABLE public.phone_carrier_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_read_phone_carrier_cache" ON public.phone_carrier_cache
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "service_role_phone_carrier_cache_all" ON public.phone_carrier_cache
  FOR ALL TO public
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================================
-- Health views
-- ============================================================
CREATE OR REPLACE VIEW public.v_sms_health_24h
WITH (security_invoker = true) AS
SELECT
  COUNT(*) FILTER (WHERE status = 'delivered') AS delivered,
  COUNT(*) FILTER (WHERE status = 'failed') AS failed,
  COUNT(*) FILTER (WHERE status = 'undelivered') AS undelivered,
  COUNT(*) FILTER (WHERE status IN ('queued','sending','sent')) AS queued,
  COUNT(*) FILTER (WHERE status IN ('invalid_phone','blocked','opted_out')) AS invalid,
  COUNT(*) AS total
FROM public.sms_events_v2
WHERE created_at >= now() - interval '24 hours';

CREATE OR REPLACE VIEW public.v_sms_failure_reasons_7d
WITH (security_invoker = true) AS
SELECT
  COALESCE(error_code, 'unknown') AS error_code,
  COUNT(*) AS count
FROM public.sms_events_v2
WHERE status IN ('failed','undelivered','invalid_phone','blocked')
  AND created_at >= now() - interval '7 days'
GROUP BY 1
ORDER BY 2 DESC;

-- ============================================================
-- Contractor communication timeline RPC (Alex-readable)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_contractor_comms_timeline(p_contractor_id uuid)
RETURNS TABLE (
  occurred_at timestamptz,
  kind text,
  status text,
  detail text,
  reference text
)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT created_at, 'sms_queued', status, COALESCE(message_preview,''), twilio_sid
  FROM public.sms_events_v2 WHERE contractor_id = p_contractor_id
  UNION ALL
  SELECT delivered_at, 'sms_delivered', 'delivered', COALESCE(carrier,''), twilio_sid
  FROM public.sms_events_v2 WHERE contractor_id = p_contractor_id AND delivered_at IS NOT NULL
  ORDER BY 1 DESC NULLS LAST
  LIMIT 100;
$$;

GRANT EXECUTE ON FUNCTION public.get_contractor_comms_timeline(uuid) TO authenticated, service_role;
