
-- ============================================================
-- AIPP ENTITY TEMPLATE — Universal AI-Indexed Profiles
-- ============================================================

DO $$ BEGIN
  CREATE TYPE public.aipp_public_status AS ENUM ('draft','review','published','archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.aipp_verification_status AS ENUM ('unverified','partially_verified','verified','disputed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.aipp_fact_status AS ENUM ('confirmed','unverified','not_found','disputed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.aipp_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  company_name TEXT NOT NULL,
  legal_name TEXT,
  trade_name TEXT,
  website_url TEXT,
  phone TEXT,
  email TEXT,
  primary_city TEXT,
  primary_trade TEXT,
  short_ai_summary TEXT,
  long_ai_summary TEXT,
  logo_url TEXT,
  hero_image_url TEXT,
  google_business_url TEXT,
  google_rating NUMERIC(3,2),
  google_review_count INT,
  positioning_statement TEXT,
  founded_year INT,
  team_size TEXT,
  public_status public.aipp_public_status NOT NULL DEFAULT 'draft',
  verification_status public.aipp_verification_status NOT NULL DEFAULT 'unverified',
  contractor_id UUID,
  meta_title TEXT,
  meta_description TEXT,
  canonical_url TEXT,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_aipp_profiles_status ON public.aipp_profiles(public_status);
CREATE INDEX IF NOT EXISTS idx_aipp_profiles_city ON public.aipp_profiles(primary_city);
CREATE INDEX IF NOT EXISTS idx_aipp_profiles_trade ON public.aipp_profiles(primary_trade);

CREATE TABLE IF NOT EXISTS public.aipp_profile_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.aipp_profiles(id) ON DELETE CASCADE,
  fact_key TEXT NOT NULL,
  source_url TEXT NOT NULL,
  source_type TEXT,
  confidence NUMERIC(3,2),
  collected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  raw_excerpt TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_aipp_sources_profile ON public.aipp_profile_sources(profile_id);

CREATE TABLE IF NOT EXISTS public.aipp_profile_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.aipp_profiles(id) ON DELETE CASCADE,
  service_name TEXT NOT NULL,
  sub_services TEXT[] DEFAULT ARRAY[]::TEXT[],
  problems_solved TEXT[] DEFAULT ARRAY[]::TEXT[],
  seasonality TEXT,
  urgency_capable BOOLEAN DEFAULT FALSE,
  avg_project_value_min INT,
  avg_project_value_max INT,
  ideal_client TEXT,
  is_primary BOOLEAN DEFAULT FALSE,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_aipp_services_profile ON public.aipp_profile_services(profile_id);

CREATE TABLE IF NOT EXISTS public.aipp_profile_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.aipp_profiles(id) ON DELETE CASCADE,
  city TEXT NOT NULL,
  region TEXT,
  postal_codes TEXT[] DEFAULT ARRAY[]::TEXT[],
  local_content TEXT,
  is_primary BOOLEAN DEFAULT FALSE,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_aipp_locations_profile ON public.aipp_profile_locations(profile_id);

CREATE TABLE IF NOT EXISTS public.aipp_profile_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.aipp_profiles(id) ON DELETE CASCADE,
  media_type TEXT NOT NULL,
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  alt_text TEXT,
  caption TEXT,
  is_before BOOLEAN DEFAULT FALSE,
  paired_with UUID,
  video_transcript TEXT,
  video_summary TEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_aipp_media_profile ON public.aipp_profile_media(profile_id);

CREATE TABLE IF NOT EXISTS public.aipp_profile_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.aipp_profiles(id) ON DELETE CASCADE,
  review_source TEXT,
  rating NUMERIC(3,2),
  author_name TEXT,
  excerpt TEXT,
  full_text TEXT,
  reviewed_at DATE,
  source_url TEXT,
  is_summary BOOLEAN DEFAULT FALSE,
  strengths TEXT[] DEFAULT ARRAY[]::TEXT[],
  weaknesses TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_aipp_reviews_profile ON public.aipp_profile_reviews(profile_id);

CREATE TABLE IF NOT EXISTS public.aipp_profile_validations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL UNIQUE REFERENCES public.aipp_profiles(id) ON DELETE CASCADE,
  rbq_status public.aipp_fact_status DEFAULT 'unverified',
  rbq_number TEXT,
  rbq_source_url TEXT,
  neq_status public.aipp_fact_status DEFAULT 'unverified',
  neq_number TEXT,
  neq_source_url TEXT,
  insurance_status public.aipp_fact_status DEFAULT 'unverified',
  insurance_source_url TEXT,
  phone_status public.aipp_fact_status DEFAULT 'unverified',
  website_status public.aipp_fact_status DEFAULT 'unverified',
  email_status public.aipp_fact_status DEFAULT 'unverified',
  google_business_status public.aipp_fact_status DEFAULT 'unverified',
  address_status public.aipp_fact_status DEFAULT 'unverified',
  social_status public.aipp_fact_status DEFAULT 'unverified',
  reviewed_by_admin BOOLEAN DEFAULT FALSE,
  validated_at TIMESTAMPTZ,
  validation_notes TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.aipp_profile_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL UNIQUE REFERENCES public.aipp_profiles(id) ON DELETE CASCADE,
  aipp_score INT NOT NULL DEFAULT 0,
  trust_score INT NOT NULL DEFAULT 0,
  seo_score INT NOT NULL DEFAULT 0,
  ai_citation_score INT NOT NULL DEFAULT 0,
  nap_consistency_score INT NOT NULL DEFAULT 0,
  review_quality_score INT NOT NULL DEFAULT 0,
  media_score INT NOT NULL DEFAULT 0,
  web_presence_score INT NOT NULL DEFAULT 0,
  local_authority_score INT NOT NULL DEFAULT 0,
  structure_score INT NOT NULL DEFAULT 0,
  proofs_score INT NOT NULL DEFAULT 0,
  specialization_score INT NOT NULL DEFAULT 0,
  chatgpt_citability INT NOT NULL DEFAULT 0,
  gemini_citability INT NOT NULL DEFAULT 0,
  breakdown JSONB DEFAULT '{}'::jsonb,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.aipp_entity_facts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL UNIQUE REFERENCES public.aipp_profiles(id) ON DELETE CASCADE,
  facts JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.aipp_schema_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.aipp_profiles(id) ON DELETE CASCADE,
  schema_version INT NOT NULL DEFAULT 1,
  json_ld JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_aipp_schema_profile ON public.aipp_schema_snapshots(profile_id);

CREATE TABLE IF NOT EXISTS public.aipp_import_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.aipp_profiles(id) ON DELETE SET NULL,
  source_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  steps_completed JSONB DEFAULT '[]'::jsonb,
  raw_scrape JSONB,
  extracted_data JSONB,
  diagnostics JSONB DEFAULT '{}'::jsonb,
  error TEXT,
  started_by UUID,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_aipp_imports_profile ON public.aipp_import_runs(profile_id);

CREATE TABLE IF NOT EXISTS public.aipp_profile_corrections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.aipp_profiles(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL,
  field_key TEXT NOT NULL,
  current_value TEXT,
  proposed_value TEXT,
  evidence_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

CREATE OR REPLACE FUNCTION public.aipp_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_aipp_profiles_updated ON public.aipp_profiles;
CREATE TRIGGER trg_aipp_profiles_updated BEFORE UPDATE ON public.aipp_profiles
FOR EACH ROW EXECUTE FUNCTION public.aipp_touch_updated_at();

DROP TRIGGER IF EXISTS trg_aipp_valid_updated ON public.aipp_profile_validations;
CREATE TRIGGER trg_aipp_valid_updated BEFORE UPDATE ON public.aipp_profile_validations
FOR EACH ROW EXECUTE FUNCTION public.aipp_touch_updated_at();

DROP TRIGGER IF EXISTS trg_aipp_facts_updated ON public.aipp_entity_facts;
CREATE TRIGGER trg_aipp_facts_updated BEFORE UPDATE ON public.aipp_entity_facts
FOR EACH ROW EXECUTE FUNCTION public.aipp_touch_updated_at();

ALTER TABLE public.aipp_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aipp_profile_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aipp_profile_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aipp_profile_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aipp_profile_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aipp_profile_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aipp_profile_validations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aipp_profile_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aipp_entity_facts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aipp_schema_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aipp_import_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aipp_profile_corrections ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.aipp_is_published(_profile_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.aipp_profiles WHERE id = _profile_id AND public_status = 'published');
$$;

CREATE POLICY "aipp_profiles_public_read" ON public.aipp_profiles
  FOR SELECT USING (public_status = 'published' OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "aipp_sources_public_read" ON public.aipp_profile_sources
  FOR SELECT USING (public.aipp_is_published(profile_id) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "aipp_services_public_read" ON public.aipp_profile_services
  FOR SELECT USING (public.aipp_is_published(profile_id) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "aipp_locations_public_read" ON public.aipp_profile_locations
  FOR SELECT USING (public.aipp_is_published(profile_id) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "aipp_media_public_read" ON public.aipp_profile_media
  FOR SELECT USING (public.aipp_is_published(profile_id) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "aipp_reviews_public_read" ON public.aipp_profile_reviews
  FOR SELECT USING (public.aipp_is_published(profile_id) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "aipp_validations_public_read" ON public.aipp_profile_validations
  FOR SELECT USING (public.aipp_is_published(profile_id) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "aipp_scores_public_read" ON public.aipp_profile_scores
  FOR SELECT USING (public.aipp_is_published(profile_id) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "aipp_facts_public_read" ON public.aipp_entity_facts
  FOR SELECT USING (public.aipp_is_published(profile_id) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "aipp_schema_public_read" ON public.aipp_schema_snapshots
  FOR SELECT USING (public.aipp_is_published(profile_id) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "aipp_profiles_admin_all" ON public.aipp_profiles FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "aipp_sources_admin_all" ON public.aipp_profile_sources FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "aipp_services_admin_all" ON public.aipp_profile_services FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "aipp_locations_admin_all" ON public.aipp_profile_locations FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "aipp_media_admin_all" ON public.aipp_profile_media FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "aipp_reviews_admin_all" ON public.aipp_profile_reviews FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "aipp_validations_admin_all" ON public.aipp_profile_validations FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "aipp_scores_admin_all" ON public.aipp_profile_scores FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "aipp_facts_admin_all" ON public.aipp_entity_facts FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "aipp_schema_admin_all" ON public.aipp_schema_snapshots FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "aipp_imports_admin_all" ON public.aipp_import_runs FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "aipp_corrections_admin_all" ON public.aipp_profile_corrections FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "aipp_corrections_own_read" ON public.aipp_profile_corrections FOR SELECT USING (requested_by = auth.uid());
CREATE POLICY "aipp_corrections_own_insert" ON public.aipp_profile_corrections FOR INSERT WITH CHECK (requested_by = auth.uid());

-- SEED: Isolation Solution Royal
DO $$
DECLARE v_profile_id UUID;
BEGIN
  INSERT INTO public.aipp_profiles (
    slug, company_name, trade_name, website_url, primary_city, primary_trade,
    short_ai_summary, long_ai_summary, positioning_statement,
    meta_title, meta_description, canonical_url,
    public_status, verification_status, published_at
  ) VALUES (
    'isolation-solution-royal',
    'Isolation Solution Royal',
    'Isolation Solution Royal',
    'https://isroyal.ca',
    'Terrebonne',
    'Isolation d''entretoit',
    'UNPRO a analysé le site web isroyal.ca, les services annoncés et les zones desservies pour structurer ce profil. Isolation Solution Royal se positionne comme spécialiste de l''isolation d''entretoit résidentiel sur la Rive-Nord de Montréal.',
    'Isolation Solution Royal est une entreprise québécoise spécialisée en isolation d''entretoit résidentiel, décontamination de moisissure, ventilation des soffites, étanchéité à l''air et inspection d''entretoit. L''entreprise opère principalement sur la Rive-Nord de Montréal, dans la région de Lanaudière et dans le Grand Montréal. Inspection gratuite offerte selon le site officiel.',
    'Spécialiste entretoit résidentiel. Inspection gratuite. Rive-Nord, Laval, Montréal.',
    'Isolation Solution Royal — Spécialiste entretoit Rive-Nord | Profil UNPRO',
    'Profil structuré et vérifié par UNPRO : services, zones desservies, preuves et signaux de confiance pour Isolation Solution Royal.',
    'https://unpro.ca/ai-indexed-profiles/isolation-solution-royal',
    'published', 'partially_verified', now()
  )
  RETURNING id INTO v_profile_id;

  INSERT INTO public.aipp_profile_services (profile_id, service_name, sub_services, problems_solved, seasonality, urgency_capable, avg_project_value_min, avg_project_value_max, ideal_client, is_primary, sort_order) VALUES
    (v_profile_id, 'Isolation d''entretoit', ARRAY['Cellulose soufflée','Uréthane','Fibre de verre'], ARRAY['Factures de chauffage élevées','Inconfort thermique','Glace au toit'], 'Toute l''année', false, 2500, 6500, 'Propriétaire de maison unifamiliale', true, 1),
    (v_profile_id, 'Décontamination de moisissure', ARRAY['Évaluation','Traitement','Prévention'], ARRAY['Moisissure visible','Odeur d''humidité','Qualité de l''air'], 'Toute l''année', true, 1500, 8000, 'Propriétaire avec problème d''humidité', false, 2),
    (v_profile_id, 'Ventilation des soffites', ARRAY['Installation','Correction','Inspection'], ARRAY['Manque de ventilation','Condensation entretoit','Moisissure préventive'], 'Printemps-Automne', false, 800, 2500, 'Propriétaire résidentiel', false, 3),
    (v_profile_id, 'Étanchéité à l''air', ARRAY['Scellement','Pare-vapeur','Test infiltrométrie'], ARRAY['Courants d''air','Pertes énergétiques','Confort thermique'], 'Toute l''année', false, 1200, 4500, 'Propriétaire soucieux d''efficacité énergétique', false, 4),
    (v_profile_id, 'Inspection d''entretoit', ARRAY['Diagnostic visuel','Rapport écrit','Recommandations'], ARRAY['État inconnu de l''entretoit','Achat de maison','Maintenance préventive'], 'Toute l''année', false, 0, 0, 'Propriétaire ou acheteur', false, 5);

  INSERT INTO public.aipp_profile_locations (profile_id, city, region, local_content, is_primary, sort_order) VALUES
    (v_profile_id, 'Terrebonne', 'Lanaudière', 'Isolation Solution Royal dessert Terrebonne et les secteurs avoisinants en isolation d''entretoit et inspection résidentielle.', true, 1),
    (v_profile_id, 'Laval', 'Laval', 'Service d''isolation d''entretoit et décontamination de moisissure offert sur l''ensemble du territoire de Laval.', false, 2),
    (v_profile_id, 'Montréal', 'Montréal', 'Interventions résidentielles à Montréal en isolation d''entretoit, ventilation des soffites et étanchéité à l''air.', false, 3),
    (v_profile_id, 'Rive-Nord', 'Couronne Nord', 'Spécialiste de l''entretoit pour les municipalités de la Rive-Nord : Mascouche, Repentigny, Blainville, Boisbriand.', false, 4),
    (v_profile_id, 'Lanaudière', 'Lanaudière', 'Service offert dans la région de Lanaudière, incluant les secteurs ruraux et périurbains.', false, 5);

  INSERT INTO public.aipp_profile_validations (
    profile_id, rbq_status, neq_status, insurance_status,
    phone_status, website_status, email_status,
    google_business_status, address_status, social_status,
    reviewed_by_admin
  ) VALUES (
    v_profile_id, 'not_found', 'not_found', 'not_found',
    'not_found', 'confirmed', 'not_found',
    'unverified', 'unverified', 'unverified',
    false
  );

  INSERT INTO public.aipp_profile_scores (
    profile_id, aipp_score, trust_score, seo_score, ai_citation_score,
    nap_consistency_score, review_quality_score, media_score,
    web_presence_score, local_authority_score, structure_score,
    proofs_score, specialization_score, chatgpt_citability, gemini_citability
  ) VALUES (
    v_profile_id, 58, 50, 65, 60, 55, 40, 35, 70, 60, 75, 30, 85, 55, 55
  );

  INSERT INTO public.aipp_entity_facts (profile_id, facts) VALUES (
    v_profile_id,
    jsonb_build_object(
      'name','Isolation Solution Royal',
      'type','HomeAndConstructionBusiness',
      'specialty','Isolation d''entretoit résidentiel',
      'website','https://isroyal.ca',
      'primary_city','Terrebonne',
      'service_areas', jsonb_build_array('Terrebonne','Laval','Montréal','Rive-Nord','Lanaudière'),
      'services', jsonb_build_array('Isolation d''entretoit','Décontamination de moisissure','Ventilation des soffites','Étanchéité à l''air','Inspection d''entretoit'),
      'language','fr-CA',
      'country','CA',
      'province','QC',
      'verified_by','UNPRO',
      'verification_method','public_source_analysis',
      'fabricated_claims', false
    )
  );

  INSERT INTO public.aipp_profile_sources (profile_id, fact_key, source_url, source_type, confidence) VALUES
    (v_profile_id, 'website_url', 'https://isroyal.ca', 'official_website', 1.0),
    (v_profile_id, 'services', 'https://isroyal.ca', 'official_website', 0.9),
    (v_profile_id, 'service_areas', 'https://isroyal.ca', 'official_website', 0.85);
END $$;
