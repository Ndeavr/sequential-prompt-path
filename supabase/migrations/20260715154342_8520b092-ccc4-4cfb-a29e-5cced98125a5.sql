-- Acquisition Health + Diagnostics + First Dollar Repair Layer

CREATE TABLE IF NOT EXISTS public.acquisition_source_health (
  source text PRIMARY KEY CHECK (source IN ('google_business','rbq','facebook','website','manual')),
  status text NOT NULL DEFAULT 'scraper_down' CHECK (status IN ('healthy','degraded','scraper_down','fallback_running')),
  last_run_at timestamptz,
  last_success_at timestamptz,
  found_last_run integer NOT NULL DEFAULT 0 CHECK (found_last_run >= 0),
  found_24h integer NOT NULL DEFAULT 0 CHECK (found_24h >= 0),
  consecutive_zero_runs integer NOT NULL DEFAULT 0 CHECK (consecutive_zero_runs >= 0),
  last_error_code text,
  last_error_message text,
  fallback_started_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.acquisition_source_health TO authenticated;
GRANT ALL ON public.acquisition_source_health TO service_role;
ALTER TABLE public.acquisition_source_health ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can read acquisition source health" ON public.acquisition_source_health;
CREATE POLICY "Admins can read acquisition source health"
  ON public.acquisition_source_health FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Admins can manage acquisition source health" ON public.acquisition_source_health;
CREATE POLICY "Admins can manage acquisition source health"
  ON public.acquisition_source_health FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Service role manages acquisition source health" ON public.acquisition_source_health;
CREATE POLICY "Service role manages acquisition source health"
  ON public.acquisition_source_health FOR ALL
  TO service_role USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.acquisition_dead_queue_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id uuid REFERENCES public.verified_contractor_prospects(id) ON DELETE SET NULL,
  alert_type text NOT NULL DEFAULT 'OUTREACH_BLOCKED',
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','repairing','resolved','ignored')),
  root_cause text NOT NULL,
  reason text,
  queue_state text,
  detected_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  repair_attempts integer NOT NULL DEFAULT 0 CHECK (repair_attempts >= 0),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.acquisition_dead_queue_alerts TO authenticated;
GRANT ALL ON public.acquisition_dead_queue_alerts TO service_role;
ALTER TABLE public.acquisition_dead_queue_alerts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can read acquisition dead queue alerts" ON public.acquisition_dead_queue_alerts;
CREATE POLICY "Admins can read acquisition dead queue alerts"
  ON public.acquisition_dead_queue_alerts FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Admins can manage acquisition dead queue alerts" ON public.acquisition_dead_queue_alerts;
CREATE POLICY "Admins can manage acquisition dead queue alerts"
  ON public.acquisition_dead_queue_alerts FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Service role manages acquisition dead queue alerts" ON public.acquisition_dead_queue_alerts;
CREATE POLICY "Service role manages acquisition dead queue alerts"
  ON public.acquisition_dead_queue_alerts FOR ALL
  TO service_role USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_adqa_status_detected ON public.acquisition_dead_queue_alerts(status, detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_adqa_prospect_open ON public.acquisition_dead_queue_alerts(prospect_id) WHERE status IN ('open','repairing');

CREATE TABLE IF NOT EXISTS public.acquisition_daily_audits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_date date NOT NULL DEFAULT current_date,
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running','healthy','warning','critical','failed')),
  health_score integer NOT NULL DEFAULT 0 CHECK (health_score >= 0 AND health_score <= 100),
  root_causes jsonb NOT NULL DEFAULT '[]'::jsonb,
  recovery_actions jsonb NOT NULL DEFAULT '[]'::jsonb,
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (audit_date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.acquisition_daily_audits TO authenticated;
GRANT ALL ON public.acquisition_daily_audits TO service_role;
ALTER TABLE public.acquisition_daily_audits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can read acquisition daily audits" ON public.acquisition_daily_audits;
CREATE POLICY "Admins can read acquisition daily audits"
  ON public.acquisition_daily_audits FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Admins can manage acquisition daily audits" ON public.acquisition_daily_audits;
CREATE POLICY "Admins can manage acquisition daily audits"
  ON public.acquisition_daily_audits FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Service role manages acquisition daily audits" ON public.acquisition_daily_audits;
CREATE POLICY "Service role manages acquisition daily audits"
  ON public.acquisition_daily_audits FOR ALL
  TO service_role USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_ada_date ON public.acquisition_daily_audits(audit_date DESC);

CREATE TABLE IF NOT EXISTS public.acquisition_manual_import_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','completed','failed')),
  source text NOT NULL DEFAULT 'manual',
  row_count integer NOT NULL DEFAULT 0 CHECK (row_count >= 0),
  imported_count integer NOT NULL DEFAULT 0 CHECK (imported_count >= 0),
  verified_count integer NOT NULL DEFAULT 0 CHECK (verified_count >= 0),
  queued_count integer NOT NULL DEFAULT 0 CHECK (queued_count >= 0),
  sent_count integer NOT NULL DEFAULT 0 CHECK (sent_count >= 0),
  error_count integer NOT NULL DEFAULT 0 CHECK (error_count >= 0),
  errors jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by uuid,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.acquisition_manual_import_batches TO authenticated;
GRANT ALL ON public.acquisition_manual_import_batches TO service_role;
ALTER TABLE public.acquisition_manual_import_batches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can read acquisition import batches" ON public.acquisition_manual_import_batches;
CREATE POLICY "Admins can read acquisition import batches"
  ON public.acquisition_manual_import_batches FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Admins can manage acquisition import batches" ON public.acquisition_manual_import_batches;
CREATE POLICY "Admins can manage acquisition import batches"
  ON public.acquisition_manual_import_batches FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Service role manages acquisition import batches" ON public.acquisition_manual_import_batches;
CREATE POLICY "Service role manages acquisition import batches"
  ON public.acquisition_manual_import_batches FOR ALL
  TO service_role USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_amib_created ON public.acquisition_manual_import_batches(created_at DESC);

CREATE TABLE IF NOT EXISTS public.acquisition_manual_import_rows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES public.acquisition_manual_import_batches(id) ON DELETE CASCADE,
  prospect_id uuid REFERENCES public.verified_contractor_prospects(id) ON DELETE SET NULL,
  row_number integer NOT NULL,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','imported','verified','queued_outreach','sent','failed','duplicate')),
  company text,
  contact text,
  phone text,
  email text,
  website text,
  city text,
  category text,
  normalized jsonb NOT NULL DEFAULT '{}'::jsonb,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.acquisition_manual_import_rows TO authenticated;
GRANT ALL ON public.acquisition_manual_import_rows TO service_role;
ALTER TABLE public.acquisition_manual_import_rows ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can read acquisition import rows" ON public.acquisition_manual_import_rows;
CREATE POLICY "Admins can read acquisition import rows"
  ON public.acquisition_manual_import_rows FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Admins can manage acquisition import rows" ON public.acquisition_manual_import_rows;
CREATE POLICY "Admins can manage acquisition import rows"
  ON public.acquisition_manual_import_rows FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Service role manages acquisition import rows" ON public.acquisition_manual_import_rows;
CREATE POLICY "Service role manages acquisition import rows"
  ON public.acquisition_manual_import_rows FOR ALL
  TO service_role USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_amir_batch ON public.acquisition_manual_import_rows(batch_id, row_number);
CREATE INDEX IF NOT EXISTS idx_amir_status ON public.acquisition_manual_import_rows(status, created_at DESC);

CREATE OR REPLACE VIEW public.v_acquisition_source_health
WITH (security_invoker=on) AS
SELECT
  s.source,
  COALESCE(h.status, 'scraper_down') AS status,
  h.last_run_at,
  h.last_success_at,
  COALESCE(h.found_last_run, 0)::int AS found_last_run,
  COALESCE(h.found_24h, 0)::int AS found_24h,
  COALESCE(h.consecutive_zero_runs, 0)::int AS consecutive_zero_runs,
  h.last_error_code,
  h.last_error_message,
  h.fallback_started_at,
  CASE
    WHEN h.source IS NULL THEN 'SCRAPER DOWN'
    WHEN h.status = 'scraper_down' THEN 'SCRAPER DOWN'
    WHEN h.status = 'fallback_running' THEN 'FALLBACK RUNNING'
    WHEN h.status = 'degraded' THEN 'DEGRADED'
    ELSE 'HEALTHY'
  END AS display_status,
  CASE
    WHEN h.source IS NULL THEN true
    WHEN h.status = 'scraper_down' THEN true
    WHEN h.last_run_at IS NULL THEN true
    WHEN h.last_run_at < now() - interval '24 hours' THEN true
    ELSE false
  END AS is_down
FROM (VALUES
  ('google_business'::text),
  ('rbq'::text),
  ('facebook'::text),
  ('website'::text),
  ('manual'::text)
) AS s(source)
LEFT JOIN public.acquisition_source_health h ON h.source = s.source;
GRANT SELECT ON public.v_acquisition_source_health TO authenticated;

CREATE OR REPLACE VIEW public.v_acquisition_coverage
WITH (security_invoker=on) AS
SELECT
  COALESCE(v.city,'unknown') AS city,
  COALESCE(v.category,'unknown') AS category,
  COUNT(*) FILTER (WHERE v.verification_status='verified')::int AS verified_count,
  COUNT(*) FILTER (WHERE q.state IN ('ready_sms','ready_email') OR v.outreach_status IN ('ready','ready_sms','ready_email'))::int AS ready_count,
  COUNT(*) FILTER (WHERE v.outreach_status IN ('contacted','sent','delivered','clicked','activated') OR q.state='contacted')::int AS contacted_count,
  COUNT(*)::int AS total_count
FROM public.verified_contractor_prospects v
LEFT JOIN public.acquisition_queue q ON q.prospect_id = v.id
GROUP BY v.city, v.category;
GRANT SELECT ON public.v_acquisition_coverage TO authenticated;

CREATE OR REPLACE VIEW public.v_acquisition_diagnostics_funnel
WITH (security_invoker=on) AS
WITH counts AS (
  SELECT 'found'::text AS step_key, 'Found'::text AS label, 1 AS sort_order,
    GREATEST(
      (SELECT COUNT(*) FROM public.acquisition_pipeline_events WHERE stage='scraped'),
      (SELECT COUNT(*) FROM public.verified_contractor_prospects),
      (SELECT COUNT(*) FROM public.acquisition_manual_import_rows WHERE status IN ('imported','verified','queued_outreach','sent'))
    )::int AS count
  UNION ALL SELECT 'enriched','Enriched',2,
    GREATEST(
      (SELECT COUNT(*) FROM public.acquisition_pipeline_events WHERE stage IN ('enriched','verified','ready_sms','ready_email','contacted','activated')),
      (SELECT COUNT(*) FROM public.verified_contractor_prospects WHERE email IS NOT NULL OR phone_e164 IS NOT NULL OR phone_primary IS NOT NULL OR website_url IS NOT NULL)
    )::int
  UNION ALL SELECT 'validated','Validated',3,
    (SELECT COUNT(*) FROM public.verified_contractor_prospects WHERE verification_status='verified')::int
  UNION ALL SELECT 'sms_ready','SMS Ready',4,
    (SELECT COUNT(*) FROM public.acquisition_queue q JOIN public.verified_contractor_prospects v ON v.id=q.prospect_id WHERE q.state='ready_sms' AND v.verification_status='verified')::int
  UNION ALL SELECT 'contacted','Contacted',5,
    GREATEST(
      (SELECT COUNT(*) FROM public.acq_sms_logs WHERE COALESCE(is_simulation,false)=false),
      (SELECT COUNT(*) FROM public.verified_contractor_prospects WHERE outreach_status IN ('sent','delivered','clicked','activated')),
      (SELECT COUNT(*) FROM public.acquisition_pipeline_events WHERE stage IN ('contacted','delivered','clicked','activated'))
    )::int
  UNION ALL SELECT 'clicked','Clicked',6,
    GREATEST(
      (SELECT COUNT(*) FROM public.click_events),
      (SELECT COUNT(*) FROM public.acquisition_pipeline_events WHERE stage IN ('clicked','activated'))
    )::int
  UNION ALL SELECT 'activated','Activated',7,
    GREATEST(
      (SELECT COUNT(*) FROM public.verified_contractor_prospects WHERE outreach_status='activated'),
      (SELECT COUNT(*) FROM public.acquisition_pipeline_events WHERE stage='activated'),
      (SELECT COUNT(*) FROM public.contractor_leads WHERE onboarding_started_at IS NOT NULL)
    )::int
  UNION ALL SELECT 'paid','Paid',8,
    GREATEST(
      (SELECT COUNT(*) FROM public.acq_payment_events),
      (SELECT COUNT(*) FROM public.contractor_leads WHERE paid_at IS NOT NULL),
      (SELECT COUNT(*) FROM public.contractor_recruitment_payments WHERE payment_status IN ('paid','succeeded','completed') OR paid_at IS NOT NULL)
    )::int
), with_prev AS (
  SELECT c.*, LAG(c.count) OVER (ORDER BY c.sort_order) AS previous_count
  FROM counts c
)
SELECT
  step_key,
  label,
  sort_order,
  count,
  previous_count,
  CASE
    WHEN previous_count IS NULL THEN NULL
    WHEN previous_count = 0 THEN 0
    ELSE ROUND((count::numeric / previous_count::numeric) * 100, 1)
  END AS conversion_from_previous_pct
FROM with_prev
ORDER BY sort_order;
GRANT SELECT ON public.v_acquisition_diagnostics_funnel TO authenticated;

CREATE OR REPLACE VIEW public.v_acquisition_dead_queue
WITH (security_invoker=on) AS
SELECT
  v.id AS prospect_id,
  v.business_name,
  v.city,
  v.category,
  v.phone_e164,
  v.email,
  v.website_url,
  v.verification_status,
  v.outreach_status,
  q.state AS queue_state,
  COALESCE(v.last_action_at, v.updated_at) AS last_action_at,
  CASE
    WHEN v.phone_e164 IS NULL AND v.phone_primary IS NULL THEN 'missing_phone'
    WHEN v.website_url IS NULL THEN 'missing_website'
    WHEN q.id IS NULL THEN 'queue_state_mismatch'
    WHEN q.state NOT IN ('ready_sms','ready_email','contacted') THEN 'eligibility_mismatch'
    WHEN v.outreach_status = 'failed' THEN 'send_function_error'
    ELSE 'queue_state_mismatch'
  END AS root_cause
FROM public.verified_contractor_prospects v
LEFT JOIN public.acquisition_queue q ON q.prospect_id = v.id
WHERE v.verification_status = 'verified'
  AND COALESCE(v.outreach_status, 'none') NOT IN ('sent','delivered','clicked','activated')
  AND COALESCE(v.last_action_at, v.updated_at, v.created_at) < now() - interval '30 minutes';
GRANT SELECT ON public.v_acquisition_dead_queue TO authenticated;

CREATE OR REPLACE VIEW public.v_first_dollar_tracker
WITH (security_invoker=on) AS
SELECT
  (SELECT MIN(created_at) FROM public.acq_sms_logs WHERE COALESCE(is_simulation,false)=false AND status IN ('sent','queued','delivered')) AS first_sms_sent_at,
  (SELECT MIN(created_at) FROM public.click_events) AS first_click_at,
  (SELECT MIN(created_at) FROM public.contractor_leads WHERE onboarding_started_at IS NOT NULL) AS first_activation_at,
  COALESCE(
    (SELECT MIN(created_at) FROM public.acq_payment_events),
    (SELECT MIN(paid_at) FROM public.contractor_leads WHERE paid_at IS NOT NULL),
    (SELECT MIN(paid_at) FROM public.contractor_recruitment_payments WHERE payment_status IN ('paid','succeeded','completed') OR paid_at IS NOT NULL)
  ) AS first_paid_at,
  (SELECT MIN(created_at) FROM public.appointments WHERE status::text IN ('scheduled','confirmed','completed')) AS first_appointment_at,
  CASE
    WHEN (SELECT MIN(created_at) FROM public.acq_sms_logs WHERE COALESCE(is_simulation,false)=false AND status IN ('sent','queued','delivered')) IS NULL THEN 'First SMS Sent'
    WHEN (SELECT MIN(created_at) FROM public.click_events) IS NULL THEN 'First Click'
    WHEN (SELECT MIN(created_at) FROM public.contractor_leads WHERE onboarding_started_at IS NOT NULL) IS NULL THEN 'First Activation'
    WHEN COALESCE((SELECT MIN(created_at) FROM public.acq_payment_events), (SELECT MIN(paid_at) FROM public.contractor_leads WHERE paid_at IS NOT NULL), (SELECT MIN(paid_at) FROM public.contractor_recruitment_payments WHERE payment_status IN ('paid','succeeded','completed') OR paid_at IS NOT NULL)) IS NULL THEN 'First $1 Payment'
    WHEN (SELECT MIN(created_at) FROM public.appointments WHERE status::text IN ('scheduled','confirmed','completed')) IS NULL THEN 'First Appointment'
    ELSE 'Scale'
  END AS next_missing_milestone;
GRANT SELECT ON public.v_first_dollar_tracker TO authenticated;

INSERT INTO public.acquisition_source_health (source, status, last_error_code, last_error_message)
VALUES
  ('google_business','scraper_down','not_running','Aucun run source enregistré'),
  ('rbq','scraper_down','not_running','Aucun run source enregistré'),
  ('facebook','scraper_down','not_running','Aucun run source enregistré'),
  ('website','scraper_down','not_running','Aucun run source enregistré'),
  ('manual','healthy',NULL,NULL)
ON CONFLICT (source) DO NOTHING;
