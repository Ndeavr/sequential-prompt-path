
-- ============================
-- Trust Authority Layer Tables
-- ============================

-- 1. Roadmap Features
CREATE TABLE IF NOT EXISTS public.roadmap_features (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'upcoming' CHECK (status IN ('live', 'in_progress', 'upcoming')),
  priority integer DEFAULT 0,
  icon_name text,
  category text,
  release_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.roadmap_features ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read roadmap" ON public.roadmap_features FOR SELECT USING (true);
CREATE POLICY "Admins manage roadmap" ON public.roadmap_features FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 2. Guides Content
CREATE TABLE IF NOT EXISTS public.guides_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  problem text NOT NULL,
  symptoms text[],
  causes text[],
  solution text,
  estimated_cost_min integer,
  estimated_cost_max integer,
  contractor_specialty text,
  severity text DEFAULT 'moderate' CHECK (severity IN ('low', 'moderate', 'high', 'critical')),
  category text,
  seo_title text,
  seo_description text,
  is_published boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.guides_content ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read published guides" ON public.guides_content FOR SELECT USING (is_published = true);
CREATE POLICY "Admins manage guides" ON public.guides_content FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 3. City Services (coverage map data)
CREATE TABLE IF NOT EXISTS public.city_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city text NOT NULL,
  city_slug text NOT NULL,
  province text DEFAULT 'QC',
  service text NOT NULL,
  service_slug text NOT NULL,
  contractors_count integer DEFAULT 0,
  avg_response_time_hours numeric,
  is_active boolean DEFAULT true,
  latitude numeric,
  longitude numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(city_slug, service_slug)
);
ALTER TABLE public.city_services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read city services" ON public.city_services FOR SELECT USING (true);
CREATE POLICY "Admins manage city services" ON public.city_services FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 4. AI Explanations
CREATE TABLE IF NOT EXISTS public.ai_explanations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  step_key text UNIQUE NOT NULL,
  step_order integer DEFAULT 0,
  title_fr text NOT NULL,
  explanation_fr text NOT NULL,
  icon_name text,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_explanations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read AI explanations" ON public.ai_explanations FOR SELECT USING (is_active = true);
CREATE POLICY "Admins manage AI explanations" ON public.ai_explanations FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 5. Extend reviews with verification (add columns to existing reviews table)
ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS verification_status text DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
  ADD COLUMN IF NOT EXISTS proof_type text CHECK (proof_type IN ('booking', 'invoice', 'photo', 'none')),
  ADD COLUMN IF NOT EXISTS proof_url text,
  ADD COLUMN IF NOT EXISTS verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS verified_by uuid;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_roadmap_features_status ON public.roadmap_features(status);
CREATE INDEX IF NOT EXISTS idx_guides_content_slug ON public.guides_content(slug);
CREATE INDEX IF NOT EXISTS idx_guides_content_category ON public.guides_content(category);
CREATE INDEX IF NOT EXISTS idx_city_services_city_slug ON public.city_services(city_slug);
CREATE INDEX IF NOT EXISTS idx_city_services_service_slug ON public.city_services(service_slug);
CREATE INDEX IF NOT EXISTS idx_reviews_verification ON public.reviews(verification_status);

-- Triggers for updated_at
CREATE TRIGGER set_roadmap_features_updated_at BEFORE UPDATE ON public.roadmap_features FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_guides_content_updated_at BEFORE UPDATE ON public.guides_content FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_city_services_updated_at BEFORE UPDATE ON public.city_services FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
