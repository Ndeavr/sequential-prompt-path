
-- Create pages_queue table for autopilot SEO publishing
CREATE TABLE public.pages_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text,
  city text,
  service text,
  page_type text DEFAULT 'city_service',
  priority_score integer DEFAULT 50,
  publish_date date,
  status text DEFAULT 'queued',
  content_json jsonb,
  word_count integer DEFAULT 0,
  has_schema boolean DEFAULT false,
  has_faq boolean DEFAULT false,
  has_answer_block boolean DEFAULT false,
  index_requested boolean DEFAULT false,
  impressions integer DEFAULT 0,
  clicks integer DEFAULT 0,
  leads integer DEFAULT 0,
  last_refreshed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX idx_pages_queue_status ON public.pages_queue(status);
CREATE INDEX idx_pages_queue_publish_date ON public.pages_queue(publish_date);
CREATE INDEX idx_pages_queue_priority ON public.pages_queue(priority_score DESC);
CREATE INDEX idx_pages_queue_page_type ON public.pages_queue(page_type);

-- Enable RLS
ALTER TABLE public.pages_queue ENABLE ROW LEVEL SECURITY;

-- Admin-only policies using has_role
CREATE POLICY "Admins can view all queue items"
  ON public.pages_queue FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert queue items"
  ON public.pages_queue FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update queue items"
  ON public.pages_queue FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete queue items"
  ON public.pages_queue FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Service role access for edge functions
CREATE POLICY "Service role full access on pages_queue"
  ON public.pages_queue FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Auto-update timestamp trigger
CREATE TRIGGER update_pages_queue_updated_at
  BEFORE UPDATE ON public.pages_queue
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
