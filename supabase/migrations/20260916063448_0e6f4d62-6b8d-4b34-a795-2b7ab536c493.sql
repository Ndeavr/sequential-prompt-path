CREATE OR REPLACE FUNCTION public.resolve_contractor_offer(p_city text, p_category_slug text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_slug text := nullif(btrim(coalesce(p_category_slug, '')), '');
  v_city text := nullif(btrim(coalesce(p_city, '')), '');
  v_group text;
  v_active boolean;
  v_elig jsonb;
  v_city_cap constant int := 10;
  v_city_claimed int;
  v_city_remaining int;
BEGIN
  IF v_slug IS NULL THEN
    RETURN jsonb_build_object(
      'offer', 'unknown', 'category_group', NULL,
      'city_remaining', NULL, 'reason', 'missing_category');
  END IF;

  SELECT group_type, is_active INTO v_group, v_active
  FROM public.founder_eligible_categories
  WHERE slug = v_slug;

  IF v_group = 'professional' THEN
    RETURN jsonb_build_object(
      'offer', 'none', 'category_group', 'professional',
      'city_remaining', NULL, 'reason', 'no_active_offer_for_profession');
  END IF;

  IF v_group = 'local_service' AND coalesce(v_active, false) THEN
    IF v_city IS NULL THEN
      RETURN jsonb_build_object(
        'offer', 'unknown', 'category_group', 'local_service',
        'city_remaining', NULL, 'reason', 'missing_city');
    END IF;

    -- Places réelles restantes pour la VILLE (plafond public de 10),
    -- toutes catégories de services résidentiels confondues.
    SELECT count(*) INTO v_city_claimed
    FROM public.founder_memberships m
    JOIN public.founder_eligible_categories c ON c.slug = m.category_slug
    WHERE lower(m.city) = lower(v_city)
      AND c.group_type = 'local_service'
      AND m.status IN ('founder_activated','first_referral','renewal_due','renewed');

    v_city_remaining := greatest(v_city_cap - v_city_claimed, 0);
    v_elig := public.check_founder_eligibility(v_city, v_slug);

    IF v_city_remaining > 0 AND coalesce((v_elig->>'eligible')::boolean, false) THEN
      RETURN jsonb_build_object(
        'offer', 'free_founding', 'category_group', 'local_service',
        'city_remaining', v_city_remaining, 'reason', NULL);
    END IF;

    RETURN jsonb_build_object(
      'offer', 'express_350', 'category_group', 'local_service',
      'city_remaining', v_city_remaining,
      'reason', CASE
        WHEN v_city_remaining <= 0 THEN 'city_full'
        ELSE coalesce(v_elig->>'reason', 'not_eligible')
      END);
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.project_trade_categories
    WHERE slug = v_slug AND is_active = true
  ) THEN
    RETURN jsonb_build_object(
      'offer', 'express_350', 'category_group', 'project_trade',
      'city_remaining', NULL, 'reason', NULL);
  END IF;

  RETURN jsonb_build_object(
    'offer', 'unknown', 'category_group', NULL,
    'city_remaining', NULL, 'reason', 'category_not_recognized');
END;
$function$;

REVOKE ALL ON FUNCTION public.resolve_contractor_offer(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_contractor_offer(text, text) TO anon, authenticated, service_role;