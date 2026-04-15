
-- Create contractor_enriched_profiles table
CREATE TABLE public.contractor_enriched_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES public.contractor_leads(id) ON DELETE CASCADE NOT NULL,
  reviews_count INTEGER DEFAULT 0,
  rating NUMERIC(3,2),
  services JSONB DEFAULT '[]'::jsonb,
  images JSONB DEFAULT '[]'::jsonb,
  gmb_data JSONB,
  rbq_status TEXT,
  neq_status TEXT,
  seo_score NUMERIC(5,2),
  aeo_score NUMERIC(5,2),
  social_profiles JSONB DEFAULT '{}'::jsonb,
  enrichment_source TEXT DEFAULT 'agent',
  enriched_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(lead_id)
);

-- Enable RLS
ALTER TABLE public.contractor_enriched_profiles ENABLE ROW LEVEL SECURITY;

-- Admin-only policies
CREATE POLICY "Admins can manage enriched profiles"
  ON public.contractor_enriched_profiles
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Service role full access for edge functions
CREATE POLICY "Service role full access enriched profiles"
  ON public.contractor_enriched_profiles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.contractor_enriched_profiles;

-- Index
CREATE INDEX idx_enriched_profiles_lead ON public.contractor_enriched_profiles(lead_id);
