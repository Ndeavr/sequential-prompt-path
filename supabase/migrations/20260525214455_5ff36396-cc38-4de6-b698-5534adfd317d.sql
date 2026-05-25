
-- 1. Extend autopilot_runs with new columns
ALTER TABLE public.autopilot_runs
  ADD COLUMN IF NOT EXISTS block_reason text,
  ADD COLUMN IF NOT EXISTS last_step text,
  ADD COLUMN IF NOT EXISTS next_action text,
  ADD COLUMN IF NOT EXISTS alert_admin boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS target_count integer,
  ADD COLUMN IF NOT EXISTS scraped_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deduplicated_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS enriched_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS scored_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS personalized_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sent_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS opened_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS clicked_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS checkout_started_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS paid_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS activated_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pending_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS failed_count integer NOT NULL DEFAULT 0;

-- Backfill target_count from target_limit
UPDATE public.autopilot_runs SET target_count = target_limit WHERE target_count IS NULL;

-- Backfill scraped/enriched counts from outbound_companies
UPDATE public.autopilot_runs r
SET scraped_count = sub.s,
    enriched_count = sub.e
FROM (
  SELECT autopilot_run_id, count(*) AS s,
         count(*) FILTER (WHERE email IS NOT NULL OR website_url IS NOT NULL) AS e
  FROM public.outbound_companies
  WHERE autopilot_run_id IS NOT NULL
  GROUP BY autopilot_run_id
) sub
WHERE r.id = sub.autopilot_run_id;

-- 2. Migrate legacy `done`/`completed` rows with 0 scraped
UPDATE public.autopilot_runs
SET status = CASE
      WHEN dry_run THEN 'dry_run_completed'
      ELSE 'blocked'
    END,
    block_reason = CASE
      WHEN dry_run THEN 'Mode test : aucune entreprise réellement scrapée.'
      ELSE 'legacy_zero_scrape: aucun prospect scrapé, run marqué terminé à tort'
    END,
    next_action = CASE
      WHEN dry_run THEN 'Approuver pour scrape live ou relancer'
      ELSE 'Vérifier sources et relancer le scraping'
    END,
    alert_admin = NOT dry_run,
    last_step = 'scrape_targets'
WHERE status IN ('done','completed') AND COALESCE(scraped_count, 0) = 0;

-- Map other legacy `done` → `completed` (real successes)
UPDATE public.autopilot_runs
SET status = 'completed'
WHERE status = 'done' AND COALESCE(scraped_count, 0) > 0;

-- 3. Strict status check constraint
ALTER TABLE public.autopilot_runs DROP CONSTRAINT IF EXISTS autopilot_runs_status_check;
ALTER TABLE public.autopilot_runs
  ADD CONSTRAINT autopilot_runs_status_check CHECK (status IN (
    'queued','validating','scraping','deduplicating','enriching','scoring',
    'personalizing','waiting_approval','dry_run_completed','sending','tracking',
    'payment_pending','paid','activated','completed','blocked','failed','pending'
  ));

-- 4. outbound_run_logs
CREATE TABLE IF NOT EXISTS public.outbound_run_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.autopilot_runs(id) ON DELETE CASCADE,
  step text NOT NULL,
  status text NOT NULL,
  message text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_outbound_run_logs_run ON public.outbound_run_logs(run_id, created_at DESC);

ALTER TABLE public.outbound_run_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "outbound_run_logs admin all" ON public.outbound_run_logs;
CREATE POLICY "outbound_run_logs admin all"
  ON public.outbound_run_logs FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 5. outbound_admin_alerts
CREATE TABLE IF NOT EXISTS public.outbound_admin_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid REFERENCES public.autopilot_runs(id) ON DELETE CASCADE,
  severity text NOT NULL DEFAULT 'warning',
  title text NOT NULL,
  message text,
  missing_component text,
  suggested_fix text,
  resolved boolean NOT NULL DEFAULT false,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_outbound_admin_alerts_open
  ON public.outbound_admin_alerts(resolved, created_at DESC);

ALTER TABLE public.outbound_admin_alerts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "outbound_admin_alerts admin all" ON public.outbound_admin_alerts;
CREATE POLICY "outbound_admin_alerts admin all"
  ON public.outbound_admin_alerts FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 6. Update view to expose new fields
DROP VIEW IF EXISTS public.v_autopilot_pipeline;
CREATE VIEW public.v_autopilot_pipeline
WITH (security_invoker = true) AS
SELECT
  r.id AS run_id,
  r.trade,
  r.cities,
  r.status AS run_status,
  r.current_stage,
  r.last_step,
  r.next_action,
  r.block_reason,
  r.alert_admin,
  r.dry_run,
  r.target_limit,
  COALESCE(r.target_count, r.target_limit) AS target_count,
  r.stats,
  r.error_message,
  r.created_at,
  r.started_at,
  r.finished_at,
  GREATEST(r.scraped_count, COALESCE(co.scraped, 0)) AS scraped_count,
  GREATEST(r.enriched_count, COALESCE(co.enriched, 0)) AS enriched_count,
  r.deduplicated_count,
  r.scored_count,
  r.personalized_count,
  r.sent_count,
  r.opened_count,
  GREATEST(r.clicked_count, COALESCE(cl.clicks, 0)) AS clicked_count,
  r.checkout_started_count,
  r.paid_count,
  r.activated_count,
  r.pending_count,
  r.failed_count
FROM public.autopilot_runs r
LEFT JOIN (
  SELECT autopilot_run_id,
         count(*) AS scraped,
         count(*) FILTER (WHERE email IS NOT NULL OR website_url IS NOT NULL) AS enriched
  FROM public.outbound_companies
  WHERE autopilot_run_id IS NOT NULL
  GROUP BY autopilot_run_id
) co ON co.autopilot_run_id = r.id
LEFT JOIN (
  SELECT c.autopilot_run_id, count(cl.id) AS clicks
  FROM public.outbound_companies c
  LEFT JOIN public.outbound_clicks cl ON cl.company_id = c.id
  WHERE c.autopilot_run_id IS NOT NULL
  GROUP BY c.autopilot_run_id
) cl ON cl.autopilot_run_id = r.id;
