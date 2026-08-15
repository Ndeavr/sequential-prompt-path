DROP VIEW IF EXISTS public.v_affiliate_team;

CREATE OR REPLACE FUNCTION public.get_my_affiliate_team()
RETURNS TABLE (
  affiliate_id uuid,
  affiliate_name text,
  status text,
  joined_at timestamptz,
  recruited_at timestamptz,
  eligible_revenue_cents bigint,
  override_commission_cents bigint,
  last_sale_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me uuid;
BEGIN
  SELECT a.id INTO v_me FROM public.affiliates a WHERE a.user_id = auth.uid() LIMIT 1;
  IF v_me IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    child.id,
    COALESCE(NULLIF(trim(coalesce(child.first_name,'') || ' ' || coalesce(child.last_name,'')), ''), child.name, 'Affilié')::text,
    child.status::text,
    child.created_at,
    child.parent_assigned_at,
    COALESCE(sales.rev, 0)::bigint,
    COALESCE(ovr.comm, 0)::bigint,
    sales.last_at
  FROM public.affiliates child
  LEFT JOIN LATERAL (
    SELECT sum(c.value_cents)::bigint AS rev, max(c.created_at) AS last_at
    FROM public.affiliate_conversions c
    WHERE c.affiliate_id = child.id
      AND c.commission_kind = 'direct'
      AND COALESCE(c.status,'pending') <> 'reversed'
  ) sales ON true
  LEFT JOIN LATERAL (
    SELECT sum(o.commission_amount_cents)::bigint AS comm
    FROM public.affiliate_conversions o
    WHERE o.parent_of_affiliate_id = child.id
      AND o.affiliate_id = v_me
      AND o.commission_kind = 'subaffiliate_override'
      AND COALESCE(o.status,'pending') <> 'reversed'
  ) ovr ON true
  WHERE child.parent_affiliate_id = v_me
  ORDER BY child.parent_assigned_at DESC NULLS LAST;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_affiliate_team() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_my_affiliate_earnings()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me uuid;
  v_direct bigint := 0;
  v_override bigint := 0;
  v_team_revenue bigint := 0;
  v_recruits int := 0;
  v_active int := 0;
  v_pct numeric;
BEGIN
  SELECT a.id INTO v_me FROM public.affiliates a WHERE a.user_id = auth.uid() LIMIT 1;
  IF v_me IS NULL THEN
    RETURN jsonb_build_object('is_affiliate', false);
  END IF;

  SELECT COALESCE(sum(commission_amount_cents),0) INTO v_direct
  FROM public.affiliate_conversions
  WHERE affiliate_id = v_me AND commission_kind = 'direct' AND COALESCE(status,'pending') <> 'reversed';

  SELECT COALESCE(sum(commission_amount_cents),0) INTO v_override
  FROM public.affiliate_conversions
  WHERE affiliate_id = v_me AND commission_kind = 'subaffiliate_override' AND COALESCE(status,'pending') <> 'reversed';

  SELECT COALESCE(sum(c.value_cents),0) INTO v_team_revenue
  FROM public.affiliate_conversions c
  JOIN public.affiliates a ON a.id = c.affiliate_id
  WHERE a.parent_affiliate_id = v_me AND c.commission_kind = 'direct' AND COALESCE(c.status,'pending') <> 'reversed';

  SELECT count(*) INTO v_recruits FROM public.affiliates WHERE parent_affiliate_id = v_me;
  SELECT count(*) INTO v_active FROM public.affiliates WHERE parent_affiliate_id = v_me AND status = 'active';

  SELECT COALESCE(subaffiliate_override_pct, 5) INTO v_pct FROM public.affiliate_settings LIMIT 1;

  RETURN jsonb_build_object(
    'is_affiliate', true,
    'affiliate_id', v_me,
    'direct_commission_cents', v_direct,
    'override_commission_cents', v_override,
    'total_commission_cents', v_direct + v_override,
    'team_revenue_cents', v_team_revenue,
    'recruits_count', v_recruits,
    'active_recruits_count', v_active,
    'override_pct', COALESCE(v_pct, 5)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_affiliate_earnings() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_affiliate_attribution_chain(p_affiliate_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'admin only';
  END IF;

  SELECT jsonb_build_object(
    'affiliate', to_jsonb(a) - 'metadata',
    'parent', (SELECT jsonb_build_object('id', p.id, 'name', p.name, 'referral_code', p.referral_code)
                 FROM public.affiliates p WHERE p.id = a.parent_affiliate_id),
    'attribution', (SELECT to_jsonb(t) FROM public.affiliate_attributions t WHERE t.id = a.parent_attribution_id),
    'recruits', (SELECT COALESCE(jsonb_agg(jsonb_build_object('id', r.id, 'name', r.name, 'status', r.status, 'recruited_at', r.parent_assigned_at)), '[]'::jsonb)
                   FROM public.affiliates r WHERE r.parent_affiliate_id = a.id),
    'commissions', (SELECT COALESCE(jsonb_agg(to_jsonb(c) ORDER BY c.created_at DESC), '[]'::jsonb)
                      FROM public.affiliate_conversions c
                     WHERE c.affiliate_id = a.id OR c.parent_of_affiliate_id = a.id),
    'activities', (SELECT COALESCE(jsonb_agg(to_jsonb(ac) ORDER BY ac.created_at DESC), '[]'::jsonb)
                     FROM public.affiliate_activities ac WHERE ac.affiliate_id = a.id
                       AND ac.activity_type LIKE ANY (ARRAY['parent_%','subaffiliate_%']))
  ) INTO v
  FROM public.affiliates a
  WHERE a.id = p_affiliate_id;

  RETURN COALESCE(v, jsonb_build_object('error', 'not_found'));
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_affiliate_attribution_chain(uuid) TO authenticated;