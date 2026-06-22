
-- Contractor Acquisition Pipeline Audit + Recovery foundation

-- 1) Funnel state (one row per contractor)
CREATE TABLE IF NOT EXISTS public.acquisition_funnel_state (
  contractor_id uuid PRIMARY KEY,
  business_name text,
  city text,
  scraped_at timestamptz,
  contacted_at timestamptz,
  delivered_at timestamptz,
  opened_at timestamptz,
  clicked_at timestamptz,
  registered_at timestamptz,
  onboarded_at timestamptz,
  paid_at timestamptz,
  activated_at timestamptz,
  current_stage text NOT NULL DEFAULT 'scraped',
  drop_off_reason text,
  data_quality_score int,
  sms_eligible boolean,
  email_quality_score int,
  email_role text,
  decision_maker_name text,
  decision_maker_role text,
  decision_maker_confidence numeric,
  profile_completion_pct int,
  lead_readiness_score int,
  estimated_mrr_cad numeric DEFAULT 349,
  last_audited_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.acquisition_funnel_state TO authenticated;
GRANT ALL ON public.acquisition_funnel_state TO service_role;
ALTER TABLE public.acquisition_funnel_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin read funnel state" ON public.acquisition_funnel_state
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX IF NOT EXISTS idx_afs_stage ON public.acquisition_funnel_state(current_stage);
CREATE INDEX IF NOT EXISTS idx_afs_audited ON public.acquisition_funnel_state(last_audited_at);

-- 2) Findings (leaks + repair tasks)
CREATE TABLE IF NOT EXISTS public.acquisition_findings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid,
  contractor_id uuid,
  phase text NOT NULL,
  stage_from text,
  stage_to text,
  severity text NOT NULL DEFAULT 'medium',
  issue_code text NOT NULL,
  issue_description text,
  lost_revenue_cad numeric DEFAULT 0,
  recoverable_revenue_cad numeric DEFAULT 0,
  conversion_lift_pct numeric DEFAULT 0,
  repair_difficulty int DEFAULT 3,
  auto_repairable boolean DEFAULT false,
  status text NOT NULL DEFAULT 'open',
  repair_action text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);
GRANT SELECT, INSERT, UPDATE ON public.acquisition_findings TO authenticated;
GRANT ALL ON public.acquisition_findings TO service_role;
ALTER TABLE public.acquisition_findings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin manage findings" ON public.acquisition_findings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE INDEX IF NOT EXISTS idx_findings_status ON public.acquisition_findings(status, severity);
CREATE INDEX IF NOT EXISTS idx_findings_revenue ON public.acquisition_findings(lost_revenue_cad DESC);

-- 3) Recovery queue
CREATE TABLE IF NOT EXISTS public.acquisition_recovery_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid NOT NULL,
  campaign_type text NOT NULL,
  channel text NOT NULL DEFAULT 'email',
  scheduled_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'queued',
  attempts int NOT NULL DEFAULT 0,
  last_error text,
  payload jsonb DEFAULT '{}'::jsonb,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.acquisition_recovery_queue TO authenticated;
GRANT ALL ON public.acquisition_recovery_queue TO service_role;
ALTER TABLE public.acquisition_recovery_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin manage recovery" ON public.acquisition_recovery_queue
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE INDEX IF NOT EXISTS idx_recovery_due ON public.acquisition_recovery_queue(status, scheduled_at);

-- 4) Landing page health
CREATE TABLE IF NOT EXISTS public.landing_page_health (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route text NOT NULL UNIQUE,
  lcp_ms int,
  cls numeric,
  bounce_rate numeric,
  health_score int,
  issues jsonb DEFAULT '[]'::jsonb,
  last_audited_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.landing_page_health TO authenticated;
GRANT ALL ON public.landing_page_health TO service_role;
ALTER TABLE public.landing_page_health ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin read landing health" ON public.landing_page_health
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 5) Template quality
CREATE TABLE IF NOT EXISTS public.template_quality_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id text NOT NULL,
  template_kind text NOT NULL,
  score int NOT NULL DEFAULT 0,
  issues jsonb DEFAULT '[]'::jsonb,
  last_audited_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.template_quality_scores TO authenticated;
GRANT ALL ON public.template_quality_scores TO service_role;
ALTER TABLE public.template_quality_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin read template scores" ON public.template_quality_scores
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 6) Audit runs
CREATE TABLE IF NOT EXISTS public.acquisition_audit_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status text NOT NULL DEFAULT 'running',
  phases_completed jsonb DEFAULT '[]'::jsonb,
  contractors_audited int DEFAULT 0,
  findings_created int DEFAULT 0,
  auto_repairs int DEFAULT 0,
  recovery_enqueued int DEFAULT 0,
  total_lost_revenue_cad numeric DEFAULT 0,
  total_recoverable_cad numeric DEFAULT 0,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  error text
);
GRANT SELECT ON public.acquisition_audit_runs TO authenticated;
GRANT ALL ON public.acquisition_audit_runs TO service_role;
ALTER TABLE public.acquisition_audit_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin read audit runs" ON public.acquisition_audit_runs
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_acquisition_funnel_state()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;
DROP TRIGGER IF EXISTS trg_afs_updated_at ON public.acquisition_funnel_state;
CREATE TRIGGER trg_afs_updated_at BEFORE UPDATE ON public.acquisition_funnel_state
  FOR EACH ROW EXECUTE FUNCTION public.touch_acquisition_funnel_state();
