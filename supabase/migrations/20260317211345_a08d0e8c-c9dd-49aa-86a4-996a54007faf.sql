
-- ===========================================
-- UNPRO Editorial Engine — Phase 1 Backend
-- ===========================================

-- 1. blog_articles
CREATE TABLE public.blog_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  subtitle TEXT,
  slug TEXT NOT NULL UNIQUE,
  content_markdown TEXT,
  content_html TEXT,
  audience_type TEXT NOT NULL DEFAULT 'public' CHECK (audience_type IN ('public', 'entrepreneur', 'both')),
  is_gated BOOLEAN NOT NULL DEFAULT false,
  city TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  tags TEXT[] DEFAULT '{}',
  seo_title TEXT,
  meta_description TEXT,
  faq_json JSONB DEFAULT '[]',
  schema_json JSONB DEFAULT '{}',
  internal_linking_json JSONB DEFAULT '[]',
  featured_image_url TEXT,
  word_count INTEGER DEFAULT 0,
  reading_time_minutes INTEGER DEFAULT 0,
  scheduled_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'generating', 'review', 'scheduled', 'published', 'archived')),
  author_name TEXT DEFAULT 'UNPRO',
  cta_variant TEXT DEFAULT 'default',
  generation_run_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_blog_articles_slug ON public.blog_articles(slug);
CREATE INDEX idx_blog_articles_status ON public.blog_articles(status);
CREATE INDEX idx_blog_articles_audience ON public.blog_articles(audience_type);
CREATE INDEX idx_blog_articles_category ON public.blog_articles(category);
CREATE INDEX idx_blog_articles_city ON public.blog_articles(city);
CREATE INDEX idx_blog_articles_scheduled ON public.blog_articles(scheduled_at) WHERE status = 'scheduled';
CREATE INDEX idx_blog_articles_published ON public.blog_articles(published_at DESC) WHERE status = 'published';

-- 2. blog_article_images
CREATE TABLE public.blog_article_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES public.blog_articles(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  alt_text TEXT NOT NULL DEFAULT '',
  caption TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  width INTEGER,
  height INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_blog_article_images_article ON public.blog_article_images(article_id);

-- 3. blog_publish_queue
CREATE TABLE public.blog_publish_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES public.blog_articles(id) ON DELETE CASCADE,
  scheduled_for TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'published', 'failed', 'cancelled')),
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  error_message TEXT,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_blog_publish_queue_status ON public.blog_publish_queue(status, scheduled_for);
CREATE INDEX idx_blog_publish_queue_article ON public.blog_publish_queue(article_id);

-- 4. blog_internal_links
CREATE TABLE public.blog_internal_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_article_id UUID NOT NULL REFERENCES public.blog_articles(id) ON DELETE CASCADE,
  target_article_id UUID REFERENCES public.blog_articles(id) ON DELETE SET NULL,
  target_url TEXT NOT NULL,
  target_type TEXT NOT NULL DEFAULT 'article' CHECK (target_type IN ('article', 'city_page', 'mission_page', 'signup_page', 'mirror_article', 'seo_page')),
  anchor_text TEXT NOT NULL,
  relevance_score NUMERIC(3,2) DEFAULT 0.5,
  position_in_content TEXT DEFAULT 'body',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_blog_internal_links_source ON public.blog_internal_links(source_article_id);
CREATE INDEX idx_blog_internal_links_target ON public.blog_internal_links(target_article_id);

-- 5. blog_analytics
CREATE TABLE public.blog_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES public.blog_articles(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  avg_position NUMERIC(5,2),
  avg_time_on_page_seconds INTEGER DEFAULT 0,
  scroll_depth_avg NUMERIC(5,2) DEFAULT 0,
  signups INTEGER DEFAULT 0,
  unlocks INTEGER DEFAULT 0,
  subscriptions INTEGER DEFAULT 0,
  bounce_rate NUMERIC(5,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(article_id, date)
);

CREATE INDEX idx_blog_analytics_article_date ON public.blog_analytics(article_id, date DESC);

-- 6. topic_backlog
CREATE TABLE public.topic_backlog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title_suggestion TEXT NOT NULL,
  audience_type TEXT NOT NULL DEFAULT 'public' CHECK (audience_type IN ('public', 'entrepreneur', 'both')),
  category TEXT NOT NULL DEFAULT 'general',
  city TEXT,
  angle TEXT,
  priority INTEGER NOT NULL DEFAULT 50,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'rejected')),
  source TEXT DEFAULT 'manual',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_topic_backlog_status ON public.topic_backlog(status, priority DESC);

-- 7. title_tests
CREATE TABLE public.title_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES public.blog_articles(id) ON DELETE CASCADE,
  variant_title TEXT NOT NULL,
  variant_index INTEGER NOT NULL DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  ctr NUMERIC(5,4) DEFAULT 0,
  is_winner BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_title_tests_article ON public.title_tests(article_id);

-- 8. gated_unlock_events
CREATE TABLE public.gated_unlock_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES public.blog_articles(id) ON DELETE CASCADE,
  user_id UUID,
  unlock_method TEXT NOT NULL DEFAULT 'login' CHECK (unlock_method IN ('login', 'signup', 'subscription', 'trial')),
  converted_to_signup BOOLEAN DEFAULT false,
  converted_to_subscription BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_gated_unlock_article ON public.gated_unlock_events(article_id);
CREATE INDEX idx_gated_unlock_user ON public.gated_unlock_events(user_id);

-- 9. content_generation_runs
CREATE TABLE public.content_generation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_type TEXT NOT NULL DEFAULT 'full_pipeline' CHECK (run_type IN ('full_pipeline', 'topic_generation', 'article_generation', 'rewrite', 'faq_schema', 'internal_links', 'image_generation')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  topic_id UUID REFERENCES public.topic_backlog(id),
  article_id UUID REFERENCES public.blog_articles(id),
  input_json JSONB DEFAULT '{}',
  output_json JSONB DEFAULT '{}',
  error_message TEXT,
  duration_ms INTEGER,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_content_gen_runs_status ON public.content_generation_runs(status);
CREATE INDEX idx_content_gen_runs_article ON public.content_generation_runs(article_id);

-- TRIGGERS: updated_at
CREATE TRIGGER trg_blog_articles_updated_at BEFORE UPDATE ON public.blog_articles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_blog_publish_queue_updated_at BEFORE UPDATE ON public.blog_publish_queue FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_topic_backlog_updated_at BEFORE UPDATE ON public.topic_backlog FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- TRIGGER: auto-enqueue when article becomes scheduled
CREATE OR REPLACE FUNCTION public.enqueue_scheduled_article()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'scheduled' AND (OLD.status IS NULL OR OLD.status != 'scheduled') AND NEW.scheduled_at IS NOT NULL THEN
    INSERT INTO public.blog_publish_queue (article_id, scheduled_for, status)
    VALUES (NEW.id, NEW.scheduled_at, 'pending')
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_enqueue_on_scheduled
  AFTER INSERT OR UPDATE OF status ON public.blog_articles
  FOR EACH ROW
  EXECUTE FUNCTION public.enqueue_scheduled_article();

-- FUNCTION: validate_article_readiness
CREATE OR REPLACE FUNCTION public.validate_article_readiness(_article_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  a record;
  img_count integer;
  errors text[] := '{}';
  result boolean := true;
BEGIN
  SELECT * INTO a FROM public.blog_articles WHERE id = _article_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('valid', false, 'errors', ARRAY['Article not found']); END IF;

  IF a.faq_json IS NULL OR jsonb_array_length(a.faq_json) < 5 THEN
    errors := array_append(errors, 'FAQ manquante ou < 5 questions');
    result := false;
  END IF;

  IF a.schema_json IS NULL OR a.schema_json = '{}'::jsonb THEN
    errors := array_append(errors, 'JSON-LD manquant');
    result := false;
  END IF;

  IF a.internal_linking_json IS NULL OR jsonb_array_length(a.internal_linking_json) < 3 THEN
    errors := array_append(errors, 'Maillage interne < 3 liens');
    result := false;
  END IF;

  SELECT count(*) INTO img_count FROM public.blog_article_images WHERE article_id = _article_id;
  IF img_count < 2 THEN
    errors := array_append(errors, format('Images insuffisantes (%s/2)', img_count));
    result := false;
  END IF;

  IF a.meta_description IS NULL OR length(a.meta_description) < 50 THEN
    errors := array_append(errors, 'Meta description manquante ou trop courte');
    result := false;
  END IF;

  IF a.seo_title IS NULL OR length(a.seo_title) < 20 THEN
    errors := array_append(errors, 'SEO title manquant ou trop court');
    result := false;
  END IF;

  IF a.word_count < 800 THEN
    errors := array_append(errors, format('Longueur insuffisante (%s mots, min 800)', a.word_count));
    result := false;
  END IF;

  IF a.cta_variant IS NULL OR a.cta_variant = '' THEN
    errors := array_append(errors, 'CTA variant manquant');
    result := false;
  END IF;

  RETURN jsonb_build_object('valid', result, 'errors', to_jsonb(errors), 'word_count', a.word_count, 'faq_count', COALESCE(jsonb_array_length(a.faq_json), 0), 'image_count', img_count);
END;
$$;

-- RLS
ALTER TABLE public.blog_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_article_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_publish_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_internal_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topic_backlog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.title_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gated_unlock_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_generation_runs ENABLE ROW LEVEL SECURITY;

-- Public read for published articles
CREATE POLICY "Published articles are public" ON public.blog_articles FOR SELECT USING (status = 'published');
CREATE POLICY "Admins manage all articles" ON public.blog_articles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Article images public for published" ON public.blog_article_images FOR SELECT USING (EXISTS (SELECT 1 FROM public.blog_articles WHERE id = article_id AND status = 'published'));
CREATE POLICY "Admins manage article images" ON public.blog_article_images FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage publish queue" ON public.blog_publish_queue FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Internal links public for published" ON public.blog_internal_links FOR SELECT USING (EXISTS (SELECT 1 FROM public.blog_articles WHERE id = source_article_id AND status = 'published'));
CREATE POLICY "Admins manage internal links" ON public.blog_internal_links FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins view analytics" ON public.blog_analytics FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage topic backlog" ON public.topic_backlog FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage title tests" ON public.title_tests FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can create unlock events" ON public.gated_unlock_events FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins view unlock events" ON public.gated_unlock_events FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users view own unlocks" ON public.gated_unlock_events FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Admins manage gen runs" ON public.content_generation_runs FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('blog-images', 'blog-images', true) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Blog images are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'blog-images');
CREATE POLICY "Admins upload blog images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'blog-images' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete blog images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'blog-images' AND public.has_role(auth.uid(), 'admin'));
