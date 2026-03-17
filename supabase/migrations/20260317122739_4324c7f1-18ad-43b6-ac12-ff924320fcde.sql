-- SEO pages for property-type × city × problem combinations
CREATE TABLE IF NOT EXISTS public.seo_property_type_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_type_slug text NOT NULL,
  property_family text NOT NULL,
  city_id uuid REFERENCES public.cities(id),
  city_slug text,
  problem_slug text,
  problem_id uuid REFERENCES public.home_problems(id),
  page_type text NOT NULL DEFAULT 'property_type_hub',
  slug text NOT NULL,
  h1 text NOT NULL,
  meta_title text,
  meta_description text,
  target_keyword text,
  content_blocks jsonb DEFAULT '{}'::jsonb,
  faq jsonb DEFAULT '[]'::jsonb,
  internal_links jsonb DEFAULT '[]'::jsonb,
  schema_json jsonb,
  priority_score numeric DEFAULT 0,
  uniqueness_score numeric DEFAULT 0,
  content_quality_score numeric DEFAULT 0,
  generation_status text DEFAULT 'pending',
  is_published boolean DEFAULT false,
  is_indexed boolean DEFAULT false,
  canonical_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  published_at timestamptz,
  last_crawled_at timestamptz,
  UNIQUE(slug)
);

CREATE INDEX idx_seo_pt_pages_type_city ON public.seo_property_type_pages(property_type_slug, city_slug);
CREATE INDEX idx_seo_pt_pages_status ON public.seo_property_type_pages(generation_status, is_published);
CREATE INDEX idx_seo_pt_pages_priority ON public.seo_property_type_pages(priority_score DESC);

ALTER TABLE public.graph_page_blueprints ADD COLUMN IF NOT EXISTS property_type_slug text;

ALTER TABLE public.seo_property_type_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read published seo property type pages"
  ON public.seo_property_type_pages FOR SELECT
  USING (is_published = true);

CREATE POLICY "Admins can manage seo property type pages"
  ON public.seo_property_type_pages FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER set_updated_at_seo_property_type_pages
  BEFORE UPDATE ON public.seo_property_type_pages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();