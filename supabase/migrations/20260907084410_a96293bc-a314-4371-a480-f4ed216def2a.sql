ALTER TABLE public.contractor_funnel_events
  ADD COLUMN IF NOT EXISTS channel text,
  ADD COLUMN IF NOT EXISTS provider text,
  ADD COLUMN IF NOT EXISTS provider_message_id text,
  ADD COLUMN IF NOT EXISTS template_version text,
  ADD COLUMN IF NOT EXISTS environment text,
  ADD COLUMN IF NOT EXISTS failure_reason text,
  ADD COLUMN IF NOT EXISTS dedupe_key text;

CREATE UNIQUE INDEX IF NOT EXISTS contractor_funnel_events_dedupe_key_uidx
  ON public.contractor_funnel_events (dedupe_key) WHERE dedupe_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS contractor_funnel_events_type_created_idx
  ON public.contractor_funnel_events (event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS contractor_funnel_events_prospect_idx
  ON public.contractor_funnel_events (prospect_id) WHERE prospect_id IS NOT NULL;

CREATE OR REPLACE VIEW public.v_contractor_funnel_baseline
WITH (security_invoker = true) AS
SELECT
  event_type,
  channel,
  count(*)::bigint AS events,
  count(DISTINCT COALESCE(prospect_id::text, contractor_id::text, session_id))::bigint AS subjects,
  max(created_at) AS last_at
FROM public.contractor_funnel_events
WHERE is_test IS NOT TRUE
GROUP BY event_type, channel;

REVOKE ALL ON public.v_contractor_funnel_baseline FROM anon, authenticated;
GRANT SELECT ON public.v_contractor_funnel_baseline TO service_role;