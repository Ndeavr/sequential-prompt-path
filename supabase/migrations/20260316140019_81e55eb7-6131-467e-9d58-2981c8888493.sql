
-- ============================================================
-- Home Problem Graph V2 — Extended Schema
-- Adds symptoms, causes, value tags, geo areas, questions,
-- blueprints, and pivot tables. Extends home_problems with
-- scoring columns. Reuses existing tables where possible.
-- ============================================================

-- 1. Extend home_problems with scoring/priority columns
ALTER TABLE public.home_problems
  ADD COLUMN IF NOT EXISTS severity_level text DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS short_description_fr text,
  ADD COLUMN IF NOT EXISTS long_description_fr text,
  ADD COLUMN IF NOT EXISTS homeowner_visible boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS google_difficulty_score numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS demand_score numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS profitability_score numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS seo_priority_score numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS aiseo_priority_score numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_priority_score numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS source_confidence numeric DEFAULT 0.7,
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}';

-- 2. problem_symptoms
CREATE TABLE IF NOT EXISTS public.problem_symptoms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name_fr text NOT NULL,
  description_fr text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.problem_symptoms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read symptoms" ON public.problem_symptoms FOR SELECT TO public USING (true);
CREATE POLICY "Admin manage symptoms" ON public.problem_symptoms FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 3. problem_causes
CREATE TABLE IF NOT EXISTS public.problem_causes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name_fr text NOT NULL,
  description_fr text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.problem_causes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read causes" ON public.problem_causes FOR SELECT TO public USING (true);
CREATE POLICY "Admin manage causes" ON public.problem_causes FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 4. value_tags
CREATE TABLE IF NOT EXISTS public.value_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  label_fr text NOT NULL,
  category text,
  description_fr text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.value_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read value_tags" ON public.value_tags FOR SELECT TO public USING (true);
CREATE POLICY "Admin manage value_tags" ON public.value_tags FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 5. geo_areas
CREATE TABLE IF NOT EXISTS public.geo_areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name_fr text NOT NULL,
  area_type text NOT NULL DEFAULT 'city',
  parent_area_id uuid REFERENCES public.geo_areas(id) ON DELETE SET NULL,
  province_code text DEFAULT 'QC',
  population_estimate integer,
  gdp_estimate numeric,
  seo_tier text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.geo_areas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read geo_areas" ON public.geo_areas FOR SELECT TO public USING (is_active = true);
CREATE POLICY "Admin manage geo_areas" ON public.geo_areas FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 6. homeowner_questions
CREATE TABLE IF NOT EXISTS public.homeowner_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  question_fr text NOT NULL,
  quick_answer_fr text,
  full_answer_fr text,
  cost_note_fr text,
  urgency_note_fr text,
  source_confidence numeric DEFAULT 0.7,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.homeowner_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read questions" ON public.homeowner_questions FOR SELECT TO public USING (true);
CREATE POLICY "Admin manage questions" ON public.homeowner_questions FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- PIVOT TABLES
-- ============================================================

-- 7. home_problem_symptoms
CREATE TABLE IF NOT EXISTS public.home_problem_symptoms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_id uuid NOT NULL REFERENCES public.home_problems(id) ON DELETE CASCADE,
  symptom_id uuid NOT NULL REFERENCES public.problem_symptoms(id) ON DELETE CASCADE,
  weight numeric DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  UNIQUE(problem_id, symptom_id)
);
ALTER TABLE public.home_problem_symptoms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read problem_symptoms" ON public.home_problem_symptoms FOR SELECT TO public USING (true);
CREATE POLICY "Admin manage problem_symptoms" ON public.home_problem_symptoms FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 8. home_problem_causes
CREATE TABLE IF NOT EXISTS public.home_problem_causes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_id uuid NOT NULL REFERENCES public.home_problems(id) ON DELETE CASCADE,
  cause_id uuid NOT NULL REFERENCES public.problem_causes(id) ON DELETE CASCADE,
  weight numeric DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  UNIQUE(problem_id, cause_id)
);
ALTER TABLE public.home_problem_causes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read problem_causes" ON public.home_problem_causes FOR SELECT TO public USING (true);
CREATE POLICY "Admin manage problem_causes" ON public.home_problem_causes FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 9. problem_professionals (problem -> profession)
CREATE TABLE IF NOT EXISTS public.problem_professionals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_id uuid NOT NULL REFERENCES public.home_problems(id) ON DELETE CASCADE,
  profession_id uuid NOT NULL REFERENCES public.home_professions(id) ON DELETE CASCADE,
  relevance_score numeric DEFAULT 1,
  recommended_order integer DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  UNIQUE(problem_id, profession_id)
);
ALTER TABLE public.problem_professionals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read problem_professionals" ON public.problem_professionals FOR SELECT TO public USING (true);
CREATE POLICY "Admin manage problem_professionals" ON public.problem_professionals FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 10. problem_value_tags
CREATE TABLE IF NOT EXISTS public.problem_value_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_id uuid NOT NULL REFERENCES public.home_problems(id) ON DELETE CASCADE,
  value_tag_id uuid NOT NULL REFERENCES public.value_tags(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(problem_id, value_tag_id)
);
ALTER TABLE public.problem_value_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read problem_value_tags" ON public.problem_value_tags FOR SELECT TO public USING (true);
CREATE POLICY "Admin manage problem_value_tags" ON public.problem_value_tags FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 11. problem_geo_targets
CREATE TABLE IF NOT EXISTS public.problem_geo_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_id uuid NOT NULL REFERENCES public.home_problems(id) ON DELETE CASCADE,
  geo_area_id uuid NOT NULL REFERENCES public.geo_areas(id) ON DELETE CASCADE,
  demand_score numeric DEFAULT 0,
  priority_score numeric DEFAULT 0,
  is_enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(problem_id, geo_area_id)
);
ALTER TABLE public.problem_geo_targets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read problem_geo_targets" ON public.problem_geo_targets FOR SELECT TO public USING (is_enabled = true);
CREATE POLICY "Admin manage problem_geo_targets" ON public.problem_geo_targets FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 12. question_problem_links
CREATE TABLE IF NOT EXISTS public.question_problem_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES public.homeowner_questions(id) ON DELETE CASCADE,
  problem_id uuid NOT NULL REFERENCES public.home_problems(id) ON DELETE CASCADE,
  relevance_score numeric DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  UNIQUE(question_id, problem_id)
);
ALTER TABLE public.question_problem_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read question_problem_links" ON public.question_problem_links FOR SELECT TO public USING (true);
CREATE POLICY "Admin manage question_problem_links" ON public.question_problem_links FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 13. question_solution_links
CREATE TABLE IF NOT EXISTS public.question_solution_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES public.homeowner_questions(id) ON DELETE CASCADE,
  solution_id uuid NOT NULL REFERENCES public.home_solutions(id) ON DELETE CASCADE,
  relevance_score numeric DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  UNIQUE(question_id, solution_id)
);
ALTER TABLE public.question_solution_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read question_solution_links" ON public.question_solution_links FOR SELECT TO public USING (true);
CREATE POLICY "Admin manage question_solution_links" ON public.question_solution_links FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 14. graph_page_blueprints
CREATE TABLE IF NOT EXISTS public.graph_page_blueprints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blueprint_type text NOT NULL,
  problem_id uuid REFERENCES public.home_problems(id) ON DELETE SET NULL,
  solution_id uuid REFERENCES public.home_solutions(id) ON DELETE SET NULL,
  profession_id uuid REFERENCES public.home_professions(id) ON DELETE SET NULL,
  question_id uuid REFERENCES public.homeowner_questions(id) ON DELETE SET NULL,
  geo_area_id uuid REFERENCES public.geo_areas(id) ON DELETE CASCADE,
  canonical_slug text UNIQUE NOT NULL,
  title_fr text,
  h1_fr text,
  meta_title_fr text,
  meta_description_fr text,
  target_keyword_fr text,
  related_keywords jsonb DEFAULT '[]',
  internal_link_targets jsonb DEFAULT '[]',
  schema_type text,
  priority_score numeric DEFAULT 0,
  generation_status text DEFAULT 'pending',
  generation_reason text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.graph_page_blueprints ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read published blueprints" ON public.graph_page_blueprints FOR SELECT TO public USING (generation_status = 'published');
CREATE POLICY "Admin manage blueprints" ON public.graph_page_blueprints FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_problem_symptoms_problem ON public.home_problem_symptoms(problem_id);
CREATE INDEX IF NOT EXISTS idx_problem_causes_problem ON public.home_problem_causes(problem_id);
CREATE INDEX IF NOT EXISTS idx_problem_professionals_problem ON public.problem_professionals(problem_id);
CREATE INDEX IF NOT EXISTS idx_problem_geo_targets_problem ON public.problem_geo_targets(problem_id);
CREATE INDEX IF NOT EXISTS idx_problem_geo_targets_geo ON public.problem_geo_targets(geo_area_id);
CREATE INDEX IF NOT EXISTS idx_question_problem_links_q ON public.question_problem_links(question_id);
CREATE INDEX IF NOT EXISTS idx_question_problem_links_p ON public.question_problem_links(problem_id);
CREATE INDEX IF NOT EXISTS idx_blueprints_type ON public.graph_page_blueprints(blueprint_type);
CREATE INDEX IF NOT EXISTS idx_blueprints_status ON public.graph_page_blueprints(generation_status);
CREATE INDEX IF NOT EXISTS idx_blueprints_priority ON public.graph_page_blueprints(priority_score DESC);
CREATE INDEX IF NOT EXISTS idx_blueprints_geo ON public.graph_page_blueprints(geo_area_id);
CREATE INDEX IF NOT EXISTS idx_geo_areas_type ON public.geo_areas(area_type);
CREATE INDEX IF NOT EXISTS idx_geo_areas_parent ON public.geo_areas(parent_area_id);
