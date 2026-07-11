
-- ============================================================
-- Kijiji Home Services acquisition pipeline foundation
-- ============================================================

-- 1) scraping_sources ----------------------------------------
CREATE TABLE IF NOT EXISTS public.scraping_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_key text UNIQUE NOT NULL,
  source_name text NOT NULL,
  base_url text NOT NULL,
  source_type text NOT NULL DEFAULT 'classified_ads',
  status text NOT NULL DEFAULT 'active',
  country text NOT NULL DEFAULT 'CA',
  province_scope text[] NOT NULL DEFAULT '{}',
  city_scope text[] NOT NULL DEFAULT '{}',
  rate_limit_per_minute integer NOT NULL DEFAULT 20,
  outreach_priority integer NOT NULL DEFAULT 50,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_run_at timestamptz,
  last_success_at timestamptz,
  last_error text,
  requires_manual_import boolean NOT NULL DEFAULT false,
  scrape_status text NOT NULL DEFAULT 'idle',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.scraping_sources TO authenticated;
GRANT ALL ON public.scraping_sources TO service_role;
ALTER TABLE public.scraping_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage scraping sources"
  ON public.scraping_sources FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 2) scrape_runs ---------------------------------------------
CREATE TABLE IF NOT EXISTS public.scrape_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid REFERENCES public.scraping_sources(id) ON DELETE CASCADE,
  source_key text NOT NULL,
  city text,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  status text NOT NULL DEFAULT 'running',
  pages_requested integer NOT NULL DEFAULT 0,
  pages_successful integer NOT NULL DEFAULT 0,
  listings_discovered integer NOT NULL DEFAULT 0,
  listings_processed integer NOT NULL DEFAULT 0,
  listings_qualified integer NOT NULL DEFAULT 0,
  listings_rejected integer NOT NULL DEFAULT 0,
  duplicates_found integer NOT NULL DEFAULT 0,
  mobile_numbers_found integer NOT NULL DEFAULT 0,
  emails_found integer NOT NULL DEFAULT 0,
  errors jsonb NOT NULL DEFAULT '[]'::jsonb,
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scrape_runs_source ON public.scrape_runs(source_key, started_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.scrape_runs TO authenticated;
GRANT ALL ON public.scrape_runs TO service_role;
ALTER TABLE public.scrape_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read scrape runs"
  ON public.scrape_runs FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 3) prospect_source_listings --------------------------------
CREATE TABLE IF NOT EXISTS public.prospect_source_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id uuid,
  source_key text NOT NULL,
  source_listing_id text,
  source_url text NOT NULL,
  ad_title text,
  ad_description text,
  ad_language text,
  city text,
  region text,
  province text,
  category text,
  listing_intent text,
  primary_category text,
  secondary_categories text[] NOT NULL DEFAULT '{}',
  raw_phone text,
  normalized_phone_e164 text,
  email text,
  website text,
  business_name text,
  contact_name text,
  acquisition_score integer,
  classification_confidence numeric,
  rejection_reason text,
  posted_at timestamptz,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  is_active boolean NOT NULL DEFAULT true,
  raw_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_key, source_listing_id)
);

CREATE INDEX IF NOT EXISTS idx_psl_prospect ON public.prospect_source_listings(prospect_id);
CREATE INDEX IF NOT EXISTS idx_psl_source ON public.prospect_source_listings(source_key, last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_psl_phone ON public.prospect_source_listings(normalized_phone_e164);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.prospect_source_listings TO authenticated;
GRANT ALL ON public.prospect_source_listings TO service_role;
ALTER TABLE public.prospect_source_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage prospect source listings"
  ON public.prospect_source_listings FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 4) Extend contractor_prospects -----------------------------
ALTER TABLE public.contractor_prospects
  ADD COLUMN IF NOT EXISTS source_key text,
  ADD COLUMN IF NOT EXISTS source_priority integer,
  ADD COLUMN IF NOT EXISTS acquisition_score integer,
  ADD COLUMN IF NOT EXISTS classification_confidence numeric,
  ADD COLUMN IF NOT EXISTS listing_intent text,
  ADD COLUMN IF NOT EXISTS priority_reason text[],
  ADD COLUMN IF NOT EXISTS phone_type text,
  ADD COLUMN IF NOT EXISTS phone_sms_capable boolean,
  ADD COLUMN IF NOT EXISTS first_seen_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_seen_at timestamptz,
  ADD COLUMN IF NOT EXISTS outreach_eligibility text,
  ADD COLUMN IF NOT EXISTS rejection_reason text;

CREATE INDEX IF NOT EXISTS idx_cprospects_source_score
  ON public.contractor_prospects(source_key, acquisition_score DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_cprospects_eligibility
  ON public.contractor_prospects(outreach_eligibility);

-- 5) Timestamp trigger ---------------------------------------
CREATE OR REPLACE FUNCTION public.tg_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS tg_scraping_sources_touch ON public.scraping_sources;
CREATE TRIGGER tg_scraping_sources_touch BEFORE UPDATE ON public.scraping_sources
  FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();

DROP TRIGGER IF EXISTS tg_psl_touch ON public.prospect_source_listings;
CREATE TRIGGER tg_psl_touch BEFORE UPDATE ON public.prospect_source_listings
  FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();

-- 6) Seed Kijiji source --------------------------------------
INSERT INTO public.scraping_sources (
  source_key, source_name, base_url, source_type, status,
  country, province_scope, city_scope, rate_limit_per_minute, outreach_priority, config
) VALUES (
  'kijiji_services',
  'Kijiji Services',
  'https://www.kijiji.ca/b-services',
  'classified_ads',
  'active',
  'CA',
  ARRAY['QC'],
  ARRAY['Laval','Montreal','Terrebonne','Mascouche','Repentigny','Longueuil','Brossard','Saint-Jerome','Mirabel','Blainville','Boisbriand','Sainte-Therese','Vaudreuil-Dorion','West Island','Laurentides','Lanaudiere','Monteregie','Quebec City','Gatineau','Trois-Rivieres','Sherbrooke'],
  20,
  90,
  jsonb_build_object(
    'max_pages_per_run', 40,
    'max_listings_per_city', 200,
    'max_phone_validations_per_day', 500,
    'max_ocr_requests_per_day', 50,
    'max_sms_queue_per_day', 200,
    'minimum_acquisition_score', 50,
    'crawl_delay_ms', 3000,
    'listing_refresh_days', 7
  )
) ON CONFLICT (source_key) DO NOTHING;
