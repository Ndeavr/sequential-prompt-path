
-- 1. business_card_extractions: remove anon read policy
DROP POLICY IF EXISTS "Anon can read extractions" ON public.business_card_extractions;

-- 2. acq_contractors: hide email/phone from anon while keeping public profile visible
-- Revoke full SELECT from anon, then re-grant only non-PII columns.
REVOKE SELECT ON public.acq_contractors FROM anon;
GRANT SELECT (
  id, company_name, slug, website, city, province,
  rbq_number, neq_number, logo_url, description,
  status, source, created_at, updated_at
) ON public.acq_contractors TO anon;

-- authenticated users (admins) keep full access via existing policy + grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.acq_contractors TO authenticated;
GRANT ALL ON public.acq_contractors TO service_role;
