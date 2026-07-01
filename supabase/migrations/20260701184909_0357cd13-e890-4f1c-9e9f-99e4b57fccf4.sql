
CREATE OR REPLACE FUNCTION public.trg_normalize_contractor_lead()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  digits text;
  core text;
BEGIN
  -- EMAIL
  IF NEW.email IS NOT NULL THEN
    NEW.email_normalized := NULLIF(lower(regexp_replace(NEW.email, '[\u200B-\u200D\uFEFF\u00A0\s]', '', 'g')), '');
    IF NEW.email_normalized IS NOT NULL
       AND NEW.email_normalized !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
      NEW.email_normalized := NULL;
    END IF;
  END IF;

  -- WEBSITE
  IF NEW.website_url IS NOT NULL AND btrim(NEW.website_url) <> '' THEN
    NEW.website_normalized := btrim(NEW.website_url);
    IF NEW.website_normalized !~* '^https?://' THEN
      NEW.website_normalized := 'https://' || NEW.website_normalized;
    END IF;
    -- lowercase host (rough: lowercase everything before first slash after scheme)
    NEW.website_normalized := regexp_replace(NEW.website_normalized,
      '^(https?://)([^/]+)(.*)$',
      E'\\1' || lower(regexp_replace(NEW.website_normalized, '^https?://([^/]+).*', E'\\1')) || E'\\3');
    -- trim trailing slash unless it's just scheme://host/
    IF NEW.website_normalized ~ '.+/$' AND NEW.website_normalized !~ '^https?://[^/]+/$' THEN
      NEW.website_normalized := regexp_replace(NEW.website_normalized, '/+$', '');
    ELSIF NEW.website_normalized ~ '^https?://[^/]+/$' THEN
      NEW.website_normalized := regexp_replace(NEW.website_normalized, '/$', '');
    END IF;
  END IF;

  -- COMPANY KEY
  IF NEW.company_name IS NOT NULL THEN
    NEW.company_name_normalized := btrim(regexp_replace(
      lower(unaccent(NEW.company_name)),
      '[^a-z0-9]+', ' ', 'g'));
    NEW.company_name_normalized := NULLIF(NEW.company_name_normalized, '');
  END IF;

  -- PHONE → E.164 (NANP)
  digits := regexp_replace(COALESCE(NULLIF(NEW.mobile_phone,''), NEW.phone, ''), '[^0-9]', '', 'g');
  IF digits <> '' THEN
    NEW.phone_original := COALESCE(NULLIF(NEW.mobile_phone,''), NEW.phone);
    NEW.phone_normalized := digits;
    core := digits;
    IF length(core) = 11 AND left(core,1) = '1' THEN core := substr(core,2); END IF;
    IF length(core) = 10 AND left(core,1) NOT IN ('0','1') THEN
      NEW.phone_e164 := '+1' || core;
      -- flag obvious test / 555 numbers
      IF core ~ '^\d{3}555\d{4}$' OR core ~ '^(\d)\1{9}$' THEN
        NEW.phone_e164 := NULL;
        NEW.phone_normalization_status := 'test';
      ELSE
        NEW.phone_normalization_status := 'valid';
      END IF;
    ELSE
      NEW.phone_normalization_status := 'invalid';
    END IF;
  ELSE
    NEW.phone_normalization_status := 'empty';
  END IF;

  NEW.normalized_at := now();

  -- Compute overall status
  IF NEW.email_normalized IS NULL AND NEW.phone_e164 IS NULL THEN
    NEW.normalization_status := 'rejected';
  ELSIF NEW.email_normalized IS NOT NULL AND NEW.phone_e164 IS NOT NULL
        AND NEW.website_normalized IS NOT NULL THEN
    NEW.normalization_status := 'ok';
  ELSE
    NEW.normalization_status := 'partial';
  END IF;

  RETURN NEW;
END $$;

-- Requires unaccent extension for company key. It's available on Supabase.
CREATE EXTENSION IF NOT EXISTS unaccent;

DROP TRIGGER IF EXISTS trg_normalize_contractor_lead_biu ON public.contractor_leads;
CREATE TRIGGER trg_normalize_contractor_lead_biu
BEFORE INSERT OR UPDATE OF email, phone, mobile_phone, website_url, company_name
ON public.contractor_leads
FOR EACH ROW EXECUTE FUNCTION public.trg_normalize_contractor_lead();
