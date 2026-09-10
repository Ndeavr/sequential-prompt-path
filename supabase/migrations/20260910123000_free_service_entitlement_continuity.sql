-- P0: keep authenticated local-service founders inside their real $0 flow.
-- Returns only the current user's own entitlement and non-sensitive profile state.
CREATE OR REPLACE FUNCTION public.get_my_free_service_entitlement()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_row record;
  v_active boolean := false;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('authenticated', false, 'active', false);
  END IF;

  SELECT
    fm.id AS membership_id,
    fm.contractor_id,
    fm.business_name,
    fm.city,
    fm.category_slug,
    fm.status,
    fm.founder_start,
    fm.founder_end,
    fm.offer_code,
    c.onboarding_status,
    c.google_calendar_connected,
    c.booking_enabled
  INTO v_row
  FROM public.founder_memberships fm
  LEFT JOIN public.contractors c ON c.id = fm.contractor_id
  WHERE fm.user_id = v_user_id
     OR c.user_id = v_user_id
  ORDER BY
    CASE WHEN fm.status IN ('founder_activated', 'first_referral', 'renewal_due', 'renewed') THEN 0 ELSE 1 END,
    fm.updated_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('authenticated', true, 'active', false);
  END IF;

  v_active :=
    v_row.offer_code = 'free_year_local_service'
    AND v_row.status IN ('founder_activated', 'first_referral', 'renewal_due', 'renewed')
    AND (v_row.founder_end IS NULL OR v_row.founder_end > now());

  RETURN jsonb_build_object(
    'authenticated', true,
    'active', v_active,
    'membership_id', v_row.membership_id,
    'contractor_id', v_row.contractor_id,
    'business_name', v_row.business_name,
    'city', v_row.city,
    'category_slug', v_row.category_slug,
    'status', v_row.status,
    'founder_start', v_row.founder_start,
    'founder_end', v_row.founder_end,
    'offer_code', v_row.offer_code,
    'profile_complete', coalesce(v_row.onboarding_status IN ('profile_completed', 'completed'), false),
    'calendar_connected', coalesce(v_row.google_calendar_connected, false),
    'booking_enabled', coalesce(v_row.booking_enabled, false)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_my_free_service_entitlement() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_my_free_service_entitlement() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_my_free_service_entitlement() TO authenticated;

COMMENT ON FUNCTION public.get_my_free_service_entitlement() IS
  'Returns the authenticated user''s server-verified local-service founder entitlement without exposing contact data.';
