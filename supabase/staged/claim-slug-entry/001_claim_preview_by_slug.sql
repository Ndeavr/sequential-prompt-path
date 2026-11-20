-- STAGED — NOT APPLIED. Requires explicit owner approval before running.
-- Purpose: let /entrepreneur/:slug/reclamer show a prefilled, public-safe
-- preview of an UNCLAIMED prospect by its unique public_slug, without
-- exposing contacts. The slug is never ownership proof: claiming still goes
-- through the exact opaque token flow (/unpro/activate/:token) or admin review.
-- After applying, set PROSPECT_SLUG_PREVIEW_ENABLED = true in
-- src/lib/contractor/claimEntry.ts and add the client call.

CREATE OR REPLACE FUNCTION public.claim_preview_by_slug(_slug text)
RETURNS TABLE(business_name text, category text, city text, claim_state text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT p.business_name,
         coalesce(p.trade::text, p.trade_category::text, p.category_slug::text) AS category,
         p.city,
         CASE WHEN EXISTS (SELECT 1 FROM public.contractor_prospect_claims c WHERE c.prospect_id = p.id)
              THEN 'claimed' ELSE 'open' END
  FROM public.contractor_prospects p
  WHERE _slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
    AND length(_slug) <= 120
    AND p.public_slug = _slug            -- public_slug is UNIQUE
    AND coalesce(p.business_name, '') <> ''
$$;
REVOKE ALL ON FUNCTION public.claim_preview_by_slug(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_preview_by_slug(text) TO anon, authenticated;

-- Rollback:
-- DROP FUNCTION IF EXISTS public.claim_preview_by_slug(text);
