-- SEO Generation Logs
CREATE TABLE public.seo_generation_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  page_id UUID REFERENCES public.seo_pages(id) ON DELETE CASCADE,
  generation_type TEXT NOT NULL DEFAULT 'initial',
  agent_version TEXT DEFAULT 'v1',
  quality_score INTEGER DEFAULT 0,
  content_hash TEXT,
  generation_time_ms INTEGER,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.seo_generation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage generation logs"
  ON public.seo_generation_logs FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_seo_gen_logs_page ON public.seo_generation_logs(page_id);

-- SEO Indexation Tracking
CREATE TABLE public.seo_indexation_tracking (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  page_id UUID REFERENCES public.seo_pages(id) ON DELETE CASCADE NOT NULL UNIQUE,
  indexed BOOLEAN DEFAULT false,
  last_checked_at TIMESTAMPTZ,
  first_indexed_at TIMESTAMPTZ,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  position_avg NUMERIC(5,2),
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.seo_indexation_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage indexation tracking"
  ON public.seo_indexation_tracking FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_seo_indexation_page ON public.seo_indexation_tracking(page_id);
CREATE INDEX idx_seo_indexation_status ON public.seo_indexation_tracking(status);

-- Add missing columns to seo_pages if needed
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'seo_pages' AND column_name = 'generation_version') THEN
    ALTER TABLE public.seo_pages ADD COLUMN generation_version TEXT DEFAULT 'v1';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'seo_pages' AND column_name = 'quality_score') THEN
    ALTER TABLE public.seo_pages ADD COLUMN quality_score INTEGER DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'seo_pages' AND column_name = 'content_hash') THEN
    ALTER TABLE public.seo_pages ADD COLUMN content_hash TEXT;
  END IF;
END $$;