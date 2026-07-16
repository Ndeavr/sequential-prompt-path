
-- 1. contractors_prospects: remove broad anon read, add safe RPC
DROP POLICY IF EXISTS "public_read_prospect_by_slug_safe" ON public.contractors_prospects;

CREATE OR REPLACE FUNCTION public.get_audit_landing_by_slug(_slug text)
RETURNS TABLE (
  id uuid,
  business_name text,
  city text,
  region text,
  category text,
  subcategory text,
  website text,
  domain text,
  landing_slug text,
  landing_url text,
  status text,
  priority_tier text,
  aipp_score integer,
  seo_score integer,
  reviews_score integer,
  content_score integer,
  ai_score integer,
  branding_score integer,
  trust_score integer,
  local_score integer,
  conversion_score integer,
  score_confidence integer,
  diagnostic_summary text,
  diagnostic jsonb,
  quick_wins jsonb,
  competitor_gap jsonb,
  estimated_monthly_loss_min integer,
  estimated_monthly_loss_max integer,
  screenshot_url text,
  screenshot_mobile_url text,
  is_running_ads boolean,
  paid_intent_confidence integer,
  loom_script text,
  loom_status text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id, p.business_name, p.city, p.region, p.category, p.subcategory,
    p.website, p.domain, p.landing_slug, p.landing_url, p.status, p.priority_tier,
    p.aipp_score, p.seo_score, p.reviews_score, p.content_score, p.ai_score,
    p.branding_score, p.trust_score, p.local_score, p.conversion_score, p.score_confidence,
    p.diagnostic_summary, p.diagnostic, p.quick_wins, p.competitor_gap,
    p.estimated_monthly_loss_min, p.estimated_monthly_loss_max,
    p.screenshot_url, p.screenshot_mobile_url, p.is_running_ads, p.paid_intent_confidence,
    p.loom_script, p.loom_status
  FROM public.contractors_prospects p
  WHERE p.landing_slug = _slug
    AND p.status = ANY (ARRAY['landing_ready','emailed','opened','clicked','replied','booked','won'])
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_audit_landing_by_slug(text) FROM public;
GRANT EXECUTE ON FUNCTION public.get_audit_landing_by_slug(text) TO anon, authenticated;

-- 2. verified_prospect_tokens: revoke broken anon read + anon update
DROP POLICY IF EXISTS "public can read tokens" ON public.verified_prospect_tokens;
DROP POLICY IF EXISTS "service updates tokens" ON public.verified_prospect_tokens;

-- Tokens are inserted only by edge functions (service_role bypasses RLS).
-- No client access needed; admin policy already in place.

-- 3. contractor_recruitment_offers: remove null-check policy, add token-validated RPC
DROP POLICY IF EXISTS "Public read offers by magic token" ON public.contractor_recruitment_offers;

CREATE OR REPLACE FUNCTION public.get_recruitment_offer_by_token(_token text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  IF _token IS NULL OR length(_token) < 8 THEN
    RETURN NULL;
  END IF;

  SELECT jsonb_build_object(
    'id', o.id,
    'prospect_id', o.prospect_id,
    'cluster_id', o.cluster_id,
    'category_slug', o.category_slug,
    'offer_type', o.offer_type,
    'plan_code', o.plan_code,
    'pricing_mode', o.pricing_mode,
    'price_amount', o.price_amount,
    'setup_fee_amount', o.setup_fee_amount,
    'recurring_amount', o.recurring_amount,
    'founder_discount_percent', o.founder_discount_percent,
    'scarcity_message', o.scarcity_message,
    'expires_at', o.expires_at,
    'status', o.status,
    'magic_token', o.magic_token,
    'contractor_prospects', jsonb_build_object(
      'business_name', cp.business_name,
      'city', cp.city,
      'category_slug', cp.category_slug,
      'owner_name', cp.owner_name,
      'review_count', cp.review_count,
      'review_rating', cp.review_rating
    ),
    'recruitment_clusters', jsonb_build_object(
      'name', rc.name,
      'region_name', rc.region_name
    )
  )
  INTO result
  FROM public.contractor_recruitment_offers o
  LEFT JOIN public.contractor_prospects cp ON cp.id = o.prospect_id
  LEFT JOIN public.recruitment_clusters rc ON rc.id = o.cluster_id
  WHERE o.magic_token = _token
    AND (o.expires_at IS NULL OR o.expires_at > now())
  LIMIT 1;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_recruitment_offer_by_token(text) FROM public;
GRANT EXECUTE ON FUNCTION public.get_recruitment_offer_by_token(text) TO anon, authenticated;

-- 4. contractor_recruitment_checkout_sessions: remove blanket anon read
DROP POLICY IF EXISTS "Public read checkout by offer" ON public.contractor_recruitment_checkout_sessions;

-- Admin policy remains; service_role bypasses RLS.
