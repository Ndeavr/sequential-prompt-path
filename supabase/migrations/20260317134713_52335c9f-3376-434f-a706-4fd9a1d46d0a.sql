
-- Refusal signals extracted from matching/lead data
CREATE TABLE public.contractor_refusal_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid REFERENCES public.contractors(id) ON DELETE CASCADE,
  refusal_type text NOT NULL DEFAULT 'scope', -- scope, material, structure, geography, budget
  signal_text text NOT NULL, -- raw refusal reason
  problem_slug text, -- matched home_problem
  solution_slug text,
  city_slug text,
  material text,
  structure_type text, -- duplex, condo, maison, etc.
  frequency int NOT NULL DEFAULT 1, -- how many times this pattern seen
  confidence numeric NOT NULL DEFAULT 0.5,
  seo_opportunity_generated boolean NOT NULL DEFAULT false,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Generated SEO pages from refusal intelligence
CREATE TABLE public.refusal_seo_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  page_type text NOT NULL DEFAULT 'refusal_opportunity', -- refusal_opportunity, demand_gap, precision_niche
  status text NOT NULL DEFAULT 'draft', -- draft, review, published, archived
  -- Content fields
  h1 text NOT NULL,
  meta_title text NOT NULL,
  meta_description text NOT NULL,
  problem_explanation text,
  why_contractors_refuse text,
  correct_solution text,
  recommended_professional text,
  materials_detail text,
  structure_context text,
  cost_estimate_min int,
  cost_estimate_max int,
  cost_unit text DEFAULT '$/pi²',
  faq_json jsonb DEFAULT '[]',
  internal_links_json jsonb DEFAULT '[]',
  json_ld jsonb,
  -- Targeting
  problem_slug text,
  solution_slug text,
  city_slug text,
  city_name text,
  material text,
  structure_type text,
  profession_slug text,
  -- Signals
  source_signal_ids uuid[] DEFAULT '{}',
  signal_count int NOT NULL DEFAULT 0,
  demand_score numeric DEFAULT 0,
  -- Tracking
  views int NOT NULL DEFAULT 0,
  conversions int NOT NULL DEFAULT 0,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.contractor_refusal_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refusal_seo_pages ENABLE ROW LEVEL SECURITY;

-- Signals: admin full access, contractors read own
CREATE POLICY "admin_full_refusal_signals" ON public.contractor_refusal_signals
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "contractor_read_own_signals" ON public.contractor_refusal_signals
  FOR SELECT TO authenticated USING (
    contractor_id IN (SELECT id FROM public.contractors WHERE user_id = auth.uid())
  );

-- SEO pages: public read published, admin full
CREATE POLICY "public_read_published_seo" ON public.refusal_seo_pages
  FOR SELECT TO anon USING (status = 'published');
CREATE POLICY "auth_read_published_seo" ON public.refusal_seo_pages
  FOR SELECT TO authenticated USING (status = 'published');
CREATE POLICY "admin_full_refusal_seo" ON public.refusal_seo_pages
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Index for slug lookups
CREATE INDEX idx_refusal_seo_pages_slug ON public.refusal_seo_pages(slug);
CREATE INDEX idx_refusal_signals_problem ON public.contractor_refusal_signals(problem_slug, city_slug);
