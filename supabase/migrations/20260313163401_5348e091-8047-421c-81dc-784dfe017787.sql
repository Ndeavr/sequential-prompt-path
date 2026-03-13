
-- Enrich existing service_categories with bilingual + SEO + AI fields
ALTER TABLE public.service_categories
  ADD COLUMN IF NOT EXISTS name_fr text,
  ADD COLUMN IF NOT EXISTS name_en text,
  ADD COLUMN IF NOT EXISTS description_fr text,
  ADD COLUMN IF NOT EXISTS description_en text,
  ADD COLUMN IF NOT EXISTS icon_name text,
  ADD COLUMN IF NOT EXISTS requires_admin_approval boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS seo_title_fr text,
  ADD COLUMN IF NOT EXISTS seo_description_fr text,
  ADD COLUMN IF NOT EXISTS ai_keywords text[],
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Backfill name_fr from name
UPDATE public.service_categories SET name_fr = name WHERE name_fr IS NULL AND name IS NOT NULL;

-- Problem-Solution-Category mapping
CREATE TABLE public.category_problem_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES public.service_categories(id) ON DELETE CASCADE,
  problem_id uuid REFERENCES public.home_problems(id) ON DELETE SET NULL,
  problem_slug text,
  solution_slugs text[],
  relevance_score numeric(3,2) DEFAULT 0.80,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.category_problem_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "category_problem_links_public_read" ON public.category_problem_links
  FOR SELECT USING (true);

CREATE POLICY "category_problem_links_admin_write" ON public.category_problem_links
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Contractor category assignments
CREATE TABLE public.contractor_category_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.service_categories(id) ON DELETE CASCADE,
  is_primary boolean DEFAULT false,
  assignment_source text DEFAULT 'contractor_declared',
  admin_approved boolean DEFAULT false,
  approved_at timestamptz,
  approved_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(contractor_id, category_id)
);

ALTER TABLE public.contractor_category_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contractor_category_own" ON public.contractor_category_assignments
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.contractors c WHERE c.id = contractor_id AND c.user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.contractors c WHERE c.id = contractor_id AND c.user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "contractor_category_public_read" ON public.contractor_category_assignments
  FOR SELECT USING (true);

CREATE TRIGGER update_contractor_category_assignments_updated_at BEFORE UPDATE ON public.contractor_category_assignments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Plan-based secondary category limit
CREATE OR REPLACE FUNCTION public.get_secondary_category_limit(plan_code text)
RETURNS integer
LANGUAGE sql IMMUTABLE
SET search_path TO 'public'
AS $$
  SELECT CASE
    WHEN plan_code = 'signature' THEN 10
    WHEN plan_code = 'elite' THEN 7
    WHEN plan_code = 'premium' THEN 5
    WHEN plan_code = 'pro' THEN 3
    WHEN plan_code = 'recrue' THEN 1
    ELSE 1
  END;
$$;
