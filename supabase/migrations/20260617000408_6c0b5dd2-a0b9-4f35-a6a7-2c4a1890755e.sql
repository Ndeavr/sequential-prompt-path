
ALTER TABLE public.contractor_leads
  ADD COLUMN IF NOT EXISTS company_confidence_score smallint,
  ADD COLUMN IF NOT EXISTS phone_confidence_score smallint,
  ADD COLUMN IF NOT EXISTS overall_contact_confidence_score smallint,
  ADD COLUMN IF NOT EXISTS validation_status text NOT NULL DEFAULT 'pending_validation',
  ADD COLUMN IF NOT EXISTS company_failure_reason text,
  ADD COLUMN IF NOT EXISTS do_not_contact boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_contractor_leads_validation_status
  ON public.contractor_leads(validation_status);

CREATE INDEX IF NOT EXISTS idx_contractor_leads_phone_e164
  ON public.contractor_leads(phone_e164) WHERE phone_e164 IS NOT NULL;

-- Soft duplicate detection helper (not unique to preserve idempotent imports)
CREATE INDEX IF NOT EXISTS idx_contractor_leads_company_phone_dup
  ON public.contractor_leads(lower(company_name), phone_e164)
  WHERE company_name IS NOT NULL AND phone_e164 IS NOT NULL;

-- Backfill validation_status from prior phone-only pipeline
UPDATE public.contractor_leads
SET validation_status = CASE
  WHEN phone_validation_status IN ('valid_mobile','valid_voip') THEN 'pending_validation'
  WHEN phone_validation_status = 'landline' THEN 'invalid_phone'
  WHEN phone_validation_status = 'outside_quebec' THEN 'outside_quebec'
  WHEN phone_validation_status = 'invalid_phone' THEN 'invalid_phone'
  WHEN phone_validation_status = 'do_not_contact' THEN 'invalid_phone'
  WHEN phone_validation_status = 'lookup_failed' THEN 'needs_review'
  ELSE 'pending_validation'
END
WHERE validation_status = 'pending_validation';
