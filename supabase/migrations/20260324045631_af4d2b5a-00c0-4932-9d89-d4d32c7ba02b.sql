
-- Authority System Tables

-- 1. Authority Topics
CREATE TABLE public.authority_topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  slug text,
  category text DEFAULT 'general',
  location text,
  aeo_score integer DEFAULT 0,
  status text DEFAULT 'idea' CHECK (status IN ('idea','draft','published','archived')),
  platform_coverage jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Authority Articles
CREATE TABLE public.authority_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id uuid REFERENCES public.authority_topics(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text,
  word_count integer DEFAULT 0,
  aeo_score integer DEFAULT 0,
  seo_score integer DEFAULT 0,
  status text DEFAULT 'draft' CHECK (status IN ('draft','review','published','archived')),
  published_at timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. Content Variants (multi-platform)
CREATE TABLE public.authority_content_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid REFERENCES public.authority_articles(id) ON DELETE CASCADE,
  platform text NOT NULL,
  variant_content text,
  status text DEFAULT 'pending' CHECK (status IN ('pending','scheduled','posted','failed')),
  scheduled_at timestamptz,
  posted_at timestamptz,
  engagement_score integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- 4. Distribution Queue
CREATE TABLE public.authority_distribution_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id uuid REFERENCES public.authority_content_variants(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  platform text NOT NULL,
  priority integer DEFAULT 5,
  scheduled_for timestamptz,
  status text DEFAULT 'queued' CHECK (status IN ('queued','processing','done','failed')),
  result jsonb,
  created_at timestamptz DEFAULT now()
);

-- 5. Authority Signals (mentions, backlinks, etc.)
CREATE TABLE public.authority_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  signal_type text NOT NULL,
  source text,
  source_url text,
  strength_score integer DEFAULT 50,
  metadata jsonb DEFAULT '{}'::jsonb,
  detected_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- 6. Authority Tasks (AI-generated daily tasks)
CREATE TABLE public.authority_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  duration_minutes integer DEFAULT 15,
  priority text DEFAULT 'medium' CHECK (priority IN ('low','medium','high','critical')),
  status text DEFAULT 'pending' CHECK (status IN ('pending','in_progress','done','skipped')),
  task_type text DEFAULT 'content',
  source text DEFAULT 'ai',
  related_topic_id uuid REFERENCES public.authority_topics(id) ON DELETE SET NULL,
  display_order integer DEFAULT 0,
  due_date date,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 7. Authority Performance Snapshots
CREATE TABLE public.authority_performance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  overall_score integer DEFAULT 0,
  content_volume integer DEFAULT 0,
  consistency_score integer DEFAULT 0,
  platform_diversity integer DEFAULT 0,
  signal_strength integer DEFAULT 0,
  structure_quality integer DEFAULT 0,
  growth_pct numeric(5,2) DEFAULT 0,
  snapshot_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);

-- RLS
ALTER TABLE public.authority_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.authority_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.authority_content_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.authority_distribution_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.authority_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.authority_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.authority_performance ENABLE ROW LEVEL SECURITY;

-- Policies: users CRUD own data, admins see all
CREATE POLICY "Users manage own topics" ON public.authority_topics FOR ALL TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users manage own articles" ON public.authority_articles FOR ALL TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users manage own variants" ON public.authority_content_variants FOR ALL TO authenticated USING (article_id IN (SELECT id FROM public.authority_articles WHERE user_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users manage own queue" ON public.authority_distribution_queue FOR ALL TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users manage own signals" ON public.authority_signals FOR ALL TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users manage own tasks" ON public.authority_tasks FOR ALL TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users view own performance" ON public.authority_performance FOR ALL TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Indexes
CREATE INDEX idx_authority_tasks_user_status ON public.authority_tasks(user_id, status);
CREATE INDEX idx_authority_articles_topic ON public.authority_articles(topic_id);
CREATE INDEX idx_authority_signals_user ON public.authority_signals(user_id, detected_at DESC);
CREATE INDEX idx_authority_performance_user ON public.authority_performance(user_id, snapshot_at DESC);
