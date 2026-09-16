CREATE OR REPLACE FUNCTION public.local_service_offer_status(p_city text, p_category_slug text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_cat record;
  v_claimed int;
  v_city_cap constant int := 10;
  v_city_claimed int;
  v_city_remaining int;
  v_cat_remaining int;
  v_remaining int;
BEGIN
  IF p_city IS NULL OR btrim(p_city) = '' OR p_category_slug IS NULL OR btrim(p_category_slug) = '' THEN
    RETURN jsonb_build_object('verified', false, 'eligible', false, 'reason', 'missing_city_or_category');
  END IF;

  SELECT * INTO v_cat FROM public.founder_eligible_categories
  WHERE slug = p_category_slug AND is_active = true AND group_type = 'local_service';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('verified', false, 'eligible', false, 'reason', 'category_not_eligible');
  END IF;

  SELECT count(*) INTO v_claimed FROM public.founder_memberships
  WHERE lower(city) = lower(btrim(p_city))
    AND category_slug = p_category_slug
    AND status IN ('founder_activated','first_referral','renewal_due','renewed');

  -- Plafond public : 10 entreprises par ville, tous services résidentiels confondus.
  SELECT count(*) INTO v_city_claimed
  FROM public.founder_memberships m
  JOIN public.founder_eligible_categories c ON c.slug = m.category_slug
  WHERE lower(m.city) = lower(btrim(p_city))
    AND c.group_type = 'local_service'
    AND m.status IN ('founder_activated','first_referral','renewal_due','renewed');

  v_cat_remaining := greatest(v_cat.internal_cap_per_city - v_claimed, 0);
  v_city_remaining := greatest(v_city_cap - v_city_claimed, 0);
  v_remaining := least(v_cat_remaining, v_city_remaining);

  RETURN jsonb_build_object(
    'verified', true,
    'city', initcap(btrim(p_city)),
    'category_slug', v_cat.slug,
    'category_name', v_cat.name_fr,
    'cap', v_cat.internal_cap_per_city,
    'claimed', v_claimed,
    'city_cap', v_city_cap,
    'city_claimed', v_city_claimed,
    'city_remaining', v_city_remaining,
    'remaining', v_remaining,
    'eligible', v_remaining > 0,
    'reason', CASE
      WHEN v_city_remaining <= 0 THEN 'city_full'
      WHEN v_cat_remaining <= 0 THEN 'city_category_full'
      ELSE NULL
    END
  );
END;
$function$;