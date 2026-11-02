ALTER TABLE public.blog_articles
  ADD COLUMN IF NOT EXISTS language text NOT NULL DEFAULT 'fr' CHECK (language IN ('fr','en')),
  ADD COLUMN IF NOT EXISTS translation_slug text;
UPDATE public.blog_articles SET language='en', translation_slug='r-60-vraiment-necessaire-economies-isolation-entretoit'
  WHERE slug='is-r60-really-necessary-attic-insulation-savings';
UPDATE public.blog_articles SET translation_slug='is-r60-really-necessary-attic-insulation-savings'
  WHERE slug='r-60-vraiment-necessaire-economies-isolation-entretoit';
CREATE INDEX IF NOT EXISTS blog_articles_lang_pub_idx ON public.blog_articles(language, status, published_at DESC);