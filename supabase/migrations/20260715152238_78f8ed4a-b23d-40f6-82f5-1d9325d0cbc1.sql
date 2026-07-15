
-- Acquisition Pipeline: visibility layer

-- 1. Add source + rejection tracking columns to prospects
ALTER TABLE public.verified_contractor_prospects
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS rejection_reason_code TEXT,
  ADD COLUMN IF NOT EXISTS rejection_reason_text TEXT,
  ADD COLUMN IF NOT EXISTS last_action_at TIMESTAMPTZ DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_vcp_source ON public.verified_contractor_prospects(source);
CREATE INDEX IF NOT EXISTS idx_vcp_rejection ON public.verified_contractor_prospects(rejection_reason_code) WHERE rejection_reason_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vcp_city_cat ON public.verified_contractor_prospects(city, category);

-- 2. Pipeline events (append-only)
CREATE TABLE IF NOT EXISTS public.acquisition_pipeline_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id UUID REFERENCES public.verified_contractor_prospects(id) ON DELETE SET NULL,
  business_name TEXT,
  city TEXT,
  category TEXT,
  source TEXT,
  stage TEXT NOT NULL CHECK (stage IN ('scraped','enriching','enriched','verified','ready_sms','ready_email','contacted','delivered','clicked','activated','rejected','duplicate','worker_cycle')),
  reason_code TEXT,
  reason_text TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.acquisition_pipeline_events TO authenticated;
GRANT ALL ON public.acquisition_pipeline_events TO service_role;

ALTER TABLE public.acquisition_pipeline_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read pipeline events"
  ON public.acquisition_pipeline_events FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role manages pipeline events"
  ON public.acquisition_pipeline_events FOR ALL
  TO service_role USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_ape_created ON public.acquisition_pipeline_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ape_stage ON public.acquisition_pipeline_events(stage);
CREATE INDEX IF NOT EXISTS idx_ape_prospect ON public.acquisition_pipeline_events(prospect_id);
CREATE INDEX IF NOT EXISTS idx_ape_city_cat ON public.acquisition_pipeline_events(city, category);
CREATE INDEX IF NOT EXISTS idx_ape_reason ON public.acquisition_pipeline_events(reason_code) WHERE reason_code IS NOT NULL;

-- 3. Funnel view (last 24h aggregated by stage / source)
CREATE OR REPLACE VIEW public.v_acquisition_funnel_daily
WITH (security_invoker=on) AS
SELECT
  stage,
  COALESCE(source,'unknown') AS source,
  COALESCE(city,'unknown') AS city,
  COALESCE(category,'unknown') AS category,
  COUNT(*)::int AS count
FROM public.acquisition_pipeline_events
WHERE created_at > now() - interval '24 hours'
GROUP BY stage, source, city, category;

GRANT SELECT ON public.v_acquisition_funnel_daily TO authenticated;

-- 4. Coverage view (verified count per city × category)
CREATE OR REPLACE VIEW public.v_acquisition_coverage
WITH (security_invoker=on) AS
SELECT
  COALESCE(city,'unknown') AS city,
  COALESCE(category,'unknown') AS category,
  COUNT(*) FILTER (WHERE verification_status='verified')::int AS verified_count,
  COUNT(*) FILTER (WHERE outreach_status IN ('ready','ready_sms','ready_email'))::int AS ready_count,
  COUNT(*) FILTER (WHERE outreach_status='contacted' OR outreach_status='sent')::int AS contacted_count,
  COUNT(*)::int AS total_count
FROM public.verified_contractor_prospects
GROUP BY city, category;

GRANT SELECT ON public.v_acquisition_coverage TO authenticated;

-- 5. Rejection reasons (top 24h)
CREATE OR REPLACE VIEW public.v_acquisition_rejection_reasons
WITH (security_invoker=on) AS
SELECT
  reason_code,
  MAX(reason_text) AS sample_reason_text,
  COUNT(*)::int AS count
FROM public.acquisition_pipeline_events
WHERE stage='rejected'
  AND reason_code IS NOT NULL
  AND created_at > now() - interval '24 hours'
GROUP BY reason_code
ORDER BY count DESC;

GRANT SELECT ON public.v_acquisition_rejection_reasons TO authenticated;
