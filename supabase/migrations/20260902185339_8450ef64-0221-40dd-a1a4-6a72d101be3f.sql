
CREATE OR REPLACE FUNCTION public.affiliate_offer_public_state(_offer_id uuid DEFAULT NULL::uuid, _promo_code text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_code text := nullif(upper(btrim(coalesce(_promo_code, ''))), '');
  v_promo_id uuid;
  v_promo_code text;
  v_disc_type text;
  v_disc_value numeric;
  v_duration text;
  v_offer_found boolean := false;
  v_status text;
  v_offered int;
  v_granted int;
  v_consumed int;
  v_offered_at timestamptz;
  v_accepted_at timestamptz;
  v_granted_at timestamptz;
  v_expires_at timestamptz;
  v_city text;
  v_offer_promo_id uuid;
BEGIN
  IF v_code IS NOT NULL THEN
    SELECT p.id, p.code, p.discount_type, p.discount_value, p.duration_type
      INTO v_promo_id, v_promo_code, v_disc_type, v_disc_value, v_duration
    FROM public.promo_codes p
    WHERE p.code = v_code AND p.active = true AND p.affiliate_id IS NOT NULL;
  END IF;

  IF _offer_id IS NOT NULL THEN
    SELECT true, o.status, o.free_appointments, o.granted_appointments, o.consumed_appointments,
           o.offered_at, o.accepted_at, o.granted_at, o.expires_at, o.city, o.promo_code_id
      INTO v_offer_found, v_status, v_offered, v_granted, v_consumed,
           v_offered_at, v_accepted_at, v_granted_at, v_expires_at, v_city, v_offer_promo_id
    FROM public.affiliate_free_appointment_offers o
    WHERE o.id = _offer_id;
  END IF;

  -- Aucun code fourni dans le lien : on résout le promo rattaché à l'offre elle-même.
  IF v_promo_id IS NULL AND coalesce(v_offer_found, false) AND v_offer_promo_id IS NOT NULL THEN
    SELECT p.id, p.code, p.discount_type, p.discount_value, p.duration_type
      INTO v_promo_id, v_promo_code, v_disc_type, v_disc_value, v_duration
    FROM public.promo_codes p
    WHERE p.id = v_offer_promo_id AND p.active = true AND p.affiliate_id IS NOT NULL;
  END IF;

  IF NOT coalesce(v_offer_found, false) THEN
    RETURN jsonb_build_object(
      'offer_exists', false,
      'promo_valid', v_promo_id IS NOT NULL,
      'promo_code', v_promo_code,
      'discount_percent', CASE WHEN v_disc_type = 'percentage' THEN v_disc_value END,
      'discount_duration', v_duration
    );
  END IF;

  RETURN jsonb_build_object(
    'offer_exists', true,
    'status', CASE WHEN v_expires_at <= now() AND v_status IN ('offered','accepted')
                   THEN 'expired' ELSE v_status END,
    'offered_appointments', v_offered,
    'granted_appointments', v_granted,
    'consumed_appointments', v_consumed,
    'remaining_appointments', greatest(0, v_granted - v_consumed),
    'offered_at', v_offered_at,
    'accepted_at', v_accepted_at,
    'granted_at', v_granted_at,
    'expires_at', v_expires_at,
    'city', v_city,
    'promo_valid', v_promo_id IS NOT NULL AND (v_offer_promo_id IS NULL OR v_promo_id = v_offer_promo_id),
    'promo_code', v_promo_code,
    'discount_percent', CASE WHEN v_disc_type = 'percentage' THEN v_disc_value END,
    'discount_duration', v_duration
  );
END;
$function$;
