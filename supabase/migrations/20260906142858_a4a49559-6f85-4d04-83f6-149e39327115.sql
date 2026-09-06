ALTER TABLE public.contractor_funnel_events
  ADD COLUMN IF NOT EXISTS prospect_id uuid,
  ADD COLUMN IF NOT EXISTS token text,
  ADD COLUMN IF NOT EXISTS affiliate_code text,
  ADD COLUMN IF NOT EXISTS utm_source text,
  ADD COLUMN IF NOT EXISTS utm_medium text,
  ADD COLUMN IF NOT EXISTS utm_campaign text,
  ADD COLUMN IF NOT EXISTS is_test boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_cfe_created_at ON public.contractor_funnel_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cfe_session ON public.contractor_funnel_events (session_id);
CREATE INDEX IF NOT EXISTS idx_cfe_event_type ON public.contractor_funnel_events (event_type);
CREATE INDEX IF NOT EXISTS idx_cfe_prospect ON public.contractor_funnel_events (prospect_id) WHERE prospect_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cfe_affiliate ON public.contractor_funnel_events (affiliate_code) WHERE affiliate_code IS NOT NULL;

CREATE OR REPLACE VIEW public.v_contractor_funnel_canonical
WITH (security_invoker = true) AS
SELECT
  date_trunc('day', created_at)::date AS day,
  event_type,
  count(*)                            AS events,
  count(DISTINCT session_id)          AS sessions,
  count(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL)               AS users,
  count(DISTINCT affiliate_code) FILTER (WHERE affiliate_code IS NOT NULL) AS affiliates,
  count(*) FILTER (WHERE token IS NOT NULL)                                AS tokenized
FROM public.contractor_funnel_events
WHERE is_test = false
GROUP BY 1, 2;

GRANT SELECT ON public.v_contractor_funnel_canonical TO authenticated;
GRANT ALL ON public.v_contractor_funnel_canonical TO service_role;