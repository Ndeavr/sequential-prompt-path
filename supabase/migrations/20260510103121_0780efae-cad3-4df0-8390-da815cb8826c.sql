
ALTER TABLE public.email_domain_health
  ADD COLUMN IF NOT EXISTS dkim_selector text,
  ADD COLUMN IF NOT EXISTS dkim_selectors_tried jsonb,
  ADD COLUMN IF NOT EXISTS dkim_reason text,
  ADD COLUMN IF NOT EXISTS dkim_record text,
  ADD COLUMN IF NOT EXISTS dkim_last_success_at timestamptz,
  ADD COLUMN IF NOT EXISTS dkim_propagation_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS spf_record text,
  ADD COLUMN IF NOT EXISTS spf_reason text,
  ADD COLUMN IF NOT EXISTS dmarc_record text,
  ADD COLUMN IF NOT EXISTS dmarc_reason text,
  ADD COLUMN IF NOT EXISTS alignment_status jsonb,
  ADD COLUMN IF NOT EXISTS suggested_dkim_record text;
