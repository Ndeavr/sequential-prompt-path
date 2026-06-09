
-- 1. Add columns to launch_leads
ALTER TABLE public.launch_leads
  ADD COLUMN IF NOT EXISTS recommended_plan TEXT,
  ADD COLUMN IF NOT EXISTS recommended_plan_cents INTEGER,
  ADD COLUMN IF NOT EXISTS stripe_session_id TEXT,
  ADD COLUMN IF NOT EXISTS activated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS mrr_cents INTEGER;

CREATE INDEX IF NOT EXISTS idx_launch_leads_stripe_session ON public.launch_leads(stripe_session_id) WHERE stripe_session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_launch_leads_activated_at ON public.launch_leads(activated_at DESC) WHERE activated_at IS NOT NULL;

-- 2. Add campaign config to launch_mode_state
ALTER TABLE public.launch_mode_state
  ADD COLUMN IF NOT EXISTS daily_activation_cap INTEGER NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS target_cities TEXT[] NOT NULL DEFAULT ARRAY['Laval','Montréal','Terrebonne','Repentigny'],
  ADD COLUMN IF NOT EXISTS target_trades TEXT[] NOT NULL DEFAULT ARRAY['isolation','toiture','plomberie','électricité','hvac','peinture'];

-- 3. Funnel alerts (watchdog output)
CREATE TABLE IF NOT EXISTS public.launch_funnel_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stage TEXT NOT NULL,
  agent TEXT,
  severity TEXT NOT NULL DEFAULT 'warning',
  reason TEXT NOT NULL,
  metric_count INTEGER,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  acknowledged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.launch_funnel_alerts TO authenticated;
GRANT ALL ON public.launch_funnel_alerts TO service_role;
ALTER TABLE public.launch_funnel_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read funnel alerts" ON public.launch_funnel_alerts
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins ack funnel alerts" ON public.launch_funnel_alerts
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_funnel_alerts_created ON public.launch_funnel_alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_funnel_alerts_open ON public.launch_funnel_alerts(stage) WHERE acknowledged_at IS NULL;

-- 4. Truth Panel view — single source of funnel counts
CREATE OR REPLACE VIEW public.v_launch_funnel
WITH (security_invoker = true)
AS
WITH lead_counts AS (
  SELECT lead_status, COUNT(*)::int AS n
  FROM public.launch_leads
  GROUP BY lead_status
),
events_24h AS (
  SELECT agent, event, success, COUNT(*)::int AS n
  FROM public.launch_pipeline_events
  WHERE created_at > now() - interval '24 hours'
  GROUP BY agent, event, success
),
today AS (
  SELECT
    COUNT(*) FILTER (WHERE event = 'outreach_sent' AND success AND payload->>'channel' = 'sms') AS sms_sent_today,
    COUNT(*) FILTER (WHERE event = 'outreach_sent' AND success AND payload->>'channel' = 'email') AS email_sent_today,
    COUNT(*) FILTER (WHERE event = 'checkout_started' AND success) AS checkouts_today,
    COUNT(*) FILTER (WHERE event = 'payment_completed' AND success) AS payments_today
  FROM public.launch_pipeline_events
  WHERE created_at > date_trunc('day', now())
)
SELECT
  COALESCE((SELECT SUM(n) FROM lead_counts WHERE lead_status IN ('DISCOVERED','ENRICHING','ENRICHED','SCORING','SCORED','MESSAGING','MESSAGED','DELIVERED','REPLIED','CHECKOUT_SENT','PAID','ACTIVATED')), 0)::int AS total_leads,
  COALESCE((SELECT n FROM lead_counts WHERE lead_status = 'DISCOVERED'), 0) AS stage_discovered,
  COALESCE((SELECT SUM(n) FROM lead_counts WHERE lead_status IN ('ENRICHED','SCORED','SCORING','ENRICHING')), 0)::int AS stage_enriched,
  COALESCE((SELECT SUM(n) FROM lead_counts WHERE lead_status IN ('MESSAGED','DELIVERED','REPLIED','CHECKOUT_SENT','PAID','ACTIVATED')), 0)::int AS stage_messaged,
  COALESCE((SELECT SUM(n) FROM lead_counts WHERE lead_status IN ('DELIVERED','REPLIED','CHECKOUT_SENT','PAID','ACTIVATED')), 0)::int AS stage_delivered,
  COALESCE((SELECT SUM(n) FROM lead_counts WHERE lead_status IN ('REPLIED','CHECKOUT_SENT','PAID','ACTIVATED')), 0)::int AS stage_opened_or_replied,
  COALESCE((SELECT SUM(n) FROM lead_counts WHERE lead_status IN ('CHECKOUT_SENT','PAID','ACTIVATED')), 0)::int AS stage_checkout_started,
  COALESCE((SELECT SUM(n) FROM lead_counts WHERE lead_status IN ('PAID','ACTIVATED')), 0)::int AS stage_paid,
  COALESCE((SELECT n FROM lead_counts WHERE lead_status = 'ACTIVATED'), 0) AS stage_activated,
  COALESCE((SELECT n FROM lead_counts WHERE lead_status = 'BLOCKED'), 0) AS stage_blocked,
  COALESCE((SELECT n FROM lead_counts WHERE lead_status = 'FAILED'), 0) AS stage_failed,
  (SELECT sms_sent_today FROM today)::int AS sms_sent_today,
  (SELECT email_sent_today FROM today)::int AS email_sent_today,
  (SELECT checkouts_today FROM today)::int AS checkouts_today,
  (SELECT payments_today FROM today)::int AS payments_today,
  (SELECT COUNT(*) FROM public.launch_leads WHERE activated_at::date = current_date)::int AS activations_today,
  COALESCE((SELECT SUM(mrr_cents)::bigint FROM public.launch_leads WHERE activated_at::date = current_date), 0) AS mrr_today_cents,
  COALESCE((SELECT SUM(mrr_cents)::bigint FROM public.launch_leads WHERE lead_status = 'ACTIVATED'), 0) AS mrr_total_cents,
  COALESCE((SELECT SUM(recommended_plan_cents)::bigint FROM public.launch_leads WHERE lead_status IN ('MESSAGED','DELIVERED','REPLIED','CHECKOUT_SENT','PAID')), 0) AS pipeline_value_cents,
  (SELECT MAX(activated_at) FROM public.launch_leads) AS last_activation_at;

GRANT SELECT ON public.v_launch_funnel TO authenticated;
GRANT SELECT ON public.v_launch_funnel TO service_role;

-- 5. Agent health view — last 24h success rate per agent
CREATE OR REPLACE VIEW public.v_launch_agent_health
WITH (security_invoker = true)
AS
SELECT
  agent,
  COUNT(*)::int AS runs_24h,
  COUNT(*) FILTER (WHERE success)::int AS success_24h,
  COUNT(*) FILTER (WHERE NOT success)::int AS failures_24h,
  ROUND(100.0 * COUNT(*) FILTER (WHERE success) / GREATEST(COUNT(*), 1), 1)::numeric AS success_pct,
  MAX(created_at) AS last_run_at,
  (
    SELECT message FROM public.launch_pipeline_events e2
    WHERE e2.agent = e.agent AND NOT e2.success AND e2.message IS NOT NULL
    ORDER BY created_at DESC LIMIT 1
  ) AS last_error
FROM public.launch_pipeline_events e
WHERE created_at > now() - interval '24 hours'
GROUP BY agent;

GRANT SELECT ON public.v_launch_agent_health TO authenticated;
GRANT SELECT ON public.v_launch_agent_health TO service_role;
