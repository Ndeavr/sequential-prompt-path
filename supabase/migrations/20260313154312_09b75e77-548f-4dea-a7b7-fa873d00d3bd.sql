
-- =============================================
-- UNPRO Contractor System — Complete Schema
-- =============================================

-- 1. contractor_ai_profiles
CREATE TABLE public.contractor_ai_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
  summary_fr text,
  summary_en text,
  best_for jsonb DEFAULT '[]'::jsonb,
  not_ideal_for jsonb DEFAULT '[]'::jsonb,
  recommendation_reasons jsonb DEFAULT '[]'::jsonb,
  considerations jsonb DEFAULT '[]'::jsonb,
  personality_tags text[] DEFAULT '{}',
  generated_by text DEFAULT 'system',
  confidence numeric DEFAULT 0,
  is_current boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX idx_contractor_ai_profiles_contractor ON public.contractor_ai_profiles(contractor_id);

-- 2. contractor_services
CREATE TABLE public.contractor_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
  service_name_fr text NOT NULL,
  service_name_en text,
  category text,
  is_primary boolean DEFAULT false,
  description_fr text,
  description_en text,
  price_range_low numeric,
  price_range_high numeric,
  price_unit text DEFAULT 'project',
  data_source text DEFAULT 'contractor_declared',
  display_order int DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX idx_contractor_services_contractor ON public.contractor_services(contractor_id);

-- 3. contractor_service_areas
CREATE TABLE public.contractor_service_areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
  city_name text NOT NULL,
  city_slug text,
  province text DEFAULT 'QC',
  is_primary boolean DEFAULT false,
  radius_km numeric,
  data_source text DEFAULT 'contractor_declared',
  validation_status text DEFAULT 'pending',
  validated_by uuid,
  validated_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(contractor_id, city_slug)
);
CREATE INDEX idx_contractor_service_areas_contractor ON public.contractor_service_areas(contractor_id);
CREATE INDEX idx_contractor_service_areas_city ON public.contractor_service_areas(city_slug);

-- 4. contractor_media
CREATE TABLE public.contractor_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
  media_type text NOT NULL DEFAULT 'photo',
  storage_path text,
  public_url text,
  title text,
  description text,
  alt_text text,
  display_order int DEFAULT 0,
  is_featured boolean DEFAULT false,
  is_approved boolean DEFAULT false,
  data_source text DEFAULT 'contractor_declared',
  created_at timestamptz DEFAULT now()
);
CREATE INDEX idx_contractor_media_contractor ON public.contractor_media(contractor_id);

-- 5. contractor_credentials
CREATE TABLE public.contractor_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
  credential_type text NOT NULL,
  credential_value text,
  issuer text,
  issued_at date,
  expires_at date,
  document_path text,
  verification_status text DEFAULT 'pending',
  verified_by uuid,
  verified_at timestamptz,
  data_source text DEFAULT 'contractor_declared',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX idx_contractor_credentials_contractor ON public.contractor_credentials(contractor_id);

-- 6. contractor_public_pages
CREATE TABLE public.contractor_public_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE UNIQUE,
  slug text NOT NULL UNIQUE,
  is_published boolean DEFAULT false,
  published_at timestamptz,
  seo_title text,
  seo_description text,
  canonical_url text,
  json_ld jsonb,
  og_image_url text,
  faq jsonb DEFAULT '[]'::jsonb,
  custom_sections jsonb DEFAULT '[]'::jsonb,
  last_crawled_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE UNIQUE INDEX idx_contractor_public_pages_slug ON public.contractor_public_pages(slug);

-- 7. contractor_problem_links
CREATE TABLE public.contractor_problem_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
  problem_id uuid NOT NULL REFERENCES public.home_problems(id) ON DELETE CASCADE,
  relevance_score numeric DEFAULT 0.5,
  data_source text DEFAULT 'ai_inferred',
  created_at timestamptz DEFAULT now(),
  UNIQUE(contractor_id, problem_id)
);

-- 8. contractor_solution_links
CREATE TABLE public.contractor_solution_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
  solution_id uuid NOT NULL REFERENCES public.home_solutions(id) ON DELETE CASCADE,
  relevance_score numeric DEFAULT 0.5,
  data_source text DEFAULT 'ai_inferred',
  created_at timestamptz DEFAULT now(),
  UNIQUE(contractor_id, solution_id)
);

-- 9. contractor_comparables
CREATE TABLE public.contractor_comparables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
  comparable_contractor_id uuid NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
  similarity_score numeric DEFAULT 0,
  shared_services text[] DEFAULT '{}',
  shared_areas text[] DEFAULT '{}',
  computed_at timestamptz DEFAULT now(),
  UNIQUE(contractor_id, comparable_contractor_id)
);

-- 10. extraction_jobs
CREATE TABLE public.extraction_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid REFERENCES public.contractors(id) ON DELETE SET NULL,
  job_type text NOT NULL,
  source_url text,
  source_type text NOT NULL,
  status text DEFAULT 'pending',
  result_data jsonb,
  error_message text,
  fields_extracted int DEFAULT 0,
  fields_confirmed int DEFAULT 0,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  created_by uuid
);
CREATE INDEX idx_extraction_jobs_contractor ON public.extraction_jobs(contractor_id);

-- 11. data_sources
CREATE TABLE public.data_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
  field_name text NOT NULL,
  field_value text,
  source_type text NOT NULL,
  source_url text,
  confidence numeric DEFAULT 0.5,
  extracted_at timestamptz DEFAULT now(),
  is_current boolean DEFAULT true,
  extraction_job_id uuid REFERENCES public.extraction_jobs(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX idx_data_sources_contractor ON public.data_sources(contractor_id);
CREATE INDEX idx_data_sources_field ON public.data_sources(contractor_id, field_name);

-- 12. field_validations
CREATE TABLE public.field_validations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
  field_name text NOT NULL,
  current_value text,
  proposed_value text,
  source_type text NOT NULL,
  validation_status text DEFAULT 'pending',
  validated_by uuid,
  validated_at timestamptz,
  admin_note text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(contractor_id, field_name, source_type)
);
CREATE INDEX idx_field_validations_contractor ON public.field_validations(contractor_id);
CREATE INDEX idx_field_validations_status ON public.field_validations(validation_status);

-- Add slug column to contractors if not exists
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='contractors' AND column_name='slug') THEN
    ALTER TABLE public.contractors ADD COLUMN slug text UNIQUE;
  END IF;
END $$;

-- =============================================
-- RLS POLICIES
-- =============================================

-- contractor_ai_profiles
ALTER TABLE public.contractor_ai_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read published AI profiles" ON public.contractor_ai_profiles FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.contractor_public_pages pp WHERE pp.contractor_id = contractor_ai_profiles.contractor_id AND pp.is_published = true)
);
CREATE POLICY "Contractor read own AI profile" ON public.contractor_ai_profiles FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.contractors c WHERE c.id = contractor_ai_profiles.contractor_id AND c.user_id = auth.uid())
);
CREATE POLICY "Admin full access AI profiles" ON public.contractor_ai_profiles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- contractor_services
ALTER TABLE public.contractor_services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read active services" ON public.contractor_services FOR SELECT USING (is_active = true);
CREATE POLICY "Contractor manage own services" ON public.contractor_services FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.contractors c WHERE c.id = contractor_services.contractor_id AND c.user_id = auth.uid())
);
CREATE POLICY "Admin manage all services" ON public.contractor_services FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- contractor_service_areas
ALTER TABLE public.contractor_service_areas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read service areas" ON public.contractor_service_areas FOR SELECT USING (true);
CREATE POLICY "Contractor manage own areas" ON public.contractor_service_areas FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.contractors c WHERE c.id = contractor_service_areas.contractor_id AND c.user_id = auth.uid())
);
CREATE POLICY "Admin manage all areas" ON public.contractor_service_areas FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- contractor_media
ALTER TABLE public.contractor_media ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read approved media" ON public.contractor_media FOR SELECT USING (is_approved = true);
CREATE POLICY "Contractor manage own media" ON public.contractor_media FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.contractors c WHERE c.id = contractor_media.contractor_id AND c.user_id = auth.uid())
);
CREATE POLICY "Admin manage all media" ON public.contractor_media FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- contractor_credentials
ALTER TABLE public.contractor_credentials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Contractor read own credentials" ON public.contractor_credentials FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.contractors c WHERE c.id = contractor_credentials.contractor_id AND c.user_id = auth.uid())
);
CREATE POLICY "Contractor insert own credentials" ON public.contractor_credentials FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.contractors c WHERE c.id = contractor_credentials.contractor_id AND c.user_id = auth.uid())
);
CREATE POLICY "Admin manage all credentials" ON public.contractor_credentials FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- contractor_public_pages
ALTER TABLE public.contractor_public_pages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read published pages" ON public.contractor_public_pages FOR SELECT USING (is_published = true);
CREATE POLICY "Contractor read own page" ON public.contractor_public_pages FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.contractors c WHERE c.id = contractor_public_pages.contractor_id AND c.user_id = auth.uid())
);
CREATE POLICY "Admin manage all pages" ON public.contractor_public_pages FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- contractor_problem_links
ALTER TABLE public.contractor_problem_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read problem links" ON public.contractor_problem_links FOR SELECT USING (true);
CREATE POLICY "Admin manage problem links" ON public.contractor_problem_links FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- contractor_solution_links
ALTER TABLE public.contractor_solution_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read solution links" ON public.contractor_solution_links FOR SELECT USING (true);
CREATE POLICY "Admin manage solution links" ON public.contractor_solution_links FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- contractor_comparables
ALTER TABLE public.contractor_comparables ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read comparables" ON public.contractor_comparables FOR SELECT USING (true);
CREATE POLICY "Admin manage comparables" ON public.contractor_comparables FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- extraction_jobs
ALTER TABLE public.extraction_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Contractor read own jobs" ON public.extraction_jobs FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.contractors c WHERE c.id = extraction_jobs.contractor_id AND c.user_id = auth.uid())
);
CREATE POLICY "Admin manage all jobs" ON public.extraction_jobs FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- data_sources
ALTER TABLE public.data_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Contractor read own sources" ON public.data_sources FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.contractors c WHERE c.id = data_sources.contractor_id AND c.user_id = auth.uid())
);
CREATE POLICY "Admin manage all sources" ON public.data_sources FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- field_validations
ALTER TABLE public.field_validations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Contractor read own validations" ON public.field_validations FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.contractors c WHERE c.id = field_validations.contractor_id AND c.user_id = auth.uid())
);
CREATE POLICY "Admin manage all validations" ON public.field_validations FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- updated_at TRIGGERS
-- =============================================
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.contractor_ai_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.contractor_services FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.contractor_credentials FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.contractor_public_pages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.field_validations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- VIEWS
-- =============================================

-- Public contractor profile view (enriched)
CREATE OR REPLACE VIEW public.v_contractor_full_public AS
SELECT
  c.id,
  c.business_name,
  c.slug,
  c.specialty,
  c.description,
  c.city,
  c.province,
  c.logo_url,
  c.rating,
  c.review_count,
  c.years_experience,
  c.aipp_score,
  c.verification_status,
  pp.is_published,
  pp.seo_title,
  pp.seo_description,
  pp.faq,
  pp.slug AS page_slug,
  ai.summary_fr,
  ai.summary_en,
  ai.best_for,
  ai.not_ideal_for,
  ai.recommendation_reasons,
  ai.personality_tags
FROM public.contractors c
LEFT JOIN public.contractor_public_pages pp ON pp.contractor_id = c.id
LEFT JOIN public.contractor_ai_profiles ai ON ai.contractor_id = c.id AND ai.is_current = true
WHERE pp.is_published = true;

-- =============================================
-- RPC FUNCTIONS
-- =============================================

-- get_contractor_public_profile(slug)
CREATE OR REPLACE FUNCTION public.get_contractor_public_profile(_slug text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  cid uuid;
BEGIN
  SELECT c.id INTO cid
  FROM public.contractors c
  JOIN public.contractor_public_pages pp ON pp.contractor_id = c.id
  WHERE (c.slug = _slug OR pp.slug = _slug) AND pp.is_published = true
  LIMIT 1;

  IF cid IS NULL THEN RETURN NULL; END IF;

  SELECT jsonb_build_object(
    'contractor', row_to_json(c),
    'ai_profile', (SELECT row_to_json(ai) FROM public.contractor_ai_profiles ai WHERE ai.contractor_id = cid AND ai.is_current = true LIMIT 1),
    'services', COALESCE((SELECT jsonb_agg(row_to_json(s)) FROM public.contractor_services s WHERE s.contractor_id = cid AND s.is_active = true), '[]'),
    'service_areas', COALESCE((SELECT jsonb_agg(row_to_json(sa)) FROM public.contractor_service_areas sa WHERE sa.contractor_id = cid), '[]'),
    'media', COALESCE((SELECT jsonb_agg(row_to_json(m)) FROM public.contractor_media m WHERE m.contractor_id = cid AND m.is_approved = true ORDER BY m.display_order), '[]'),
    'credentials', COALESCE((SELECT jsonb_agg(row_to_json(cr)) FROM public.contractor_credentials cr WHERE cr.contractor_id = cid AND cr.verification_status = 'verified'), '[]'),
    'public_page', (SELECT row_to_json(pp) FROM public.contractor_public_pages pp WHERE pp.contractor_id = cid LIMIT 1),
    'problem_links', COALESCE((SELECT jsonb_agg(jsonb_build_object('problem_id', pl.problem_id, 'relevance', pl.relevance_score)) FROM public.contractor_problem_links pl WHERE pl.contractor_id = cid), '[]'),
    'comparables', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', comp.comparable_contractor_id, 'similarity', comp.similarity_score, 'name', cc.business_name, 'slug', cc.slug)) FROM public.contractor_comparables comp JOIN public.contractors cc ON cc.id = comp.comparable_contractor_id WHERE comp.contractor_id = cid ORDER BY comp.similarity_score DESC LIMIT 5), '[]')
  ) INTO result
  FROM public.contractors c
  WHERE c.id = cid;

  RETURN result;
END;
$$;

-- get_contractor_dashboard(contractor_id)
CREATE OR REPLACE FUNCTION public.get_contractor_dashboard(_contractor_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.contractors WHERE id = _contractor_id AND user_id = auth.uid())
    AND NOT public.has_role(auth.uid(), 'admin') THEN
    RETURN jsonb_build_object('error', 'unauthorized');
  END IF;

  SELECT jsonb_build_object(
    'profile', row_to_json(c),
    'ai_profile', (SELECT row_to_json(ai) FROM public.contractor_ai_profiles ai WHERE ai.contractor_id = _contractor_id AND ai.is_current = true LIMIT 1),
    'services_count', (SELECT count(*) FROM public.contractor_services WHERE contractor_id = _contractor_id AND is_active = true),
    'areas_count', (SELECT count(*) FROM public.contractor_service_areas WHERE contractor_id = _contractor_id),
    'media_count', (SELECT count(*) FROM public.contractor_media WHERE contractor_id = _contractor_id),
    'credentials_count', (SELECT count(*) FROM public.contractor_credentials WHERE contractor_id = _contractor_id),
    'pending_validations', (SELECT count(*) FROM public.field_validations WHERE contractor_id = _contractor_id AND validation_status = 'pending'),
    'public_page', (SELECT row_to_json(pp) FROM public.contractor_public_pages pp WHERE pp.contractor_id = _contractor_id LIMIT 1),
    'subscription', (SELECT row_to_json(sub) FROM public.contractor_subscriptions sub WHERE sub.contractor_id = _contractor_id LIMIT 1),
    'recent_extraction', (SELECT row_to_json(ej) FROM public.extraction_jobs ej WHERE ej.contractor_id = _contractor_id ORDER BY ej.created_at DESC LIMIT 1)
  ) INTO result
  FROM public.contractors c
  WHERE c.id = _contractor_id;

  RETURN result;
END;
$$;

-- get_profile_completion(contractor_id)
CREATE OR REPLACE FUNCTION public.get_profile_completion(_contractor_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c record;
  total int := 0;
  filled int := 0;
  missing text[] := '{}';
BEGIN
  SELECT * INTO c FROM public.contractors WHERE id = _contractor_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'not_found'); END IF;

  -- Check fields
  total := 13;
  IF c.business_name IS NOT NULL AND c.business_name != '' THEN filled := filled + 1; ELSE missing := array_append(missing, 'business_name'); END IF;
  IF c.specialty IS NOT NULL AND c.specialty != '' THEN filled := filled + 1; ELSE missing := array_append(missing, 'specialty'); END IF;
  IF c.description IS NOT NULL AND c.description != '' THEN filled := filled + 1; ELSE missing := array_append(missing, 'description'); END IF;
  IF c.city IS NOT NULL AND c.city != '' THEN filled := filled + 1; ELSE missing := array_append(missing, 'city'); END IF;
  IF c.phone IS NOT NULL AND c.phone != '' THEN filled := filled + 1; ELSE missing := array_append(missing, 'phone'); END IF;
  IF c.email IS NOT NULL AND c.email != '' THEN filled := filled + 1; ELSE missing := array_append(missing, 'email'); END IF;
  IF c.license_number IS NOT NULL AND c.license_number != '' THEN filled := filled + 1; ELSE missing := array_append(missing, 'license_number'); END IF;
  IF c.insurance_info IS NOT NULL AND c.insurance_info != '' THEN filled := filled + 1; ELSE missing := array_append(missing, 'insurance_info'); END IF;
  IF c.website IS NOT NULL AND c.website != '' THEN filled := filled + 1; ELSE missing := array_append(missing, 'website'); END IF;
  IF c.logo_url IS NOT NULL AND c.logo_url != '' THEN filled := filled + 1; ELSE missing := array_append(missing, 'logo_url'); END IF;
  IF c.years_experience IS NOT NULL AND c.years_experience > 0 THEN filled := filled + 1; ELSE missing := array_append(missing, 'years_experience'); END IF;
  IF EXISTS (SELECT 1 FROM public.contractor_services WHERE contractor_id = _contractor_id AND is_active = true) THEN filled := filled + 1; ELSE missing := array_append(missing, 'services'); END IF;
  IF EXISTS (SELECT 1 FROM public.contractor_service_areas WHERE contractor_id = _contractor_id) THEN filled := filled + 1; ELSE missing := array_append(missing, 'service_areas'); END IF;

  RETURN jsonb_build_object(
    'percentage', round((filled::numeric / total) * 100),
    'filled', filled,
    'total', total,
    'missing', to_jsonb(missing)
  );
END;
$$;

-- get_upgrade_recommendations(contractor_id)
CREATE OR REPLACE FUNCTION public.get_upgrade_recommendations(_contractor_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c record;
  recs jsonb := '[]'::jsonb;
  completion jsonb;
BEGIN
  SELECT * INTO c FROM public.contractors WHERE id = _contractor_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'not_found'); END IF;

  completion := public.get_profile_completion(_contractor_id);

  IF (completion->>'percentage')::int < 60 THEN
    recs := recs || jsonb_build_array(jsonb_build_object('type', 'profile', 'priority', 'high', 'message_fr', 'Complétez votre profil pour améliorer votre visibilité', 'missing', completion->'missing'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.contractor_media WHERE contractor_id = _contractor_id) THEN
    recs := recs || jsonb_build_array(jsonb_build_object('type', 'media', 'priority', 'medium', 'message_fr', 'Ajoutez des photos de vos réalisations'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.contractor_credentials WHERE contractor_id = _contractor_id AND verification_status = 'verified') THEN
    recs := recs || jsonb_build_array(jsonb_build_object('type', 'credentials', 'priority', 'high', 'message_fr', 'Faites vérifier vos certifications pour gagner en crédibilité'));
  END IF;

  IF c.aipp_score IS NULL OR c.aipp_score < 40 THEN
    recs := recs || jsonb_build_array(jsonb_build_object('type', 'aipp', 'priority', 'medium', 'message_fr', 'Améliorez votre score AIPP pour monter dans les résultats'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.contractor_subscriptions WHERE contractor_id = _contractor_id AND status = 'active') THEN
    recs := recs || jsonb_build_array(jsonb_build_object('type', 'plan', 'priority', 'high', 'message_fr', 'Activez un plan pour recevoir des opportunités'));
  END IF;

  RETURN jsonb_build_object('recommendations', recs, 'completion', completion);
END;
$$;
