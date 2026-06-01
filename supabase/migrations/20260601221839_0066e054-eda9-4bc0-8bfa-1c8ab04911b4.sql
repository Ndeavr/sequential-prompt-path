-- Dedupe intelligence upgrade
ALTER TABLE public.contractor_prospects
  ADD COLUMN IF NOT EXISTS dedupe_confidence numeric(3,2),
  ADD COLUMN IF NOT EXISTS dedupe_matched_id uuid REFERENCES public.contractor_prospects(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS dedupe_signals jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS google_place_id text,
  ADD COLUMN IF NOT EXISTS normalized_domain text,
  ADD COLUMN IF NOT EXISTS last_enriched_at timestamptz,
  ADD COLUMN IF NOT EXISTS enrichment_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ingestion_status text NOT NULL DEFAULT 'inserted';

ALTER TABLE public.contractor_prospects
  DROP CONSTRAINT IF EXISTS contractor_prospects_ingestion_status_check;
ALTER TABLE public.contractor_prospects
  ADD CONSTRAINT contractor_prospects_ingestion_status_check
  CHECK (ingestion_status IN ('inserted','possible_duplicate','enriched_existing','skipped_duplicate','failed_extraction'));

CREATE INDEX IF NOT EXISTS idx_cp_place_id ON public.contractor_prospects(google_place_id) WHERE google_place_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cp_domain ON public.contractor_prospects(normalized_domain) WHERE normalized_domain IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cp_rbq_notnull ON public.contractor_prospects(rbq) WHERE rbq IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cp_phone_city ON public.contractor_prospects(phone, city) WHERE phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cp_ingestion_status ON public.contractor_prospects(ingestion_status);

-- Backfill: google_place_id from source_record_id when source = google_places
UPDATE public.contractor_prospects
SET google_place_id = source_record_id
WHERE google_place_id IS NULL
  AND source_record_id IS NOT NULL
  AND (source = 'google_places' OR source_name = 'google_places');

-- Backfill normalized_domain
UPDATE public.contractor_prospects
SET normalized_domain = lower(
  regexp_replace(
    regexp_replace(website_url, '^https?://(www\.)?', ''),
    '/.*$', ''
  )
)
WHERE normalized_domain IS NULL
  AND website_url IS NOT NULL
  AND website_url <> '';

-- Review queue
CREATE TABLE IF NOT EXISTS public.prospect_dedupe_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_prospect_id uuid REFERENCES public.contractor_prospects(id) ON DELETE CASCADE,
  existing_prospect_id uuid REFERENCES public.contractor_prospects(id) ON DELETE CASCADE,
  confidence numeric(3,2) NOT NULL,
  signals jsonb NOT NULL DEFAULT '{}'::jsonb,
  new_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','merged','rejected','kept_both')),
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, UPDATE ON public.prospect_dedupe_reviews TO authenticated;
GRANT ALL ON public.prospect_dedupe_reviews TO service_role;

ALTER TABLE public.prospect_dedupe_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins read dedupe reviews" ON public.prospect_dedupe_reviews;
CREATE POLICY "admins read dedupe reviews" ON public.prospect_dedupe_reviews
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "admins update dedupe reviews" ON public.prospect_dedupe_reviews;
CREATE POLICY "admins update dedupe reviews" ON public.prospect_dedupe_reviews
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_dedupe_reviews_status ON public.prospect_dedupe_reviews(status, created_at DESC);