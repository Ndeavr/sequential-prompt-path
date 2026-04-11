
-- Prospection Jobs
CREATE TABLE public.prospection_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name TEXT NOT NULL,
  target_category TEXT,
  target_cities_json JSONB DEFAULT '[]'::jsonb,
  radius_km INTEGER DEFAULT 25,
  languages_json JSONB DEFAULT '["fr"]'::jsonb,
  keywords_json JSONB DEFAULT '[]'::jsonb,
  job_status TEXT NOT NULL DEFAULT 'pending',
  leads_generated_count INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by_user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.prospection_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage prospection_jobs"
  ON public.prospection_jobs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Prospection Sources
CREATE TABLE public.prospection_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_name TEXT NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'web',
  reliability_score NUMERIC DEFAULT 0.5,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.prospection_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage prospection_sources"
  ON public.prospection_sources FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Prospection Queries
CREATE TABLE public.prospection_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES public.prospection_jobs(id) ON DELETE CASCADE NOT NULL,
  query_text TEXT NOT NULL,
  query_type TEXT DEFAULT 'google_search',
  source TEXT DEFAULT 'google',
  results_count INTEGER DEFAULT 0,
  executed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.prospection_queries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage prospection_queries"
  ON public.prospection_queries FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Raw Results
CREATE TABLE public.prospection_results_raw (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query_id UUID REFERENCES public.prospection_queries(id) ON DELETE CASCADE NOT NULL,
  source_id UUID REFERENCES public.prospection_sources(id),
  raw_payload_json JSONB DEFAULT '{}'::jsonb,
  extracted_flag BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.prospection_results_raw ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage prospection_results_raw"
  ON public.prospection_results_raw FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Lead Enrichment Data
CREATE TABLE public.lead_enrichment_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES public.contractor_leads(id) ON DELETE CASCADE NOT NULL,
  website_analysis_json JSONB DEFAULT '{}'::jsonb,
  review_analysis_json JSONB DEFAULT '{}'::jsonb,
  services_detected_json JSONB DEFAULT '[]'::jsonb,
  geo_detected_json JSONB DEFAULT '{}'::jsonb,
  data_confidence_score NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.lead_enrichment_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage lead_enrichment_data"
  ON public.lead_enrichment_data FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Lead Source Links
CREATE TABLE public.lead_source_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES public.contractor_leads(id) ON DELETE CASCADE NOT NULL,
  source_type TEXT NOT NULL,
  source_url TEXT,
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.lead_source_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage lead_source_links"
  ON public.lead_source_links FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Lead Deduplication Index
CREATE TABLE public.lead_deduplication_index (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES public.contractor_leads(id) ON DELETE CASCADE NOT NULL,
  fingerprint_hash TEXT NOT NULL,
  duplicate_group_id UUID,
  confidence NUMERIC DEFAULT 1.0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.lead_deduplication_index ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage lead_deduplication_index"
  ON public.lead_deduplication_index FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_dedup_fingerprint ON public.lead_deduplication_index(fingerprint_hash);

-- Lead Priority Scores
CREATE TABLE public.lead_priority_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES public.contractor_leads(id) ON DELETE CASCADE NOT NULL,
  priority_score NUMERIC DEFAULT 0,
  priority_level TEXT DEFAULT 'LOW',
  scoring_breakdown_json JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.lead_priority_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage lead_priority_scores"
  ON public.lead_priority_scores FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Add prospection columns to contractor_leads
ALTER TABLE public.contractor_leads
  ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS source_job_id UUID REFERENCES public.prospection_jobs(id),
  ADD COLUMN IF NOT EXISTS source_query_id UUID REFERENCES public.prospection_queries(id),
  ADD COLUMN IF NOT EXISTS priority_score NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS priority_level TEXT DEFAULT 'LOW';

-- Seed default sources
INSERT INTO public.prospection_sources (source_name, source_type, reliability_score) VALUES
  ('Google Search', 'search_engine', 0.7),
  ('Google Maps', 'maps', 0.85),
  ('Pages Jaunes', 'directory', 0.6),
  ('RBQ Registry', 'government', 0.95),
  ('NEQ Registry', 'government', 0.95),
  ('Company Website', 'web', 0.8);
