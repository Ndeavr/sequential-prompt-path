-- PR Loop Engine tables

CREATE TABLE public.pr_topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text UNIQUE NOT NULL,
  category text NOT NULL DEFAULT 'pain',
  status text NOT NULL DEFAULT 'draft',
  priority_score integer NOT NULL DEFAULT 50,
  week_number integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.pr_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id uuid NOT NULL REFERENCES public.pr_topics(id) ON DELETE CASCADE,
  channel text NOT NULL,
  content_text text,
  hook text,
  cta text,
  brand_mentions integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'queued',
  scheduled_date date,
  published_at timestamptz,
  engagement_clicks integer NOT NULL DEFAULT 0,
  engagement_shares integer NOT NULL DEFAULT 0,
  mentions_gained integer NOT NULL DEFAULT 0,
  backlinks_gained integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_pr_topics_status ON public.pr_topics(status);
CREATE INDEX idx_pr_topics_week ON public.pr_topics(week_number);
CREATE INDEX idx_pr_assets_topic ON public.pr_assets(topic_id);
CREATE INDEX idx_pr_assets_channel ON public.pr_assets(channel);
CREATE INDEX idx_pr_assets_status ON public.pr_assets(status);
CREATE INDEX idx_pr_assets_scheduled ON public.pr_assets(scheduled_date);

-- RLS
ALTER TABLE public.pr_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pr_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access pr_topics" ON public.pr_topics
  FOR ALL USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins full access pr_assets" ON public.pr_assets
  FOR ALL USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Updated_at triggers
CREATE TRIGGER update_pr_topics_updated_at
  BEFORE UPDATE ON public.pr_topics
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pr_assets_updated_at
  BEFORE UPDATE ON public.pr_assets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();