
-- V4 Home Knowledge Graph tables

-- 1. home_problems — 30K+ home problems
CREATE TABLE public.home_problems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name_fr TEXT NOT NULL,
  name_en TEXT NOT NULL,
  description_fr TEXT,
  description_en TEXT,
  typical_causes JSONB DEFAULT '[]'::jsonb,
  recommended_solution_slugs TEXT[] DEFAULT '{}',
  professional_category TEXT,
  cost_estimate_low NUMERIC,
  cost_estimate_high NUMERIC,
  cost_unit TEXT DEFAULT 'projet',
  urgency_score INTEGER DEFAULT 5 CHECK (urgency_score >= 1 AND urgency_score <= 10),
  difficulty_score INTEGER DEFAULT 5 CHECK (difficulty_score >= 1 AND difficulty_score <= 10),
  seo_keywords TEXT[] DEFAULT '{}',
  seo_title_fr TEXT,
  seo_description_fr TEXT,
  climate_relevance TEXT[] DEFAULT '{}',
  property_types TEXT[] DEFAULT '{}',
  building_age_relevance TEXT,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.home_problems ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read active problems" ON public.home_problems FOR SELECT TO public USING (is_active = true);
CREATE POLICY "Admins can manage problems" ON public.home_problems FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- 2. home_solutions
CREATE TABLE public.home_solutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name_fr TEXT NOT NULL,
  name_en TEXT NOT NULL,
  description_fr TEXT,
  description_en TEXT,
  method_steps JSONB DEFAULT '[]'::jsonb,
  diy_possible BOOLEAN DEFAULT false,
  diy_difficulty INTEGER DEFAULT 5,
  cost_estimate_low NUMERIC,
  cost_estimate_high NUMERIC,
  cost_unit TEXT DEFAULT 'projet',
  time_estimate_hours NUMERIC,
  materials JSONB DEFAULT '[]'::jsonb,
  seo_keywords TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.home_solutions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read active solutions" ON public.home_solutions FOR SELECT TO public USING (is_active = true);
CREATE POLICY "Admins can manage solutions" ON public.home_solutions FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- 3. home_professions
CREATE TABLE public.home_professions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name_fr TEXT NOT NULL,
  name_en TEXT NOT NULL,
  description_fr TEXT,
  description_en TEXT,
  license_required BOOLEAN DEFAULT false,
  license_body TEXT,
  insurance_required BOOLEAN DEFAULT true,
  typical_hourly_rate_low NUMERIC,
  typical_hourly_rate_high NUMERIC,
  seo_keywords TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.home_professions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read active professions" ON public.home_professions FOR SELECT TO public USING (is_active = true);
CREATE POLICY "Admins can manage professions" ON public.home_professions FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- 4. home_problem_solution_edges
CREATE TABLE public.home_problem_solution_edges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_id UUID NOT NULL REFERENCES public.home_problems(id) ON DELETE CASCADE,
  solution_id UUID NOT NULL REFERENCES public.home_solutions(id) ON DELETE CASCADE,
  relevance_score NUMERIC DEFAULT 1.0,
  is_primary BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(problem_id, solution_id)
);
ALTER TABLE public.home_problem_solution_edges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read edges" ON public.home_problem_solution_edges FOR SELECT TO public USING (true);
CREATE POLICY "Admins can manage edges" ON public.home_problem_solution_edges FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- 5. home_solution_profession_edges
CREATE TABLE public.home_solution_profession_edges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  solution_id UUID NOT NULL REFERENCES public.home_solutions(id) ON DELETE CASCADE,
  profession_id UUID NOT NULL REFERENCES public.home_professions(id) ON DELETE CASCADE,
  relevance_score NUMERIC DEFAULT 1.0,
  is_primary BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(solution_id, profession_id)
);
ALTER TABLE public.home_solution_profession_edges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read solution-profession edges" ON public.home_solution_profession_edges FOR SELECT TO public USING (true);
CREATE POLICY "Admins can manage solution-profession edges" ON public.home_solution_profession_edges FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- 6. home_problem_city_pages — SEO pages for problem+city combos
CREATE TABLE public.home_problem_city_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_id UUID NOT NULL REFERENCES public.home_problems(id) ON DELETE CASCADE,
  city_id UUID NOT NULL REFERENCES public.cities(id) ON DELETE CASCADE,
  seo_title TEXT,
  seo_description TEXT,
  custom_content TEXT,
  faq JSONB DEFAULT '[]'::jsonb,
  local_tips TEXT,
  avg_cost_local_low NUMERIC,
  avg_cost_local_high NUMERIC,
  contractor_count INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(problem_id, city_id)
);
ALTER TABLE public.home_problem_city_pages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read published problem city pages" ON public.home_problem_city_pages FOR SELECT TO public USING (is_published = true);
CREATE POLICY "Admins can manage problem city pages" ON public.home_problem_city_pages FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- 7. home_solution_city_pages
CREATE TABLE public.home_solution_city_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  solution_id UUID NOT NULL REFERENCES public.home_solutions(id) ON DELETE CASCADE,
  city_id UUID NOT NULL REFERENCES public.cities(id) ON DELETE CASCADE,
  seo_title TEXT,
  seo_description TEXT,
  custom_content TEXT,
  faq JSONB DEFAULT '[]'::jsonb,
  local_tips TEXT,
  avg_cost_local_low NUMERIC,
  avg_cost_local_high NUMERIC,
  contractor_count INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(solution_id, city_id)
);
ALTER TABLE public.home_solution_city_pages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read published solution city pages" ON public.home_solution_city_pages FOR SELECT TO public USING (is_published = true);
CREATE POLICY "Admins can manage solution city pages" ON public.home_solution_city_pages FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- 8. home_problem_tags
CREATE TABLE public.home_problem_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_id UUID NOT NULL REFERENCES public.home_problems(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  tag_category TEXT DEFAULT 'general',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.home_problem_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read problem tags" ON public.home_problem_tags FOR SELECT TO public USING (true);
CREATE POLICY "Admins can manage problem tags" ON public.home_problem_tags FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- 9. home_problem_images
CREATE TABLE public.home_problem_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_id UUID NOT NULL REFERENCES public.home_problems(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  alt_text_fr TEXT,
  alt_text_en TEXT,
  caption_fr TEXT,
  is_primary BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.home_problem_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read problem images" ON public.home_problem_images FOR SELECT TO public USING (true);
CREATE POLICY "Admins can manage problem images" ON public.home_problem_images FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Indexes
CREATE INDEX idx_home_problems_slug ON public.home_problems(slug);
CREATE INDEX idx_home_solutions_slug ON public.home_solutions(slug);
CREATE INDEX idx_home_professions_slug ON public.home_professions(slug);
CREATE INDEX idx_home_ps_edges_problem ON public.home_problem_solution_edges(problem_id);
CREATE INDEX idx_home_ps_edges_solution ON public.home_problem_solution_edges(solution_id);
CREATE INDEX idx_home_sp_edges_solution ON public.home_solution_profession_edges(solution_id);
CREATE INDEX idx_home_sp_edges_profession ON public.home_solution_profession_edges(profession_id);
CREATE INDEX idx_home_problem_city_pages_problem ON public.home_problem_city_pages(problem_id);
CREATE INDEX idx_home_problem_city_pages_city ON public.home_problem_city_pages(city_id);
CREATE INDEX idx_home_solution_city_pages_solution ON public.home_solution_city_pages(solution_id);
CREATE INDEX idx_home_solution_city_pages_city ON public.home_solution_city_pages(city_id);
CREATE INDEX idx_home_problem_tags_problem ON public.home_problem_tags(problem_id);
CREATE INDEX idx_home_problem_tags_tag ON public.home_problem_tags(tag);
CREATE INDEX idx_home_problem_images_problem ON public.home_problem_images(problem_id);
