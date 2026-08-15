CREATE UNIQUE INDEX IF NOT EXISTS dataforseo_attempts_record_provider_uidx
  ON public.dataforseo_enrichment_attempts (official_source_record_id, provider);

ALTER TABLE public.dataforseo_enrichment_attempts
  DROP CONSTRAINT IF EXISTS dataforseo_attempts_record_provider_key;
ALTER TABLE public.dataforseo_enrichment_attempts
  ADD CONSTRAINT dataforseo_attempts_record_provider_key
  UNIQUE USING INDEX dataforseo_attempts_record_provider_uidx;