
ALTER TABLE public.contractor_leads
  ADD COLUMN IF NOT EXISTS phone_normalization_status text;

CREATE OR REPLACE FUNCTION public.apply_lead_normalization(payload jsonb)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n integer;
BEGIN
  WITH src AS (
    SELECT (r->>'id')::uuid AS id,
      NULLIF(r->>'email_normalized','') AS email_normalized,
      NULLIF(r->>'website_normalized','') AS website_normalized,
      NULLIF(r->>'company_name_normalized','') AS company_name_normalized,
      NULLIF(r->>'phone_original','') AS phone_original,
      NULLIF(r->>'phone_normalized','') AS phone_normalized,
      NULLIF(r->>'phone_e164','') AS phone_e164,
      r->>'phone_validation_status' AS phone_normalization_status,
      r->>'normalization_status' AS normalization_status,
      (r->'normalization_errors') AS normalization_errors,
      (r->>'normalized_at')::timestamptz AS normalized_at
    FROM jsonb_array_elements(payload) AS r
  )
  UPDATE public.contractor_leads l SET
    email_normalized = s.email_normalized,
    website_normalized = s.website_normalized,
    company_name_normalized = s.company_name_normalized,
    phone_original = s.phone_original,
    phone_normalized = s.phone_normalized,
    phone_e164 = s.phone_e164,
    phone_normalization_status = s.phone_normalization_status,
    normalization_status = s.normalization_status,
    normalization_errors = s.normalization_errors,
    normalized_at = s.normalized_at
  FROM src s WHERE l.id = s.id;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $$;
