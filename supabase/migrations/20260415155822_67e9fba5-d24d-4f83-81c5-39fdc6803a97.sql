
-- =============================================
-- Phase 1: Tables manquantes Go-Live Engine
-- =============================================

-- 1. prospect_business_matches — résultats recherche GMB
CREATE TABLE IF NOT EXISTS public.prospect_business_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_import_run_id UUID REFERENCES public.prospect_import_runs(id) ON DELETE CASCADE,
  google_place_id TEXT NOT NULL,
  business_name TEXT NOT NULL,
  formatted_address TEXT,
  phone TEXT,
  website TEXT,
  rating NUMERIC(2,1) DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  primary_category TEXT,
  all_categories JSONB DEFAULT '[]'::jsonb,
  confidence_score NUMERIC(4,2) DEFAULT 0,
  raw_payload JSONB DEFAULT '{}'::jsonb,
  is_selected BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pbm_import_run ON public.prospect_business_matches(prospect_import_run_id);
CREATE INDEX idx_pbm_place_id ON public.prospect_business_matches(google_place_id);

ALTER TABLE public.prospect_business_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage prospect_business_matches"
  ON public.prospect_business_matches FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 2. contractor_import_snapshots
CREATE TABLE IF NOT EXISTS public.contractor_import_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  onboarding_session_id UUID REFERENCES public.contractor_onboarding_sessions(id) ON DELETE CASCADE,
  user_id UUID,
  google_place_id TEXT,
  business_name TEXT NOT NULL,
  business_payload JSONB DEFAULT '{}'::jsonb,
  enrichment_payload JSONB DEFAULT '{}'::jsonb,
  aipp_preview_payload JSONB DEFAULT '{}'::jsonb,
  import_source TEXT DEFAULT 'gmb',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_cis_session ON public.contractor_import_snapshots(onboarding_session_id);
CREATE INDEX idx_cis_user ON public.contractor_import_snapshots(user_id);

ALTER TABLE public.contractor_import_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own import snapshots"
  ON public.contractor_import_snapshots FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own import snapshots"
  ON public.contractor_import_snapshots FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all import snapshots"
  ON public.contractor_import_snapshots FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 3. contractor_plan_recommendations
CREATE TABLE IF NOT EXISTS public.contractor_plan_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  onboarding_session_id UUID REFERENCES public.contractor_onboarding_sessions(id) ON DELETE CASCADE,
  user_id UUID,
  target_revenue INTEGER DEFAULT 0,
  average_job_value INTEGER DEFAULT 0,
  close_rate NUMERIC(4,2) DEFAULT 0.30,
  appointment_capacity INTEGER DEFAULT 10,
  territory TEXT,
  category TEXT,
  required_appointments INTEGER DEFAULT 0,
  recommended_plan TEXT NOT NULL DEFAULT 'pro',
  explanation_payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_cpr_session ON public.contractor_plan_recommendations(onboarding_session_id);
CREATE INDEX idx_cpr_user ON public.contractor_plan_recommendations(user_id);

ALTER TABLE public.contractor_plan_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own plan recommendations"
  ON public.contractor_plan_recommendations FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own plan recommendations"
  ON public.contractor_plan_recommendations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all plan recommendations"
  ON public.contractor_plan_recommendations FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 4. system_health_checks
CREATE TABLE IF NOT EXISTS public.system_health_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  check_type TEXT NOT NULL DEFAULT 'auto',
  component_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ok',
  metric_value NUMERIC DEFAULT 0,
  message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_shc_component ON public.system_health_checks(component_name);
CREATE INDEX idx_shc_status ON public.system_health_checks(status);
CREATE INDEX idx_shc_created ON public.system_health_checks(created_at DESC);

ALTER TABLE public.system_health_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage system_health_checks"
  ON public.system_health_checks FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 5. system_incidents
CREATE TABLE IF NOT EXISTS public.system_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'warning',
  component_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  summary TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_si_status ON public.system_incidents(status);
CREATE INDEX idx_si_severity ON public.system_incidents(severity);
CREATE INDEX idx_si_created ON public.system_incidents(created_at DESC);

ALTER TABLE public.system_incidents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage system_incidents"
  ON public.system_incidents FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
