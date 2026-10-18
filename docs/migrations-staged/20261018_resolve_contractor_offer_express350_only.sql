-- STAGED — NOT APPLIED. Applying changes live behaviour immediately; requires
-- explicit founder go-live. Rollback: 20261018_resolve_contractor_offer_express350_only.rollback.sql
-- Effect: every NEW contractor (local services included) is offered express_350.
-- Historical free founders keep their founder_memberships rows untouched: this
-- function only decides the offer shown to new sign-ups; it never revokes.
-- Compatibility: 'free_founding' is no longer returned. contractor_invitation_queue
-- only uses it for ordering (falls through to express_350 = rank 1).
CREATE OR REPLACE FUNCTION public.resolve_contractor_offer(p_city text, p_category_slug text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_slug text := nullif(btrim(coalesce(p_category_slug, '')), '');
  v_group text;
  v_active boolean;
BEGIN
  IF v_slug IS NULL THEN
    RETURN jsonb_build_object('offer','unknown','category_group',NULL,'city_remaining',NULL,'reason','missing_category');
  END IF;

  SELECT group_type, is_active INTO v_group, v_active
  FROM public.founder_eligible_categories WHERE slug = v_slug;

  IF v_group = 'professional' THEN
    RETURN jsonb_build_object('offer','none','category_group','professional','city_remaining',NULL,'reason','no_active_offer_for_profession');
  END IF;

  IF v_group = 'local_service' AND coalesce(v_active, false) THEN
    RETURN jsonb_build_object('offer','express_350','category_group','local_service',
      'city_remaining',NULL,'reason','new_contractors_start_with_activation_350');
  END IF;

  IF EXISTS (SELECT 1 FROM public.project_trade_categories WHERE slug = v_slug AND is_active = true) THEN
    RETURN jsonb_build_object('offer','express_350','category_group','project_trade','city_remaining',NULL,'reason',NULL);
  END IF;

  RETURN jsonb_build_object('offer','unknown','category_group',NULL,'city_remaining',NULL,'reason','category_not_recognized');
END;
$function$;
