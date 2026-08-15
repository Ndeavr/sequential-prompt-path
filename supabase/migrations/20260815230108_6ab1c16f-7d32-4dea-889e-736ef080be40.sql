CREATE OR REPLACE FUNCTION public.official_records_block_unconfirmed_promotion()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.enrichment_status IN ('pending_website_confirmation', 'aggregator_only') THEN
    IF NEW.contact_status IN ('source_confirmed', 'contactable', 'official_verified') THEN
      NEW.contact_status := 'needs_enrichment';
    END IF;
    NEW.eligibility_status := 'blocked';
    NEW.blocked_reason := COALESCE(NULLIF(NEW.blocked_reason, ''), 'pending_website_confirmation');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_official_records_block_unconfirmed_promotion ON public.official_source_records;
CREATE TRIGGER trg_official_records_block_unconfirmed_promotion
BEFORE INSERT OR UPDATE ON public.official_source_records
FOR EACH ROW EXECUTE FUNCTION public.official_records_block_unconfirmed_promotion();