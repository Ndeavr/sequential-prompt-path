CREATE OR REPLACE FUNCTION public.check_founder_eligibility(p_city text, p_category_slug text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v jsonb;
  v_ok boolean;
BEGIN
  -- Verrou de portée : cette offre est réservée aux services résidentiels.
  -- Les lignes historiques 'professional' restent actives en base mais ne sont
  -- jamais admissibles ici, y compris via un appel RPC direct.
  IF p_category_slug IS NULL OR btrim(p_category_slug) = '' THEN
    RETURN jsonb_build_object('eligible', false, 'reason', 'missing_city_or_category',
                              'city_remaining', NULL, 'cap', NULL, 'claimed', NULL);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.founder_eligible_categories
    WHERE slug = p_category_slug
      AND is_active = true
      AND group_type = 'local_service'
  ) THEN
    RETURN jsonb_build_object('eligible', false, 'reason', 'category_not_eligible',
                              'city_remaining', NULL, 'cap', NULL, 'claimed', NULL);
  END IF;

  v := public.local_service_offer_status(p_city, p_category_slug);
  v_ok := coalesce((v->>'eligible')::boolean, false);

  RETURN jsonb_build_object(
    'eligible', v_ok,
    'reason', CASE WHEN v_ok THEN NULL ELSE coalesce(v->>'reason', 'not_eligible') END,
    'city_remaining', (v->>'remaining')::int,
    'cap', (v->>'cap')::int,
    'claimed', (v->>'claimed')::int
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.check_founder_eligibility(text, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.founder_public_signup(text, text, text, text, text, text, jsonb) TO anon, authenticated, service_role;