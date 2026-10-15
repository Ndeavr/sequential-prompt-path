-- Read historical events directly: no backfill, counter mutation or double writes.
-- Only the owner or an admin can request aggregates; raw visitor rows stay private.
CREATE OR REPLACE FUNCTION public.get_affiliate_visit_stats(p_affiliate_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_code text;
  v_owner uuid;
  v_result jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;
  SELECT referral_code, user_id INTO v_code, v_owner
  FROM public.affiliates WHERE id = p_affiliate_id;
  IF NOT FOUND OR NOT (coalesce(v_owner = auth.uid(), false) OR public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'Affiliate access denied' USING ERRCODE = '42501';
  END IF;

  WITH visits AS (
    SELECT e.session_id, e.created_at,
      (coalesce(e.is_test, false) OR e.internal_reason IS NOT NULL
       OR (v_owner IS NOT NULL AND e.user_id = v_owner)
       OR EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = e.user_id AND r.role = 'admin')
      ) IS TRUE AS excluded
    FROM public.contractor_funnel_events e
    WHERE e.affiliate_code = v_code
      -- Audit emits both landing_view and ai_audit_viewed: count only the canonical view.
      AND e.event_type = 'landing_view'
  )
  SELECT jsonb_build_object(
    'views', count(*) FILTER (WHERE NOT excluded),
    'sessions', count(DISTINCT nullif(btrim(session_id), '')) FILTER (WHERE NOT excluded),
    'excludedViews', count(*) FILTER (WHERE excluded),
    'missingSessionViews', count(*) FILTER (WHERE NOT excluded AND nullif(btrim(session_id), '') IS NULL),
    'firstVisit', min(created_at) FILTER (WHERE NOT excluded)
  ) INTO v_result FROM visits;
  RETURN v_result;
END;
$$;
REVOKE ALL ON FUNCTION public.get_affiliate_visit_stats(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_affiliate_visit_stats(uuid) TO authenticated;
