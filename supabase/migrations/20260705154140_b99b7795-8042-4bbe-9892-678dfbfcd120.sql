
CREATE TABLE public.email_health_checks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ts timestamptz NOT NULL DEFAULT now(),
  overall_status text NOT NULL CHECK (overall_status IN ('healthy','degraded','failed')),
  resend_auth_ok boolean NOT NULL DEFAULT false,
  domain_ok boolean NOT NULL DEFAULT false,
  sender_ok boolean NOT NULL DEFAULT false,
  live_send_ok boolean NOT NULL DEFAULT false,
  latency_ms integer,
  error_category text CHECK (error_category IN ('INVALID_API_KEY','INVALID_SENDER','DOMAIN_NOT_VERIFIED','RATE_LIMITED','RESEND_OUTAGE','TEMPLATE_ERROR','EDGE_FUNCTION_ERROR','NONE','UNKNOWN')) DEFAULT 'NONE',
  reason text,
  impact text,
  triggered_by text NOT NULL DEFAULT 'system',
  details_json jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX idx_ehc_ts ON public.email_health_checks (ts DESC);
CREATE INDEX idx_ehc_status ON public.email_health_checks (overall_status);

GRANT SELECT ON public.email_health_checks TO authenticated;
GRANT ALL ON public.email_health_checks TO service_role;

ALTER TABLE public.email_health_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read email_health_checks"
  ON public.email_health_checks FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role writes email_health_checks"
  ON public.email_health_checks FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- Aggregated failure analysis view (last 24h from email_health_checks + email_delivery_events)
CREATE OR REPLACE VIEW public.email_failure_analysis
WITH (security_invoker = true) AS
SELECT
  COALESCE(error_category, 'UNKNOWN') AS category,
  count(*)::int AS occurrences,
  max(ts) AS last_seen,
  min(ts) AS first_seen
FROM public.email_health_checks
WHERE ts > now() - interval '24 hours'
  AND overall_status <> 'healthy'
GROUP BY COALESCE(error_category, 'UNKNOWN');

GRANT SELECT ON public.email_failure_analysis TO authenticated;
