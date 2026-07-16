
-- 1. contractor_verification_status
CREATE TABLE IF NOT EXISTS public.contractor_verification_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID NOT NULL,
  dimension TEXT NOT NULL CHECK (dimension IN ('identity','rbq','neq','website','google_business','reviews_imported','photos','insurance')),
  status TEXT NOT NULL DEFAULT 'unknown' CHECK (status IN ('verified','partial','missing','unknown','expiring')),
  evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  source TEXT,
  last_checked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_success_at TIMESTAMPTZ,
  failure_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(contractor_id, dimension)
);
CREATE INDEX IF NOT EXISTS idx_cvs_contractor ON public.contractor_verification_status(contractor_id);
CREATE INDEX IF NOT EXISTS idx_cvs_status ON public.contractor_verification_status(status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.contractor_verification_status TO authenticated;
GRANT ALL ON public.contractor_verification_status TO service_role;
ALTER TABLE public.contractor_verification_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cvs_admin_all" ON public.contractor_verification_status
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));

CREATE POLICY "cvs_contractor_read_own" ON public.contractor_verification_status
  FOR SELECT TO authenticated
  USING (contractor_id IN (SELECT c.id FROM public.contractors c WHERE c.user_id = auth.uid()));

-- 2. contractor_business_analysis
CREATE TABLE IF NOT EXISTS public.contractor_business_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID NOT NULL UNIQUE,
  web_presence_score NUMERIC,
  reputation_score NUMERIC,
  profile_completeness NUMERIC,
  data_consistency NUMERIC,
  geo_coverage NUMERIC,
  content_quality NUMERIC,
  seniority_score NUMERIC,
  found JSONB NOT NULL DEFAULT '[]'::jsonb,
  missing JSONB NOT NULL DEFAULT '[]'::jsonb,
  recommended_actions JSONB NOT NULL DEFAULT '[]'::jsonb,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contractor_business_analysis TO authenticated;
GRANT ALL ON public.contractor_business_analysis TO service_role;
ALTER TABLE public.contractor_business_analysis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cba_admin_all" ON public.contractor_business_analysis
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));

CREATE POLICY "cba_contractor_read_own" ON public.contractor_business_analysis
  FOR SELECT TO authenticated
  USING (contractor_id IN (SELECT c.id FROM public.contractors c WHERE c.user_id = auth.uid()));

-- 3. system_integrity_thresholds
CREATE TABLE IF NOT EXISTS public.system_integrity_thresholds (
  pipeline_key TEXT PRIMARY KEY,
  healthy_min NUMERIC NOT NULL DEFAULT 90,
  degraded_min NUMERIC NOT NULL DEFAULT 70,
  weight NUMERIC NOT NULL DEFAULT 1,
  metric_label TEXT,
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.system_integrity_thresholds TO authenticated;
GRANT ALL ON public.system_integrity_thresholds TO service_role;
ALTER TABLE public.system_integrity_thresholds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sit_admin_write" ON public.system_integrity_thresholds
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));

CREATE POLICY "sit_authenticated_read" ON public.system_integrity_thresholds
  FOR SELECT TO authenticated USING (true);

INSERT INTO public.system_integrity_thresholds(pipeline_key, healthy_min, degraded_min, weight, metric_label, description) VALUES
  ('scraping', 80, 50, 1, 'Taux de validation', 'Entreprises validées vs trouvées'),
  ('sms', 95, 80, 1.5, 'Taux de livraison', 'SMS livrés / envoyés'),
  ('email', 95, 80, 1.5, 'Taux de livraison', 'Emails livrés / envoyés'),
  ('onboarding', 20, 5, 1, 'Taux de conversion', 'Comptes créés / visites'),
  ('stripe', 98, 90, 2, 'Paiements réussis', 'Paiements OK / total'),
  ('matching', 60, 30, 1, 'Compatibilité', 'Rendez-vous / demandes')
ON CONFLICT (pipeline_key) DO NOTHING;

-- 4. system_health_snapshots
CREATE TABLE IF NOT EXISTS public.system_health_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  overall_score NUMERIC NOT NULL,
  pipeline_scores JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL CHECK (status IN ('healthy','degraded','down')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_shs_captured ON public.system_health_snapshots(captured_at DESC);
GRANT SELECT ON public.system_health_snapshots TO authenticated;
GRANT ALL ON public.system_health_snapshots TO service_role;
ALTER TABLE public.system_health_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shs_admin_read" ON public.system_health_snapshots
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role));

-- 5. auto_repair_attempts
CREATE TABLE IF NOT EXISTS public.auto_repair_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target TEXT NOT NULL,
  check_type TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('healthy','degraded','failed','repaired','unrepairable')),
  latency_ms INTEGER,
  error_message TEXT,
  repair_action TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ara_attempted ON public.auto_repair_attempts(attempted_at DESC);
CREATE INDEX IF NOT EXISTS idx_ara_target_status ON public.auto_repair_attempts(target, status);
GRANT SELECT ON public.auto_repair_attempts TO authenticated;
GRANT ALL ON public.auto_repair_attempts TO service_role;
ALTER TABLE public.auto_repair_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ara_admin_read" ON public.auto_repair_attempts
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role));

-- ============================================================
-- VIEWS
-- ============================================================
CREATE OR REPLACE VIEW public.v_pipeline_scraping_health
WITH (security_invoker=on) AS
SELECT
  COUNT(*) FILTER (WHERE business_outcome='achieved')::int AS validated,
  COUNT(*) FILTER (WHERE business_outcome IN ('failed','blocked'))::int AS rejected,
  COUNT(*)::int AS total,
  CASE WHEN COUNT(*) = 0 THEN 0
    ELSE ROUND(100.0 * COUNT(*) FILTER (WHERE business_outcome='achieved') / COUNT(*), 1)
  END AS success_rate
FROM public.platform_operation_outcomes
WHERE operation ILIKE '%scrap%' AND created_at > now() - interval '24 hours';
GRANT SELECT ON public.v_pipeline_scraping_health TO authenticated;

CREATE OR REPLACE VIEW public.v_pipeline_sms_health
WITH (security_invoker=on) AS
SELECT
  COUNT(*) FILTER (WHERE business_outcome='achieved')::int AS delivered,
  COUNT(*) FILTER (WHERE business_outcome='failed')::int AS failed,
  COUNT(*)::int AS total,
  CASE WHEN COUNT(*) = 0 THEN 0
    ELSE ROUND(100.0 * COUNT(*) FILTER (WHERE business_outcome='achieved') / COUNT(*), 1)
  END AS delivery_rate
FROM public.platform_operation_outcomes
WHERE operation ILIKE '%sms%' AND created_at > now() - interval '24 hours';
GRANT SELECT ON public.v_pipeline_sms_health TO authenticated;

CREATE OR REPLACE VIEW public.v_pipeline_email_health
WITH (security_invoker=on) AS
SELECT
  COUNT(*) FILTER (WHERE business_outcome='achieved')::int AS delivered,
  COUNT(*) FILTER (WHERE business_outcome='failed')::int AS failed,
  COUNT(*)::int AS total,
  CASE WHEN COUNT(*) = 0 THEN 0
    ELSE ROUND(100.0 * COUNT(*) FILTER (WHERE business_outcome='achieved') / COUNT(*), 1)
  END AS delivery_rate
FROM public.platform_operation_outcomes
WHERE operation ILIKE '%email%' AND created_at > now() - interval '24 hours';
GRANT SELECT ON public.v_pipeline_email_health TO authenticated;

CREATE OR REPLACE VIEW public.v_pipeline_onboarding_health
WITH (security_invoker=on) AS
SELECT
  COUNT(*) FILTER (WHERE operation ILIKE '%landing%')::int AS visits,
  COUNT(*) FILTER (WHERE operation ILIKE '%signup%' OR operation ILIKE '%account_create%')::int AS accounts,
  COUNT(*) FILTER (WHERE operation ILIKE '%activation%' AND business_outcome='achieved')::int AS activations,
  CASE WHEN COUNT(*) FILTER (WHERE operation ILIKE '%landing%') = 0 THEN 0
    ELSE ROUND(100.0 * COUNT(*) FILTER (WHERE operation ILIKE '%signup%' OR operation ILIKE '%account_create%')
      / NULLIF(COUNT(*) FILTER (WHERE operation ILIKE '%landing%'),0), 1)
  END AS conversion_rate
FROM public.platform_operation_outcomes
WHERE created_at > now() - interval '24 hours';
GRANT SELECT ON public.v_pipeline_onboarding_health TO authenticated;

CREATE OR REPLACE VIEW public.v_pipeline_stripe_health
WITH (security_invoker=on) AS
SELECT
  COUNT(*) FILTER (WHERE business_outcome='achieved')::int AS succeeded,
  COUNT(*) FILTER (WHERE business_outcome='failed')::int AS failed,
  COUNT(*)::int AS total,
  CASE WHEN COUNT(*) = 0 THEN 0
    ELSE ROUND(100.0 * COUNT(*) FILTER (WHERE business_outcome='achieved') / COUNT(*), 1)
  END AS success_rate
FROM public.platform_operation_outcomes
WHERE (operation ILIKE '%stripe%' OR operation ILIKE '%checkout%' OR operation ILIKE '%payment%')
  AND created_at > now() - interval '24 hours';
GRANT SELECT ON public.v_pipeline_stripe_health TO authenticated;

CREATE OR REPLACE VIEW public.v_pipeline_matching_health
WITH (security_invoker=on) AS
SELECT
  COUNT(*) FILTER (WHERE operation ILIKE '%match%')::int AS matches_attempted,
  COUNT(*) FILTER (WHERE operation ILIKE '%match%' AND business_outcome='achieved')::int AS matches_succeeded,
  COUNT(*) FILTER (WHERE operation ILIKE '%booking%' AND business_outcome='achieved')::int AS bookings,
  CASE WHEN COUNT(*) FILTER (WHERE operation ILIKE '%match%') = 0 THEN 0
    ELSE ROUND(100.0 * COUNT(*) FILTER (WHERE operation ILIKE '%match%' AND business_outcome='achieved')
      / NULLIF(COUNT(*) FILTER (WHERE operation ILIKE '%match%'),0), 1)
  END AS match_rate
FROM public.platform_operation_outcomes
WHERE created_at > now() - interval '24 hours';
GRANT SELECT ON public.v_pipeline_matching_health TO authenticated;

CREATE OR REPLACE VIEW public.v_system_health_score
WITH (security_invoker=on) AS
WITH scores AS (
  SELECT 'scraping'::text AS pipeline, (SELECT success_rate FROM public.v_pipeline_scraping_health) AS score
  UNION ALL SELECT 'sms', (SELECT delivery_rate FROM public.v_pipeline_sms_health)
  UNION ALL SELECT 'email', (SELECT delivery_rate FROM public.v_pipeline_email_health)
  UNION ALL SELECT 'onboarding', (SELECT conversion_rate FROM public.v_pipeline_onboarding_health)
  UNION ALL SELECT 'stripe', (SELECT success_rate FROM public.v_pipeline_stripe_health)
  UNION ALL SELECT 'matching', (SELECT match_rate FROM public.v_pipeline_matching_health)
),
weighted AS (
  SELECT s.pipeline, COALESCE(s.score,0) AS score, COALESCE(t.weight,1) AS weight,
    COALESCE(t.healthy_min,90) AS healthy_min, COALESCE(t.degraded_min,70) AS degraded_min
  FROM scores s LEFT JOIN public.system_integrity_thresholds t ON t.pipeline_key = s.pipeline
)
SELECT
  ROUND(SUM(score * weight) / NULLIF(SUM(weight),0), 1) AS overall_score,
  CASE
    WHEN ROUND(SUM(score * weight) / NULLIF(SUM(weight),0), 1) >= 90 THEN 'healthy'
    WHEN ROUND(SUM(score * weight) / NULLIF(SUM(weight),0), 1) >= 70 THEN 'degraded'
    ELSE 'down'
  END AS status,
  jsonb_object_agg(pipeline, jsonb_build_object(
    'score', score, 'weight', weight,
    'status', CASE WHEN score >= healthy_min THEN 'healthy' WHEN score >= degraded_min THEN 'degraded' ELSE 'down' END
  )) AS pipeline_scores
FROM weighted;
GRANT SELECT ON public.v_system_health_score TO authenticated;

CREATE OR REPLACE VIEW public.v_first_paid_contractor_funnel
WITH (security_invoker=on) AS
SELECT
  (SELECT MIN(created_at) FROM public.platform_operation_outcomes WHERE operation ILIKE '%prospect%' AND business_outcome='achieved') AS prospect_identified_at,
  (SELECT MIN(created_at) FROM public.platform_operation_outcomes WHERE operation ILIKE '%sms%' AND business_outcome='achieved') AS sms_delivered_at,
  (SELECT MIN(created_at) FROM public.platform_operation_outcomes WHERE operation ILIKE '%click%' AND business_outcome='achieved') AS clicked_at,
  (SELECT MIN(created_at) FROM public.platform_operation_outcomes WHERE (operation ILIKE '%signup%' OR operation ILIKE '%account_create%') AND business_outcome='achieved') AS account_created_at,
  (SELECT MIN(created_at) FROM public.platform_operation_outcomes WHERE (operation ILIKE '%checkout%' OR operation ILIKE '%payment%') AND business_outcome='achieved') AS payment_at,
  (SELECT MIN(created_at) FROM public.platform_operation_outcomes WHERE operation ILIKE '%activation%' AND business_outcome='achieved') AS activated_at,
  (SELECT MIN(created_at) FROM public.platform_operation_outcomes WHERE operation ILIKE '%match%' AND business_outcome='achieved') AS first_match_at,
  (SELECT MIN(created_at) FROM public.platform_operation_outcomes WHERE operation ILIKE '%booking%' AND business_outcome='achieved') AS first_booking_at;
GRANT SELECT ON public.v_first_paid_contractor_funnel TO authenticated;

CREATE OR REPLACE FUNCTION public.set_updated_at_integrity()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_cvs_updated ON public.contractor_verification_status;
CREATE TRIGGER trg_cvs_updated BEFORE UPDATE ON public.contractor_verification_status
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_integrity();

DROP TRIGGER IF EXISTS trg_cba_updated ON public.contractor_business_analysis;
CREATE TRIGGER trg_cba_updated BEFORE UPDATE ON public.contractor_business_analysis
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_integrity();
