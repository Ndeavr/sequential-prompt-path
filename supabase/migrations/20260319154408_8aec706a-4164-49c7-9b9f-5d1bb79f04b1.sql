
-- Extend seo_pages with richer content fields for programmatic SEO
ALTER TABLE public.seo_pages
  ADD COLUMN IF NOT EXISTS h1 text,
  ADD COLUMN IF NOT EXISTS body_md text,
  ADD COLUMN IF NOT EXISTS faq_json jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS schema_json jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS intent text,
  ADD COLUMN IF NOT EXISTS profession text,
  ADD COLUMN IF NOT EXISTS specialty text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS published_at timestamptz,
  ADD COLUMN IF NOT EXISTS internal_links jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS views integer DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_seo_pages_slug ON public.seo_pages(slug);
CREATE INDEX IF NOT EXISTS idx_seo_pages_city ON public.seo_pages(city);
CREATE INDEX IF NOT EXISTS idx_seo_pages_status ON public.seo_pages(status);
CREATE INDEX IF NOT EXISTS idx_seo_pages_profession ON public.seo_pages(profession);
