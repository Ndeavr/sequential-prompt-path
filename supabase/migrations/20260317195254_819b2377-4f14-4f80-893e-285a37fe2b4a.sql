
-- SEO Articles table for auto-generated long-form content
CREATE TABLE public.seo_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city text NOT NULL,
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  meta_title text,
  meta_description text,
  h1 text,
  content_html text,
  content_sections jsonb DEFAULT '[]'::jsonb,
  faq jsonb DEFAULT '[]'::jsonb,
  schema_json_ld jsonb DEFAULT '[]'::jsonb,
  internal_links jsonb DEFAULT '[]'::jsonb,
  service_category text,
  problem_slug text,
  word_count int DEFAULT 0,
  seo_score int DEFAULT 0,
  intent_score int DEFAULT 0,
  conversion_score int DEFAULT 0,
  hero_image_prompt text,
  generation_status text DEFAULT 'pending',
  generation_model text,
  published boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS but allow public read for published articles
ALTER TABLE public.seo_articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read published articles"
  ON public.seo_articles FOR SELECT
  USING (published = true);

CREATE POLICY "Admins can manage articles"
  ON public.seo_articles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Index for fast lookups
CREATE INDEX idx_seo_articles_city ON public.seo_articles(city);
CREATE INDEX idx_seo_articles_slug ON public.seo_articles(slug);
CREATE INDEX idx_seo_articles_status ON public.seo_articles(generation_status);
