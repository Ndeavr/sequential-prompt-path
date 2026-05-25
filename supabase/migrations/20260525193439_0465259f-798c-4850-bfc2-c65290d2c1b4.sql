-- Extend outbound_companies
ALTER TABLE public.outbound_companies
  ADD COLUMN IF NOT EXISTS trade text,
  ADD COLUMN IF NOT EXISTS google_place_id text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS neq_number text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS postal_code text,
  ADD COLUMN IF NOT EXISTS services jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS autopilot_run_id uuid;

UPDATE public.outbound_companies SET trade = specialty WHERE trade IS NULL AND specialty IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_outbound_companies_google_place_id ON public.outbound_companies(google_place_id) WHERE google_place_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_outbound_companies_trade_city ON public.outbound_companies(trade, city, business_status);
CREATE INDEX IF NOT EXISTS idx_outbound_companies_autopilot_run ON public.outbound_companies(autopilot_run_id);

-- Autopilot runs
CREATE TABLE IF NOT EXISTS public.autopilot_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trade text NOT NULL,
  cities text[] NOT NULL DEFAULT '{}',
  target_limit integer NOT NULL DEFAULT 50,
  dry_run boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'pending',
  current_stage text,
  stats jsonb NOT NULL DEFAULT '{}'::jsonb,
  error_message text,
  triggered_by uuid REFERENCES auth.users(id),
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.autopilot_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "autopilot_runs admin all" ON public.autopilot_runs;
CREATE POLICY "autopilot_runs admin all" ON public.autopilot_runs
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP TRIGGER IF EXISTS set_autopilot_runs_updated_at ON public.autopilot_runs;
CREATE TRIGGER set_autopilot_runs_updated_at
  BEFORE UPDATE ON public.autopilot_runs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_autopilot_runs_status ON public.autopilot_runs(status, created_at DESC);

-- Simple pipeline view
CREATE OR REPLACE VIEW public.v_autopilot_pipeline
WITH (security_invoker = true) AS
SELECT
  r.id AS run_id,
  r.trade,
  r.cities,
  r.status AS run_status,
  r.current_stage,
  r.dry_run,
  r.target_limit,
  r.stats,
  r.error_message,
  r.created_at,
  r.started_at,
  r.finished_at,
  COUNT(DISTINCT c.id) AS scraped_count,
  COUNT(DISTINCT c.id) FILTER (WHERE c.email IS NOT NULL OR c.website_url IS NOT NULL) AS enriched_count,
  COUNT(DISTINCT cl.id) AS clicked_count
FROM public.autopilot_runs r
LEFT JOIN public.outbound_companies c ON c.autopilot_run_id = r.id
LEFT JOIN public.outbound_clicks cl ON cl.company_id = c.id
GROUP BY r.id;

GRANT SELECT ON public.v_autopilot_pipeline TO authenticated;