ALTER TABLE public.contractor_prospects
  ADD COLUMN IF NOT EXISTS trade text,
  ADD COLUMN IF NOT EXISTS source text,
  ADD COLUMN IF NOT EXISTS source_url text,
  ADD COLUMN IF NOT EXISTS discovery_method text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS aipp_score numeric,
  ADD COLUMN IF NOT EXISTS confidence_score numeric,
  ADD COLUMN IF NOT EXISTS priority_score numeric,
  ADD COLUMN IF NOT EXISTS raw_data jsonb DEFAULT '{}'::jsonb;
