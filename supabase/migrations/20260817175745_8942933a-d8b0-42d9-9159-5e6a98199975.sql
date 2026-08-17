-- Promote official Novoclimat ventilation records (priority recruitment category)
-- into the outreach pool, carrying real public-registry provenance so the CASL
-- gate can evaluate them on facts instead of blocking for missing provenance.
WITH src AS (
  SELECT DISTINCT ON (o.phone_e164)
    o.id,
    o.business_name,
    o.phone_e164,
    o.email,
    o.city,
    o.address,
    o.postal_code,
    o.source_url,
    o.certification
  FROM public.official_source_records o
  WHERE o.prospect_id IS NULL
    AND o.eligibility_status = 'eligible'
    AND o.phone_e164 IS NOT NULL
    AND o.phone_e164 ~ '^\+1[2-9][0-9]{2}[2-9][0-9]{6}$'
    AND o.source_key LIKE 'novoclimat%'
    AND NOT EXISTS (
      SELECT 1 FROM public.verified_contractor_prospects v
      WHERE v.phone_e164 = o.phone_e164
    )
  ORDER BY o.phone_e164, o.created_at
),
ins AS (
  INSERT INTO public.verified_contractor_prospects (
    business_name, category, city, street_address, postal_code,
    phone_primary, phone_e164, email,
    phone_source_url, address_source_url, source_urls,
    verification_status, data_quality_score, source, outreach_status
  )
  SELECT
    s.business_name,
    'ventilation',
    s.city,
    s.address,
    s.postal_code,
    s.phone_e164,
    s.phone_e164,
    s.email,
    s.source_url,
    s.source_url,
    jsonb_build_object('official_registry', s.source_url, 'certification', s.certification),
    'verified',
    85,
    'official_registry',
    'none'
  FROM src s
  RETURNING id, phone_e164
)
UPDATE public.official_source_records o
SET prospect_id = i.id, updated_at = now()
FROM ins i
WHERE o.phone_e164 = i.phone_e164 AND o.prospect_id IS NULL;