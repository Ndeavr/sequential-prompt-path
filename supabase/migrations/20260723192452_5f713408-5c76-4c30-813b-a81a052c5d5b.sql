
-- Official-site enrichment evidence — append-only per-field provenance.
-- Backs the new enrich-official-website edge function. No PII beyond
-- what is publicly published on the contractor's own website.

CREATE TABLE IF NOT EXISTS public.official_site_enrichment_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_lead_id UUID REFERENCES public.contractor_leads(id) ON DELETE SET NULL,
  prospect_id UUID REFERENCES public.verified_contractor_prospects(id) ON DELETE SET NULL,
  canonical_domain TEXT NOT NULL,
  source_url TEXT NOT NULL,
  field_kind TEXT NOT NULL CHECK (field_kind IN ('phone','email','postal_code','address','rbq','org_name','person_name')),
  raw_value TEXT NOT NULL,
  normalized_value TEXT,
  extraction_method TEXT NOT NULL,
  trust_state TEXT NOT NULL DEFAULT 'source_confirmed'
    CHECK (trust_state IN ('externally_verified','source_confirmed','declared','inferred','pending_verification')),
  page_title TEXT,
  page_language TEXT,
  content_hash TEXT,
  snippet TEXT,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.official_site_enrichment_evidence TO authenticated;
GRANT ALL ON public.official_site_enrichment_evidence TO service_role;

ALTER TABLE public.official_site_enrichment_evidence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins read osee" ON public.official_site_enrichment_evidence
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "service role manages osee" ON public.official_site_enrichment_evidence
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS osee_lead_idx ON public.official_site_enrichment_evidence(contractor_lead_id);
CREATE INDEX IF NOT EXISTS osee_prospect_idx ON public.official_site_enrichment_evidence(prospect_id);
CREATE INDEX IF NOT EXISTS osee_domain_idx ON public.official_site_enrichment_evidence(canonical_domain);
CREATE INDEX IF NOT EXISTS osee_kind_idx ON public.official_site_enrichment_evidence(field_kind);

-- Crawl-level status per (target, domain) so we can distinguish
-- "complete-no-contact" from "retryable-transient-failure".
CREATE TABLE IF NOT EXISTS public.official_site_crawl_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_lead_id UUID REFERENCES public.contractor_leads(id) ON DELETE SET NULL,
  prospect_id UUID REFERENCES public.verified_contractor_prospects(id) ON DELETE SET NULL,
  canonical_domain TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN (
    'queued','crawling','complete_with_contact','complete_no_contact',
    'no_official_domain','retryable','blocked','failed'
  )),
  pages_attempted INTEGER NOT NULL DEFAULT 0,
  pages_ok INTEGER NOT NULL DEFAULT 0,
  had_transient_failure BOOLEAN NOT NULL DEFAULT false,
  reason TEXT,
  page_failures JSONB NOT NULL DEFAULT '[]'::jsonb,
  summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.official_site_crawl_runs TO authenticated;
GRANT ALL ON public.official_site_crawl_runs TO service_role;

ALTER TABLE public.official_site_crawl_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins read oscr" ON public.official_site_crawl_runs
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "service role manages oscr" ON public.official_site_crawl_runs
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS oscr_lead_idx ON public.official_site_crawl_runs(contractor_lead_id);
CREATE INDEX IF NOT EXISTS oscr_prospect_idx ON public.official_site_crawl_runs(prospect_id);
CREATE INDEX IF NOT EXISTS oscr_status_idx ON public.official_site_crawl_runs(status);

-- Add trust-state columns to contractor_leads so an official-site
-- extraction never silently overwrites a higher-trust verified value.
ALTER TABLE public.contractor_leads
  ADD COLUMN IF NOT EXISTS phone_source_url TEXT,
  ADD COLUMN IF NOT EXISTS phone_trust_state TEXT
    CHECK (phone_trust_state IS NULL OR phone_trust_state IN (
      'externally_verified','source_confirmed','declared','inferred','pending_verification'
    )),
  ADD COLUMN IF NOT EXISTS email_source_url TEXT,
  ADD COLUMN IF NOT EXISTS email_trust_state TEXT
    CHECK (email_trust_state IS NULL OR email_trust_state IN (
      'externally_verified','source_confirmed','declared','inferred','pending_verification'
    )),
  ADD COLUMN IF NOT EXISTS official_domain TEXT,
  ADD COLUMN IF NOT EXISTS official_site_status TEXT
    CHECK (official_site_status IS NULL OR official_site_status IN (
      'not_attempted','queued','crawling','complete_with_contact',
      'complete_no_contact','no_official_domain','retryable','blocked','failed'
    )),
  ADD COLUMN IF NOT EXISTS official_site_checked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS missing_contact_after_crawl BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS contractor_leads_official_status_idx
  ON public.contractor_leads(official_site_status);
