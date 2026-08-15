ALTER TABLE public.dataforseo_enrichment_attempts
  ADD COLUMN IF NOT EXISTS candidate_reason text;

COMMENT ON COLUMN public.dataforseo_enrichment_attempts.candidate_reason IS
  'Why this official record was targeted: missing_contact | missing_website | missing_contact_and_website';