
-- ─────────────────────────────────────────────────────────────
-- 1) Finding #2: business_name ↔ company_name bidirectional sync
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.contractor_leads
  ADD COLUMN IF NOT EXISTS business_name text;

-- Backfill existing rows once
UPDATE public.contractor_leads
   SET business_name = company_name
 WHERE business_name IS DISTINCT FROM company_name;

CREATE OR REPLACE FUNCTION public.sync_contractor_leads_business_name()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Canonical field is company_name. Keep business_name mirrored.
  IF TG_OP = 'INSERT' THEN
    IF NEW.company_name IS NULL AND NEW.business_name IS NOT NULL THEN
      NEW.company_name := NEW.business_name;
    END IF;
    NEW.business_name := NEW.company_name;
    RETURN NEW;
  END IF;

  -- UPDATE
  IF NEW.company_name IS DISTINCT FROM OLD.company_name THEN
    NEW.business_name := NEW.company_name;
  ELSIF NEW.business_name IS DISTINCT FROM OLD.business_name THEN
    NEW.company_name := NEW.business_name;
    NEW.business_name := NEW.company_name;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_contractor_leads_business_name ON public.contractor_leads;
CREATE TRIGGER trg_sync_contractor_leads_business_name
BEFORE INSERT OR UPDATE OF company_name, business_name
ON public.contractor_leads
FOR EACH ROW EXECUTE FUNCTION public.sync_contractor_leads_business_name();

-- ─────────────────────────────────────────────────────────────
-- 2) Extend CASL evidence to link at scrape stage
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.casl_consent_evidence
  ADD COLUMN IF NOT EXISTS contractor_prospect_id uuid
    REFERENCES public.contractor_prospects(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS outbound_company_id uuid
    REFERENCES public.outbound_companies(id)   ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS auto_captured boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS capture_agent text;

CREATE INDEX IF NOT EXISTS idx_casl_evidence_prospect
  ON public.casl_consent_evidence(contractor_prospect_id)
  WHERE contractor_prospect_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_casl_evidence_outbound
  ON public.casl_consent_evidence(outbound_company_id)
  WHERE outbound_company_id IS NOT NULL;

-- Require at least one anchor so evidence is never orphaned.
ALTER TABLE public.casl_consent_evidence
  DROP CONSTRAINT IF EXISTS casl_evidence_has_anchor;
ALTER TABLE public.casl_consent_evidence
  ADD  CONSTRAINT casl_evidence_has_anchor
  CHECK (
    contractor_lead_id IS NOT NULL
    OR contractor_prospect_id IS NOT NULL
    OR outbound_company_id IS NOT NULL
  ) NOT VALID;

-- Helper: does any valid, non-expired evidence exist for a given destination
-- resolved through any of the three anchors?
CREATE OR REPLACE FUNCTION public.has_casl_evidence_for_destination(
  p_destination_type text,
  p_destination_normalized text,
  p_lead_id uuid DEFAULT NULL,
  p_prospect_id uuid DEFAULT NULL,
  p_outbound_id uuid DEFAULT NULL
) RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.casl_consent_evidence e
     WHERE e.is_valid = true
       AND (e.expires_at IS NULL OR e.expires_at > now())
       AND e.refusal_statement_found = false
       AND e.destination_type       = p_destination_type
       AND e.destination_normalized = p_destination_normalized
       AND (
             (p_lead_id     IS NOT NULL AND e.contractor_lead_id     = p_lead_id)
          OR (p_prospect_id IS NOT NULL AND e.contractor_prospect_id = p_prospect_id)
          OR (p_outbound_id IS NOT NULL AND e.outbound_company_id    = p_outbound_id)
       )
  );
$$;

GRANT EXECUTE ON FUNCTION public.has_casl_evidence_for_destination(text,text,uuid,uuid,uuid) TO service_role;
