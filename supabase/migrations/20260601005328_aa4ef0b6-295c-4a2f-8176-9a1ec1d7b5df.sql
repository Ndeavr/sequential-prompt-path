
-- =========================================================
-- property_health_scores
-- =========================================================
CREATE TABLE public.property_health_scores (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null,
  user_id uuid not null,
  overall_score int check (overall_score between 0 and 100),
  moisture_score int check (moisture_score between 0 and 100),
  insulation_score int check (insulation_score between 0 and 100),
  ventilation_score int check (ventilation_score between 0 and 100),
  structural_score int check (structural_score between 0 and 100),
  electrical_score int check (electrical_score between 0 and 100),
  signals jsonb not null default '{}'::jsonb,
  generated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.property_health_scores TO authenticated;
GRANT ALL ON public.property_health_scores TO service_role;

ALTER TABLE public.property_health_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "phs_owner_select" ON public.property_health_scores FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "phs_owner_insert" ON public.property_health_scores FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "phs_owner_update" ON public.property_health_scores FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "phs_owner_delete" ON public.property_health_scores FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_phs_property ON public.property_health_scores(property_id);
CREATE INDEX idx_phs_user ON public.property_health_scores(user_id);

-- =========================================================
-- visual_analyses (guest-allowed via session_id)
-- =========================================================
CREATE TABLE public.visual_analyses (
  id uuid primary key default gen_random_uuid(),
  property_id uuid,
  user_id uuid,
  session_id text,
  uploaded_file text not null,
  ai_findings jsonb not null default '[]'::jsonb,
  annotations jsonb not null default '[]'::jsonb,
  urgency_level text check (urgency_level in ('low','medium','high','critical')),
  risk_probability numeric,
  recommended_action text,
  created_at timestamptz not null default now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.visual_analyses TO authenticated;
GRANT SELECT, INSERT ON public.visual_analyses TO anon;
GRANT ALL ON public.visual_analyses TO service_role;

ALTER TABLE public.visual_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "va_owner_select" ON public.visual_analyses FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "va_owner_insert" ON public.visual_analyses FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "va_owner_update" ON public.visual_analyses FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "va_owner_delete" ON public.visual_analyses FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Guest access via session_id (client passes header X-Session-Id is out of scope; we allow read/insert without auth)
CREATE POLICY "va_guest_insert" ON public.visual_analyses FOR INSERT TO anon WITH CHECK (user_id IS NULL AND session_id IS NOT NULL);
CREATE POLICY "va_guest_select" ON public.visual_analyses FOR SELECT TO anon USING (user_id IS NULL AND session_id IS NOT NULL);

CREATE INDEX idx_va_user ON public.visual_analyses(user_id);
CREATE INDEX idx_va_session ON public.visual_analyses(session_id);
CREATE INDEX idx_va_property ON public.visual_analyses(property_id);

-- =========================================================
-- property_timelines
-- =========================================================
CREATE TABLE public.property_timelines (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null,
  user_id uuid not null,
  event_type text not null check (event_type in ('repair','inspection','invoice','warranty','maintenance','diagnostic','other')),
  event_date date not null,
  title text,
  contractor_id uuid,
  documents jsonb not null default '[]'::jsonb,
  ai_summary text,
  created_at timestamptz not null default now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.property_timelines TO authenticated;
GRANT ALL ON public.property_timelines TO service_role;

ALTER TABLE public.property_timelines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pt_owner_select" ON public.property_timelines FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "pt_owner_insert" ON public.property_timelines FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "pt_owner_update" ON public.property_timelines FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "pt_owner_delete" ON public.property_timelines FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_pt_property ON public.property_timelines(property_id);
CREATE INDEX idx_pt_user ON public.property_timelines(user_id);
CREATE INDEX idx_pt_event_date ON public.property_timelines(event_date DESC);

-- =========================================================
-- maintenance_predictions
-- =========================================================
CREATE TABLE public.maintenance_predictions (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null,
  user_id uuid not null,
  issue_type text not null,
  confidence numeric check (confidence between 0 and 1),
  estimated_timeline text,
  recommendation text,
  created_at timestamptz not null default now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.maintenance_predictions TO authenticated;
GRANT ALL ON public.maintenance_predictions TO service_role;

ALTER TABLE public.maintenance_predictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mp_owner_select" ON public.maintenance_predictions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "mp_owner_insert" ON public.maintenance_predictions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "mp_owner_update" ON public.maintenance_predictions FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "mp_owner_delete" ON public.maintenance_predictions FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_mp_property ON public.maintenance_predictions(property_id);
CREATE INDEX idx_mp_user ON public.maintenance_predictions(user_id);
