
-- =====================================================================
-- 1. FREEZE PLACEHOLDER DATA (contractor_leads)
-- =====================================================================
ALTER TABLE public.contractor_leads
  ADD COLUMN IF NOT EXISTS data_status text NOT NULL DEFAULT 'needs_enrichment',
  ADD COLUMN IF NOT EXISTS sms_eligible boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS archived_reason text,
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

ALTER TABLE public.contractor_leads
  DROP CONSTRAINT IF EXISTS contractor_leads_data_status_chk;
ALTER TABLE public.contractor_leads
  ADD CONSTRAINT contractor_leads_data_status_chk
  CHECK (data_status IN ('verified','needs_enrichment','invalid','duplicate','archived_placeholder'));

-- Freeze pass: 555-numbers
UPDATE public.contractor_leads
SET data_status='archived_placeholder',
    sms_eligible=false,
    archived_reason='phone_contains_555',
    archived_at=now()
WHERE data_status<>'archived_placeholder'
  AND (phone ~ '555[- ]?\d{4}' OR phone_e164 ~ '555\d{4}$' OR mobile_phone ~ '555[- ]?\d{4}');

-- Freeze pass: no source at all
UPDATE public.contractor_leads
SET data_status='archived_placeholder',
    sms_eligible=false,
    archived_reason='no_verifiable_source',
    archived_at=now()
WHERE data_status<>'archived_placeholder'
  AND (website_url IS NULL OR website_url = '')
  AND (metadata_json->>'google_place_id') IS NULL
  AND (metadata_json->>'source_url') IS NULL;

-- Freeze pass: known seed-generated business names
UPDATE public.contractor_leads
SET data_status='archived_placeholder',
    sms_eligible=false,
    archived_reason='seed_business_name',
    archived_at=now()
WHERE data_status<>'archived_placeholder'
  AND (
    company_name ILIKE 'Toit-Vert Éco%' OR
    company_name ILIKE 'ToitStar%' OR
    company_name ILIKE 'Pro-Toit Montérégie%' OR
    company_name ILIKE 'Isolation Nord-Sud%' OR
    company_name ILIKE 'CouvertureXL%' OR
    company_name ILIKE 'Toitures Lanaudière%' OR
    company_name ILIKE 'Toiture 360%' OR
    company_name ILIKE 'Isolation Demrik%' OR
    company_name ILIKE 'Couvreur Couv-Toit%' OR
    company_name ILIKE 'Réno-Toit%' AND (phone ILIKE '%450555%' OR phone_e164 ILIKE '%450555%')
  );

-- Active view (used by Conversion Truth)
CREATE OR REPLACE VIEW public.v_active_leads
WITH (security_invoker=on) AS
SELECT * FROM public.contractor_leads
WHERE data_status <> 'archived_placeholder';

GRANT SELECT ON public.v_active_leads TO authenticated;
GRANT ALL ON public.v_active_leads TO service_role;

-- =====================================================================
-- 2. VERIFIED CONTRACTOR PROSPECTS (clean table)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.verified_contractor_prospects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name text NOT NULL,
  legal_name text,
  category text NOT NULL,
  website_url text,
  google_business_url text,
  google_place_id text,
  phone_primary text,
  phone_secondary text,
  phone_e164 text,
  phone_line_type text CHECK (phone_line_type IS NULL OR phone_line_type IN ('mobile','landline','voip','nonFixedVoip','unknown')),
  phone_validation_status text NOT NULL DEFAULT 'unverified'
    CHECK (phone_validation_status IN ('valid_mobile','valid_sms_capable_voip','landline','invalid','disconnected','unverified')),
  sms_eligible boolean NOT NULL DEFAULT false,
  email text,
  street_address text,
  city text,
  postal_code text,
  service_areas text[] DEFAULT '{}',
  rbq_number text,
  verification_status text NOT NULL DEFAULT 'needs_enrichment'
    CHECK (verification_status IN ('verified','needs_enrichment','invalid','duplicate')),
  data_quality_score int NOT NULL DEFAULT 0 CHECK (data_quality_score BETWEEN 0 AND 100),
  source_urls jsonb NOT NULL DEFAULT '{}'::jsonb,
  phone_source_url text,
  email_source_url text,
  address_source_url text,
  rbq_source_url text,
  outreach_status text NOT NULL DEFAULT 'none'
    CHECK (outreach_status IN ('none','queued','sent','delivered','clicked','failed','activated')),
  outreach_twilio_sid text,
  outreach_sent_at timestamptz,
  outreach_delivered_at timestamptz,
  outreach_clicked_at timestamptz,
  outreach_failure_reason text,
  verified_at timestamptz,
  last_enriched_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS verified_prospects_phone_uk
  ON public.verified_contractor_prospects(phone_e164) WHERE phone_e164 IS NOT NULL;
CREATE INDEX IF NOT EXISTS verified_prospects_quality_idx
  ON public.verified_contractor_prospects(data_quality_score DESC);
CREATE INDEX IF NOT EXISTS verified_prospects_outreach_idx
  ON public.verified_contractor_prospects(sms_eligible, outreach_status);

GRANT SELECT, INSERT, UPDATE ON public.verified_contractor_prospects TO authenticated;
GRANT ALL ON public.verified_contractor_prospects TO service_role;

ALTER TABLE public.verified_contractor_prospects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins manage verified prospects"
  ON public.verified_contractor_prospects FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Guardrail trigger: forbid 555 numbers, forbid verified without source
CREATE OR REPLACE FUNCTION public.verified_prospects_guard()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.phone_primary IS NOT NULL AND NEW.phone_primary ~ '555[- ]?\d{4}' THEN
    RAISE EXCEPTION 'Placeholder 555 phone number rejected: %', NEW.phone_primary;
  END IF;
  IF NEW.phone_e164 IS NOT NULL AND NEW.phone_e164 ~ '555\d{4}$' THEN
    RAISE EXCEPTION 'Placeholder 555 phone number rejected: %', NEW.phone_e164;
  END IF;
  IF NEW.verification_status = 'verified'
     AND (NEW.website_url IS NULL AND NEW.google_business_url IS NULL AND NEW.source_urls = '{}'::jsonb) THEN
    RAISE EXCEPTION 'verified status requires at least one source URL';
  END IF;
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS verified_prospects_guard_trg ON public.verified_contractor_prospects;
CREATE TRIGGER verified_prospects_guard_trg
  BEFORE INSERT OR UPDATE ON public.verified_contractor_prospects
  FOR EACH ROW EXECUTE FUNCTION public.verified_prospects_guard();

-- =====================================================================
-- 3. AUXILIARY TABLES
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.contractor_dedupe_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kept_prospect_id uuid REFERENCES public.verified_contractor_prospects(id) ON DELETE CASCADE,
  merged_from jsonb NOT NULL DEFAULT '[]'::jsonb,
  match_signal text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.contractor_dedupe_log TO authenticated;
GRANT ALL ON public.contractor_dedupe_log TO service_role;
ALTER TABLE public.contractor_dedupe_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read dedupe log" ON public.contractor_dedupe_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE IF NOT EXISTS public.contractor_enrichment_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain text NOT NULL,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  payload jsonb NOT NULL,
  UNIQUE(domain)
);
GRANT SELECT, INSERT, UPDATE ON public.contractor_enrichment_cache TO authenticated;
GRANT ALL ON public.contractor_enrichment_cache TO service_role;
ALTER TABLE public.contractor_enrichment_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage enrichment cache" ON public.contractor_enrichment_cache FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE IF NOT EXISTS public.verified_prospect_tokens (
  token text PRIMARY KEY,
  prospect_id uuid NOT NULL REFERENCES public.verified_contractor_prospects(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  clicked_at timestamptz,
  click_count int NOT NULL DEFAULT 0
);
GRANT SELECT, INSERT, UPDATE ON public.verified_prospect_tokens TO anon, authenticated;
GRANT ALL ON public.verified_prospect_tokens TO service_role;
ALTER TABLE public.verified_prospect_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public can read tokens" ON public.verified_prospect_tokens FOR SELECT TO anon, authenticated
  USING (true);
CREATE POLICY "service updates tokens" ON public.verified_prospect_tokens FOR UPDATE TO anon, authenticated
  USING (true) WITH CHECK (true);
CREATE POLICY "admins manage tokens" ON public.verified_prospect_tokens FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
