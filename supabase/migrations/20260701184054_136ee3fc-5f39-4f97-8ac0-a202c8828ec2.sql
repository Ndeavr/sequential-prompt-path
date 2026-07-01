ALTER TABLE public.contractor_leads
  ADD COLUMN IF NOT EXISTS email_normalized text,
  ADD COLUMN IF NOT EXISTS website_normalized text,
  ADD COLUMN IF NOT EXISTS company_name_normalized text,
  ADD COLUMN IF NOT EXISTS phone_original text,
  ADD COLUMN IF NOT EXISTS phone_normalized text,
  ADD COLUMN IF NOT EXISTS phone_e164 text,
  ADD COLUMN IF NOT EXISTS phone_validation_status text,
  ADD COLUMN IF NOT EXISTS normalization_status text,
  ADD COLUMN IF NOT EXISTS normalization_errors jsonb,
  ADD COLUMN IF NOT EXISTS normalized_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_leads_email_norm  ON public.contractor_leads (email_normalized);
CREATE INDEX IF NOT EXISTS idx_leads_phone_e164  ON public.contractor_leads (phone_e164);
CREATE INDEX IF NOT EXISTS idx_leads_company_key ON public.contractor_leads (company_name_normalized);
CREATE INDEX IF NOT EXISTS idx_leads_norm_status ON public.contractor_leads (normalization_status);