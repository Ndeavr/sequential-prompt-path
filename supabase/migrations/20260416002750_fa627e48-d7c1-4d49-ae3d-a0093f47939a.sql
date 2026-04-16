
-- Article Keywords
CREATE TABLE public.article_keywords (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  article_id UUID NOT NULL,
  keyword TEXT NOT NULL,
  priority INTEGER NOT NULL DEFAULT 0,
  density_score NUMERIC(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.article_keywords ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view article keywords" ON public.article_keywords FOR SELECT USING (true);
CREATE POLICY "Authenticated users can manage keywords" ON public.article_keywords FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX idx_article_keywords_article ON public.article_keywords(article_id);

-- Article SEO Scores
CREATE TABLE public.article_seo_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  article_id UUID NOT NULL UNIQUE,
  seo_score INTEGER DEFAULT 0,
  readability_score INTEGER DEFAULT 0,
  aeo_score INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.article_seo_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view seo scores" ON public.article_seo_scores FOR SELECT USING (true);
CREATE POLICY "Authenticated users can manage seo scores" ON public.article_seo_scores FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Article Internal Links
CREATE TABLE public.article_internal_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  article_id UUID NOT NULL,
  target_url TEXT NOT NULL,
  anchor_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.article_internal_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view internal links" ON public.article_internal_links FOR SELECT USING (true);
CREATE POLICY "Authenticated users can manage internal links" ON public.article_internal_links FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX idx_article_internal_links_article ON public.article_internal_links(article_id);
