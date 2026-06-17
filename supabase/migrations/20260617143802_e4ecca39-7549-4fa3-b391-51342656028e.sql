
ALTER TABLE public.contractor_leads
  ADD COLUMN IF NOT EXISTS contact_method text NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS sms_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sms_failed_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sms_disabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sms_status text,
  ADD COLUMN IF NOT EXISTS email_status text,
  ADD COLUMN IF NOT EXISTS email_fallback_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS last_sms_error_code text,
  ADD COLUMN IF NOT EXISTS last_sms_attempt_at timestamptz,
  ADD COLUMN IF NOT EXISTS sms_suppressed_at timestamptz,
  ADD COLUMN IF NOT EXISTS sms_suppressed_reason text;

CREATE INDEX IF NOT EXISTS idx_contractor_leads_contact_method ON public.contractor_leads(contact_method);
CREATE INDEX IF NOT EXISTS idx_contractor_leads_sms_disabled ON public.contractor_leads(sms_disabled) WHERE sms_disabled = true;

-- Backfill contact_method from existing phone_type / email
UPDATE public.contractor_leads
SET contact_method = CASE
  WHEN do_not_contact = true THEN 'skip'
  WHEN phone_validation_status IN ('invalid_phone','outside_quebec') AND COALESCE(email,'') = '' THEN 'skip'
  WHEN phone_type = 'mobile' THEN 'mobile_sms'
  WHEN COALESCE(email,'') <> '' THEN 'email'
  WHEN phone_type IN ('landline','voip','unknown') THEN 'manual'
  ELSE 'unknown'
END
WHERE contact_method = 'unknown';
