CREATE OR REPLACE FUNCTION public.contractor_invitation_queue(
  p_city text DEFAULT 'Laval',
  p_limit int DEFAULT 100
)
RETURNS TABLE (
  lead_id uuid,
  company_name text,
  first_name text,
  city text,
  trade_label text,
  category_slug text,
  phone_e164 text,
  email text,
  offer text,
  category_group text,
  city_remaining int,
  offer_reason text,
  contactable boolean,
  block_reason text,
  attribution_type text,
  attributed_user_id uuid,
  lifecycle_status text,
  last_event_at timestamptz,
  onboarding_token text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_is_admin boolean := public.has_role(auth.uid(), 'admin');
  v_is_affiliate boolean := public.has_role(auth.uid(), 'affiliate');
  v_limit int := least(greatest(coalesce(p_limit, 100), 1), 500);
BEGIN
  IF NOT (v_is_admin OR v_is_affiliate) THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH base AS (
    SELECT
      l.id,
      l.company_name,
      l.first_name,
      l.city,
      coalesce(nullif(btrim(l.trade), ''), nullif(btrim(l.category_primary), '')) AS trade_label,
      l.phone_e164,
      l.email,
      l.do_not_contact,
      l.unsubscribed_at,
      l.sms_suppressed_at,
      l.sms_disabled,
      l.phone_validation_status,
      l.compliance_review_required,
      l.attribution_type,
      l.attributed_user_id,
      l.outreach_status,
      l.last_sms_at,
      l.last_email_at,
      l.opened_at,
      l.clicked_at,
      l.onboarding_started_at,
      l.paid_at,
      l.profile_active_at,
      l.activation_status,
      l.contractor_id,
      l.onboarding_token,
      l.updated_at
    FROM public.contractor_leads l
    WHERE (p_city IS NULL OR lower(btrim(l.city)) = lower(btrim(p_city)))
      AND (v_is_admin OR l.attributed_user_id = auth.uid())
  ),
  scored AS (
    SELECT
      b.*,
      public.normalize_offer_category_slug(b.trade_label) AS slug
    FROM base b
  )
  SELECT
    s.id,
    s.company_name,
    s.first_name,
    s.city,
    s.trade_label,
    s.slug,
    s.phone_e164,
    s.email,
    (d->>'offer')::text,
    (d->>'category_group')::text,
    nullif(d->>'city_remaining', '')::int,
    (d->>'reason')::text,
    (
      coalesce(s.do_not_contact, false) = false
      AND s.unsubscribed_at IS NULL
      AND s.sms_suppressed_at IS NULL
      AND coalesce(s.compliance_review_required, false) = false
    ),
    CASE
      WHEN coalesce(s.do_not_contact, false) THEN 'do_not_contact'
      WHEN s.unsubscribed_at IS NOT NULL THEN 'unsubscribed'
      WHEN s.sms_suppressed_at IS NOT NULL THEN 'sms_suppressed'
      WHEN coalesce(s.compliance_review_required, false) THEN 'compliance_review_required'
      ELSE NULL
    END,
    s.attribution_type,
    s.attributed_user_id,
    CASE
      WHEN s.profile_active_at IS NOT NULL THEN 'eligible'
      WHEN s.activation_status = 'activated' OR s.paid_at IS NOT NULL THEN 'activated'
      WHEN s.onboarding_started_at IS NOT NULL THEN 'onboarding_started'
      WHEN s.contractor_id IS NOT NULL THEN 'registered'
      WHEN s.clicked_at IS NOT NULL THEN 'clicked'
      WHEN s.last_sms_at IS NOT NULL OR s.last_email_at IS NOT NULL THEN 'invited'
      ELSE 'validated'
    END,
    greatest(
      coalesce(s.profile_active_at, '-infinity'::timestamptz),
      coalesce(s.paid_at, '-infinity'::timestamptz),
      coalesce(s.onboarding_started_at, '-infinity'::timestamptz),
      coalesce(s.clicked_at, '-infinity'::timestamptz),
      coalesce(s.opened_at, '-infinity'::timestamptz),
      coalesce(s.last_email_at, '-infinity'::timestamptz),
      coalesce(s.last_sms_at, '-infinity'::timestamptz),
      coalesce(s.updated_at, '-infinity'::timestamptz)
    ),
    s.onboarding_token
  FROM scored s
  CROSS JOIN LATERAL (
    SELECT public.resolve_contractor_offer(s.city, s.slug) AS d
  ) r
  ORDER BY
    CASE WHEN (r.d->>'offer') = 'free_founding' THEN 0
         WHEN (r.d->>'offer') = 'express_350' THEN 1
         ELSE 2 END,
    s.updated_at DESC NULLS LAST
  LIMIT v_limit;
END;
$function$;

REVOKE ALL ON FUNCTION public.contractor_invitation_queue(text, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.contractor_invitation_queue(text, int) TO authenticated, service_role;