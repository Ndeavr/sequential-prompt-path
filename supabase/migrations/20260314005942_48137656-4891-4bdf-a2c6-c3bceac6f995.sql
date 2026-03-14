
-- ==================================================
-- UNPRO Contractor Verification Engine Schema
-- ==================================================

-- ── Enums ──
DO $$ BEGIN
  CREATE TYPE public.verification_input_type AS ENUM ('phone','name','rbq','neq','website','upload');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.verification_verdict AS ENUM ('succes','attention','non_succes','se_tenir_loin');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.rbq_status AS ENUM ('valid','expired','suspended','not_found','unknown');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.neq_status AS ENUM ('active','inactive','struck_off','not_found','unknown');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.identity_coherence AS ENUM ('strong','moderate','weak','contradictory','unknown');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.project_fit AS ENUM ('compatible','partial','verify','incompatible');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.risk_severity AS ENUM ('low','medium','high');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.image_asset_type AS ENUM ('truck','contract','business_card','invoice','storefront','logo','unknown');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.rbq_category_type AS ENUM ('general','specialty');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.compatibility_result AS ENUM ('compatible','partial','verify','incompatible');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── 1. contractor_verification_runs ──
CREATE TABLE public.contractor_verification_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  contractor_id UUID REFERENCES public.contractors(id) ON DELETE SET NULL,
  input_type public.verification_input_type NOT NULL,
  raw_input TEXT NOT NULL,
  normalized_phone TEXT,
  project_text TEXT,
  source_context JSONB DEFAULT '{}'::jsonb,
  verdict public.verification_verdict,
  visual_trust_score SMALLINT DEFAULT 0 CHECK (visual_trust_score BETWEEN 0 AND 100),
  unpro_trust_score SMALLINT DEFAULT 0 CHECK (unpro_trust_score BETWEEN 0 AND 100),
  license_fit_score SMALLINT DEFAULT 0 CHECK (license_fit_score BETWEEN 0 AND 100),
  summary_headline TEXT,
  summary_short TEXT,
  summary_next_steps JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_verification_runs_user ON public.contractor_verification_runs(user_id);
CREATE INDEX idx_verification_runs_contractor ON public.contractor_verification_runs(contractor_id);
CREATE INDEX idx_verification_runs_created ON public.contractor_verification_runs(created_at DESC);

CREATE TRIGGER set_verification_runs_updated
  BEFORE UPDATE ON public.contractor_verification_runs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── 2. contractor_visual_extractions ──
CREATE TABLE public.contractor_visual_extractions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  verification_run_id UUID NOT NULL REFERENCES public.contractor_verification_runs(id) ON DELETE CASCADE,
  image_type public.image_asset_type,
  business_name TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  rbq TEXT,
  neq TEXT,
  address TEXT,
  representative_name TEXT,
  service_keywords JSONB DEFAULT '[]'::jsonb,
  brand_notes JSONB DEFAULT '[]'::jsonb,
  raw_ocr_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_visual_extractions_run ON public.contractor_visual_extractions(verification_run_id);

-- ── 3. contractor_probable_entities ──
CREATE TABLE public.contractor_probable_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  verification_run_id UUID NOT NULL REFERENCES public.contractor_verification_runs(id) ON DELETE CASCADE,
  business_name TEXT,
  legal_name TEXT,
  normalized_phone TEXT,
  website TEXT,
  email_domain TEXT,
  probable_service_category TEXT,
  probable_city TEXT,
  probable_rbq TEXT,
  probable_neq TEXT,
  confidence_score SMALLINT DEFAULT 0 CHECK (confidence_score BETWEEN 0 AND 100),
  evidence JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_probable_entities_run ON public.contractor_probable_entities(verification_run_id);

-- ── 4. contractor_registry_validations ──
CREATE TABLE public.contractor_registry_validations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  verification_run_id UUID NOT NULL REFERENCES public.contractor_verification_runs(id) ON DELETE CASCADE,
  rbq_status public.rbq_status DEFAULT 'unknown',
  rbq_license_number TEXT,
  rbq_subcategories JSONB DEFAULT '[]'::jsonb,
  neq_status public.neq_status DEFAULT 'unknown',
  registered_name TEXT,
  identity_coherence public.identity_coherence DEFAULT 'unknown',
  source_snapshot JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_registry_validations_run ON public.contractor_registry_validations(verification_run_id);

-- ── 5. contractor_license_scope_results ──
CREATE TABLE public.contractor_license_scope_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  verification_run_id UUID NOT NULL REFERENCES public.contractor_verification_runs(id) ON DELETE CASCADE,
  mapped_work_types JSONB DEFAULT '[]'::jsonb,
  project_fit public.project_fit,
  license_fit_score SMALLINT DEFAULT 0 CHECK (license_fit_score BETWEEN 0 AND 100),
  explanation_fr TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_license_scope_run ON public.contractor_license_scope_results(verification_run_id);

-- ── 6. contractor_risk_signals ──
CREATE TABLE public.contractor_risk_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  verification_run_id UUID NOT NULL REFERENCES public.contractor_verification_runs(id) ON DELETE CASCADE,
  signal_type TEXT NOT NULL,
  severity public.risk_severity NOT NULL DEFAULT 'low',
  title_fr TEXT NOT NULL,
  description_fr TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_risk_signals_run ON public.contractor_risk_signals(verification_run_id);
CREATE INDEX idx_risk_signals_severity ON public.contractor_risk_signals(severity);

-- ── 7. contractor_verification_assets ──
CREATE TABLE public.contractor_verification_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  verification_run_id UUID NOT NULL REFERENCES public.contractor_verification_runs(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  asset_type public.image_asset_type DEFAULT 'unknown',
  mime_type TEXT,
  original_filename TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_verification_assets_run ON public.contractor_verification_assets(verification_run_id);

-- ── 8. rbq_license_subcategories (public reference) ──
CREATE TABLE public.rbq_license_subcategories (
  code TEXT PRIMARY KEY,
  annex TEXT,
  official_name_fr TEXT NOT NULL,
  official_description_fr TEXT,
  simplified_label_fr TEXT,
  category_type public.rbq_category_type DEFAULT 'specialty',
  is_active BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 9. rbq_license_work_types (public reference) ──
CREATE TABLE public.rbq_license_work_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rbq_code TEXT NOT NULL REFERENCES public.rbq_license_subcategories(code) ON DELETE CASCADE,
  work_slug TEXT NOT NULL,
  work_label_fr TEXT NOT NULL,
  work_label_en TEXT,
  compatibility_level public.compatibility_result DEFAULT 'compatible',
  notes_fr TEXT,
  sort_order INT DEFAULT 0
);

CREATE INDEX idx_work_types_rbq ON public.rbq_license_work_types(rbq_code);
CREATE INDEX idx_work_types_slug ON public.rbq_license_work_types(work_slug);

-- ── 10. project_work_taxonomy (public reference) ──
CREATE TABLE public.project_work_taxonomy (
  slug TEXT PRIMARY KEY,
  label_fr TEXT NOT NULL,
  label_en TEXT,
  parent_slug TEXT REFERENCES public.project_work_taxonomy(slug) ON DELETE SET NULL,
  seo_keywords TEXT[] DEFAULT '{}',
  homeowner_examples TEXT[] DEFAULT '{}',
  contractor_professions TEXT[] DEFAULT '{}'
);

CREATE INDEX idx_taxonomy_parent ON public.project_work_taxonomy(parent_slug);

-- ── 11. rbq_project_compatibility_rules (public reference) ──
CREATE TABLE public.rbq_project_compatibility_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_work_slug TEXT NOT NULL REFERENCES public.project_work_taxonomy(slug) ON DELETE CASCADE,
  rbq_code TEXT NOT NULL REFERENCES public.rbq_license_subcategories(code) ON DELETE CASCADE,
  result public.compatibility_result NOT NULL DEFAULT 'verify',
  confidence_score SMALLINT DEFAULT 80 CHECK (confidence_score BETWEEN 0 AND 100),
  explanation_fr TEXT,
  explanation_en TEXT,
  UNIQUE (project_work_slug, rbq_code)
);

CREATE INDEX idx_compat_rules_slug ON public.rbq_project_compatibility_rules(project_work_slug);
CREATE INDEX idx_compat_rules_rbq ON public.rbq_project_compatibility_rules(rbq_code);

-- ==================================================
-- ROW LEVEL SECURITY
-- ==================================================

-- Private tables: user owns their verification runs
ALTER TABLE public.contractor_verification_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractor_visual_extractions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractor_probable_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractor_registry_validations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractor_license_scope_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractor_risk_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractor_verification_assets ENABLE ROW LEVEL SECURITY;

-- Public reference tables
ALTER TABLE public.rbq_license_subcategories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rbq_license_work_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_work_taxonomy ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rbq_project_compatibility_rules ENABLE ROW LEVEL SECURITY;

-- ── Verification runs policies ──
CREATE POLICY "Users read own verification runs"
  ON public.contractor_verification_runs FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users insert own verification runs"
  ON public.contractor_verification_runs FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users update own verification runs"
  ON public.contractor_verification_runs FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- ── Helper function for child table policies ──
CREATE OR REPLACE FUNCTION public.owns_verification_run(_user_id UUID, _run_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.contractor_verification_runs
    WHERE id = _run_id AND (user_id = _user_id OR public.has_role(_user_id, 'admin'))
  )
$$;

-- ── Visual extractions policies ──
CREATE POLICY "Users read own visual extractions"
  ON public.contractor_visual_extractions FOR SELECT TO authenticated
  USING (public.owns_verification_run(auth.uid(), verification_run_id));

CREATE POLICY "Users insert own visual extractions"
  ON public.contractor_visual_extractions FOR INSERT TO authenticated
  WITH CHECK (public.owns_verification_run(auth.uid(), verification_run_id));

-- ── Probable entities policies ──
CREATE POLICY "Users read own probable entities"
  ON public.contractor_probable_entities FOR SELECT TO authenticated
  USING (public.owns_verification_run(auth.uid(), verification_run_id));

CREATE POLICY "Users insert own probable entities"
  ON public.contractor_probable_entities FOR INSERT TO authenticated
  WITH CHECK (public.owns_verification_run(auth.uid(), verification_run_id));

-- ── Registry validations policies ──
CREATE POLICY "Users read own registry validations"
  ON public.contractor_registry_validations FOR SELECT TO authenticated
  USING (public.owns_verification_run(auth.uid(), verification_run_id));

CREATE POLICY "Users insert own registry validations"
  ON public.contractor_registry_validations FOR INSERT TO authenticated
  WITH CHECK (public.owns_verification_run(auth.uid(), verification_run_id));

-- ── License scope policies ──
CREATE POLICY "Users read own license scope results"
  ON public.contractor_license_scope_results FOR SELECT TO authenticated
  USING (public.owns_verification_run(auth.uid(), verification_run_id));

CREATE POLICY "Users insert own license scope results"
  ON public.contractor_license_scope_results FOR INSERT TO authenticated
  WITH CHECK (public.owns_verification_run(auth.uid(), verification_run_id));

-- ── Risk signals policies ──
CREATE POLICY "Users read own risk signals"
  ON public.contractor_risk_signals FOR SELECT TO authenticated
  USING (public.owns_verification_run(auth.uid(), verification_run_id));

CREATE POLICY "Users insert own risk signals"
  ON public.contractor_risk_signals FOR INSERT TO authenticated
  WITH CHECK (public.owns_verification_run(auth.uid(), verification_run_id));

-- ── Verification assets policies ──
CREATE POLICY "Users read own verification assets"
  ON public.contractor_verification_assets FOR SELECT TO authenticated
  USING (public.owns_verification_run(auth.uid(), verification_run_id));

CREATE POLICY "Users insert own verification assets"
  ON public.contractor_verification_assets FOR INSERT TO authenticated
  WITH CHECK (public.owns_verification_run(auth.uid(), verification_run_id));

-- ── Public reference tables: anyone can read ──
CREATE POLICY "Public read rbq subcategories"
  ON public.rbq_license_subcategories FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Admin manage rbq subcategories"
  ON public.rbq_license_subcategories FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Public read rbq work types"
  ON public.rbq_license_work_types FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Admin manage rbq work types"
  ON public.rbq_license_work_types FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Public read project work taxonomy"
  ON public.project_work_taxonomy FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Admin manage project work taxonomy"
  ON public.project_work_taxonomy FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Public read compatibility rules"
  ON public.rbq_project_compatibility_rules FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Admin manage compatibility rules"
  ON public.rbq_project_compatibility_rules FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
