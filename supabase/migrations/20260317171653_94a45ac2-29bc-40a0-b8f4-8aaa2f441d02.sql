
-- Deep Links table for smart deep link system
CREATE TABLE public.deep_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  feature text NOT NULL,
  sub_feature text,
  role text DEFAULT 'homeowner',
  context_json jsonb DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast code lookups
CREATE INDEX idx_deep_links_code ON public.deep_links (code);

-- RLS
ALTER TABLE public.deep_links ENABLE ROW LEVEL SECURITY;

-- Public read (anyone can resolve a deep link)
CREATE POLICY "Anyone can read deep links"
  ON public.deep_links FOR SELECT
  TO anon, authenticated
  USING (true);

-- Only authenticated users can create
CREATE POLICY "Authenticated users can create deep links"
  ON public.deep_links FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- Admins can manage all
CREATE POLICY "Admins can manage deep links"
  ON public.deep_links FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
