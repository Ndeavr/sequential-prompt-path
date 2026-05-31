
-- ============================================================
-- UNPRO AI TRUST LAYER — FOUNDATION
-- ============================================================

-- Enums
DO $$ BEGIN
  CREATE TYPE public.ai_trust_position AS ENUM (
    'invisible','weak','emerging','trusted','dominant','category_authority'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.recommendation_gap_severity AS ENUM ('low','medium','high','severe');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.review_sentiment AS ENUM ('positive','neutral','negative');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- contractors_trust — extension non destructive
-- ============================================================
CREATE TABLE IF NOT EXISTS public.contractors_trust (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_contractor_id UUID NULL,
  company_name TEXT NOT NULL,
  website TEXT,
  phone TEXT,
  city TEXT,
  primary_specialty TEXT,
  desired_specialty TEXT,
  territory_cluster TEXT,
  ai_trust_position public.ai_trust_position DEFAULT 'invisible',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_contractors_trust_city ON public.contractors_trust(city);
CREATE INDEX IF NOT EXISTS idx_contractors_trust_specialty ON public.contractors_trust(primary_specialty);
CREATE INDEX IF NOT EXISTS idx_contractors_trust_source ON public.contractors_trust(source_contractor_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.contractors_trust TO authenticated;
GRANT ALL ON public.contractors_trust TO service_role;
ALTER TABLE public.contractors_trust ENABLE ROW LEVEL SECURITY;

CREATE POLICY "trust_admin_all" ON public.contractors_trust
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "trust_owner_read" ON public.contractors_trust
  FOR SELECT TO authenticated
  USING (
    source_contractor_id IN (
      SELECT id FROM public.contractors WHERE user_id = auth.uid()
    )
  );

-- ============================================================
-- contractor_ai_interpretation
-- ============================================================
CREATE TABLE IF NOT EXISTS public.contractor_ai_interpretation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID NOT NULL REFERENCES public.contractors_trust(id) ON DELETE CASCADE,
  detected_identity TEXT,
  desired_identity TEXT,
  semantic_gap_score NUMERIC,
  ai_summary TEXT,
  confidence_score NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_aii_contractor ON public.contractor_ai_interpretation(contractor_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.contractor_ai_interpretation TO authenticated;
GRANT ALL ON public.contractor_ai_interpretation TO service_role;
ALTER TABLE public.contractor_ai_interpretation ENABLE ROW LEVEL SECURITY;

CREATE POLICY "aii_admin_all" ON public.contractor_ai_interpretation
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============================================================
-- contractor_semantic_entities
-- ============================================================
CREATE TABLE IF NOT EXISTS public.contractor_semantic_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID NOT NULL REFERENCES public.contractors_trust(id) ON DELETE CASCADE,
  entity_name TEXT NOT NULL,
  entity_type TEXT,
  confidence_score NUMERIC,
  evidence_sources JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cse_contractor ON public.contractor_semantic_entities(contractor_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.contractor_semantic_entities TO authenticated;
GRANT ALL ON public.contractor_semantic_entities TO service_role;
ALTER TABLE public.contractor_semantic_entities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cse_admin_all" ON public.contractor_semantic_entities
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============================================================
-- contractor_review_entities
-- ============================================================
CREATE TABLE IF NOT EXISTS public.contractor_review_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID NOT NULL REFERENCES public.contractors_trust(id) ON DELETE CASCADE,
  entity_name TEXT NOT NULL,
  sentiment public.review_sentiment NOT NULL DEFAULT 'neutral',
  frequency INT DEFAULT 1,
  confidence NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cre_contractor ON public.contractor_review_entities(contractor_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.contractor_review_entities TO authenticated;
GRANT ALL ON public.contractor_review_entities TO service_role;
ALTER TABLE public.contractor_review_entities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cre_admin_all" ON public.contractor_review_entities
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============================================================
-- ai_recommendation_signals
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ai_recommendation_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID NOT NULL REFERENCES public.contractors_trust(id) ON DELETE CASCADE,
  citation_score NUMERIC DEFAULT 0,
  semantic_clarity_score NUMERIC DEFAULT 0,
  homeowner_trust_score NUMERIC DEFAULT 0,
  specialization_score NUMERIC DEFAULT 0,
  local_authority_score NUMERIC DEFAULT 0,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ars_contractor ON public.ai_recommendation_signals(contractor_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_recommendation_signals TO authenticated;
GRANT ALL ON public.ai_recommendation_signals TO service_role;
ALTER TABLE public.ai_recommendation_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ars_admin_all" ON public.ai_recommendation_signals
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============================================================
-- territory_slots — PUBLIC READ (scarcity UI)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.territory_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city TEXT NOT NULL,
  specialty TEXT NOT NULL,
  max_slots INT NOT NULL DEFAULT 3,
  active_slots INT NOT NULL DEFAULT 0,
  waitlist_count INT NOT NULL DEFAULT 0,
  demand_level TEXT DEFAULT 'medium',
  pipeline_estimate_min INT DEFAULT 0,
  pipeline_estimate_max INT DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (city, specialty)
);
CREATE INDEX IF NOT EXISTS idx_territory_city ON public.territory_slots(city);

GRANT SELECT ON public.territory_slots TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.territory_slots TO authenticated;
GRANT ALL ON public.territory_slots TO service_role;
ALTER TABLE public.territory_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "territory_public_read" ON public.territory_slots FOR SELECT USING (true);
CREATE POLICY "territory_admin_write" ON public.territory_slots
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============================================================
-- contractor_recommendation_gaps (utilisé Phase 1 + 2)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.contractor_recommendation_gaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID NOT NULL REFERENCES public.contractors_trust(id) ON DELETE CASCADE,
  gap_type TEXT NOT NULL,
  severity public.recommendation_gap_severity NOT NULL DEFAULT 'medium',
  ai_confidence_impact NUMERIC DEFAULT 0,
  narrative TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_crg_contractor ON public.contractor_recommendation_gaps(contractor_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.contractor_recommendation_gaps TO authenticated;
GRANT ALL ON public.contractor_recommendation_gaps TO service_role;
ALTER TABLE public.contractor_recommendation_gaps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "crg_admin_all" ON public.contractor_recommendation_gaps
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============================================================
-- ONBOARDING (Phase 2 tables — créées dès maintenant)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ai_trust_onboarding_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID NULL REFERENCES public.contractors_trust(id) ON DELETE SET NULL,
  user_id UUID NULL,
  onboarding_step INT NOT NULL DEFAULT 1,
  ai_gap_detected BOOLEAN DEFAULT FALSE,
  trust_position public.ai_trust_position,
  completion_percentage INT DEFAULT 0,
  payload JSONB DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_atos_contractor ON public.ai_trust_onboarding_sessions(contractor_id);
CREATE INDEX IF NOT EXISTS idx_atos_user ON public.ai_trust_onboarding_sessions(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_trust_onboarding_sessions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_trust_onboarding_sessions TO authenticated;
GRANT ALL ON public.ai_trust_onboarding_sessions TO service_role;
ALTER TABLE public.ai_trust_onboarding_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "atos_public_insert" ON public.ai_trust_onboarding_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "atos_public_update_self" ON public.ai_trust_onboarding_sessions FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "atos_owner_read" ON public.ai_trust_onboarding_sessions FOR SELECT
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE TABLE IF NOT EXISTS public.contractor_opportunity_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID NOT NULL REFERENCES public.contractors_trust(id) ON DELETE CASCADE,
  estimated_pipeline_min INT DEFAULT 0,
  estimated_pipeline_max INT DEFAULT 0,
  territory_pressure TEXT DEFAULT 'medium',
  semantic_gap NUMERIC DEFAULT 0,
  homeowner_trust_density NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_coa_contractor ON public.contractor_opportunity_analysis(contractor_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.contractor_opportunity_analysis TO authenticated;
GRANT ALL ON public.contractor_opportunity_analysis TO service_role;
ALTER TABLE public.contractor_opportunity_analysis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "coa_admin_all" ON public.contractor_opportunity_analysis
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============================================================
-- partnership_applications (CTA Phase 2)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.partnership_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID NULL REFERENCES public.contractors_trust(id) ON DELETE SET NULL,
  cta_type TEXT NOT NULL,
  contact_name TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  city TEXT,
  specialty TEXT,
  notes TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT INSERT ON public.partnership_applications TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.partnership_applications TO authenticated;
GRANT ALL ON public.partnership_applications TO service_role;
ALTER TABLE public.partnership_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pa_public_insert" ON public.partnership_applications FOR INSERT WITH CHECK (true);
CREATE POLICY "pa_admin_read" ON public.partnership_applications
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "pa_admin_write" ON public.partnership_applications
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============================================================
-- updated_at triggers
-- ============================================================
CREATE TRIGGER trg_contractors_trust_updated
  BEFORE UPDATE ON public.contractors_trust
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_territory_slots_updated
  BEFORE UPDATE ON public.territory_slots
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
