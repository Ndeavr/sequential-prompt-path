
-- 1. Colonnes d'état réel
ALTER TABLE public.affiliate_free_appointment_offers
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS trade text,
  ADD COLUMN IF NOT EXISTS granted_appointments integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS consumed_appointments integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS granted_at timestamptz;

ALTER TABLE public.affiliate_free_appointment_offers
  DROP CONSTRAINT IF EXISTS affiliate_free_appointment_offers_status_check;
ALTER TABLE public.affiliate_free_appointment_offers
  ADD CONSTRAINT affiliate_free_appointment_offers_status_check
  CHECK (status IN ('offered','accepted','granted','consumed','expired','revoked'));

-- Backfill ville/métier depuis le lead
UPDATE public.affiliate_free_appointment_offers o
   SET city = coalesce(o.city, l.city),
       trade = coalesce(o.trade, l.category_primary)
  FROM public.contractor_leads l
 WHERE l.id = o.lead_id AND o.city IS NULL;

CREATE INDEX IF NOT EXISTS idx_afao_city_status
  ON public.affiliate_free_appointment_offers (lower(city), status);

-- 2. Offre : preuve de contact + plafond atomique 10 par ville
CREATE OR REPLACE FUNCTION public.affiliate_offer_free_appointments(
  _lead_id uuid,
  _company_name text DEFAULT NULL::text,
  _notes text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_affiliate_id uuid;
  v_promo record;
  v_offer_id uuid;
  v_lead record;
  v_city text;
  v_city_key text;
  v_used int;
  v_existing uuid;
  v_cap constant int := 10;
BEGIN
  SELECT a.id INTO v_affiliate_id
  FROM public.affiliates a
  WHERE a.user_id = auth.uid() AND coalesce(a.status, 'active') = 'active'
  LIMIT 1;

  IF v_affiliate_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_an_active_affiliate');
  END IF;

  SELECT l.id, l.city, l.category_primary, l.company_name, l.last_contacted_by
    INTO v_lead
  FROM public.contractor_leads l
  WHERE l.id = _lead_id;

  IF v_lead.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'lead_not_found');
  END IF;

  -- Preuve : l'affilié doit avoir réellement sollicité ce prospect.
  IF v_lead.last_contacted_by IS DISTINCT FROM v_affiliate_id
     AND NOT EXISTS (
       SELECT 1 FROM public.affiliate_lead_events e
        WHERE e.lead_id = _lead_id
          AND e.affiliate_id = v_affiliate_id
          AND e.event_type IN ('call_initiated','status_changed','sms_sent','email_sent')
     )
  THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'no_personal_contact_proof');
  END IF;

  v_city := nullif(btrim(coalesce(v_lead.city, '')), '');
  IF v_city IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'lead_city_missing');
  END IF;
  v_city_key := lower(v_city);

  -- Verrou atomique par ville : sérialise le décompte des 10 places.
  PERFORM pg_advisory_xact_lock(hashtext('afao_city:' || v_city_key));

  SELECT o.id INTO v_existing
  FROM public.affiliate_free_appointment_offers o
  WHERE o.affiliate_id = v_affiliate_id AND o.lead_id = _lead_id;

  SELECT count(*) INTO v_used
  FROM public.affiliate_free_appointment_offers o
  WHERE lower(o.city) = v_city_key
    AND o.status IN ('offered','accepted','granted','consumed')
    AND o.expires_at > now();

  IF v_existing IS NULL AND v_used >= v_cap THEN
    RETURN jsonb_build_object(
      'ok', false, 'reason', 'city_cap_reached',
      'city', v_city, 'cap', v_cap, 'used', v_used
    );
  END IF;

  SELECT * INTO v_promo FROM public.affiliate_ensure_personal_promo(v_affiliate_id);

  INSERT INTO public.affiliate_free_appointment_offers AS o
    (affiliate_id, lead_id, company_name, notes, promo_code_id, city, trade)
  VALUES (v_affiliate_id, _lead_id, coalesce(_company_name, v_lead.company_name), _notes,
          v_promo.promo_code_id, v_city, v_lead.category_primary)
  ON CONFLICT (affiliate_id, lead_id) WHERE lead_id IS NOT NULL
  DO UPDATE SET
    notes = coalesce(EXCLUDED.notes, o.notes),
    company_name = coalesce(EXCLUDED.company_name, o.company_name),
    city = coalesce(o.city, EXCLUDED.city),
    trade = coalesce(o.trade, EXCLUDED.trade),
    promo_code_id = coalesce(o.promo_code_id, EXCLUDED.promo_code_id),
    expires_at = greatest(o.expires_at, now() + interval '30 days'),
    updated_at = now()
  RETURNING o.id INTO v_offer_id;

  RETURN jsonb_build_object(
    'ok', true,
    'offer_id', v_offer_id,
    'affiliate_id', v_affiliate_id,
    'free_appointments', 3,
    'granted_appointments', 0,
    'status', 'offered',
    'city', v_city,
    'city_cap', v_cap,
    'city_slots_remaining', greatest(0, v_cap - (v_used + CASE WHEN v_existing IS NULL THEN 1 ELSE 0 END)),
    'promo_code', v_promo.code
  );
END;
$function$;

-- 3. Lecture publique de l'état EXACT d'une offre (aucune donnée personnelle)
CREATE OR REPLACE FUNCTION public.affiliate_offer_public_state(
  _offer_id uuid DEFAULT NULL,
  _promo_code text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_o record;
  v_p record;
  v_code text := nullif(upper(btrim(coalesce(_promo_code, ''))), '');
BEGIN
  IF v_code IS NOT NULL THEN
    SELECT p.id, p.code, p.discount_type, p.discount_value, p.duration_type, p.active
      INTO v_p
    FROM public.promo_codes p
    WHERE p.code = v_code AND p.active = true AND p.affiliate_id IS NOT NULL;
  END IF;

  IF _offer_id IS NOT NULL THEN
    SELECT * INTO v_o
    FROM public.affiliate_free_appointment_offers
    WHERE id = _offer_id;
  END IF;

  IF v_o.id IS NULL THEN
    RETURN jsonb_build_object(
      'offer_exists', false,
      'promo_valid', v_p.id IS NOT NULL,
      'promo_code', v_p.code,
      'discount_percent', CASE WHEN v_p.discount_type = 'percentage' THEN v_p.discount_value END,
      'discount_duration', v_p.duration_type
    );
  END IF;

  RETURN jsonb_build_object(
    'offer_exists', true,
    'status', CASE WHEN v_o.expires_at <= now() AND v_o.status IN ('offered','accepted')
                   THEN 'expired' ELSE v_o.status END,
    'offered_appointments', v_o.free_appointments,
    'granted_appointments', v_o.granted_appointments,
    'consumed_appointments', v_o.consumed_appointments,
    'remaining_appointments', greatest(0, v_o.granted_appointments - v_o.consumed_appointments),
    'offered_at', v_o.offered_at,
    'accepted_at', v_o.accepted_at,
    'granted_at', v_o.granted_at,
    'expires_at', v_o.expires_at,
    'city', v_o.city,
    'promo_valid', v_p.id IS NOT NULL AND v_p.id = v_o.promo_code_id,
    'promo_code', v_p.code,
    'discount_percent', CASE WHEN v_p.discount_type = 'percentage' THEN v_p.discount_value END,
    'discount_duration', v_p.duration_type
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.affiliate_offer_public_state(uuid, text) FROM public;
GRANT EXECUTE ON FUNCTION public.affiliate_offer_public_state(uuid, text) TO anon, authenticated, service_role;

-- 4. Places restantes par ville (affilié connecté)
CREATE OR REPLACE FUNCTION public.affiliate_city_free_slots(_city text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT jsonb_build_object(
    'city', _city,
    'cap', 10,
    'used', c.used,
    'remaining', greatest(0, 10 - c.used)
  )
  FROM (
    SELECT count(*)::int AS used
    FROM public.affiliate_free_appointment_offers o
    WHERE lower(o.city) = lower(btrim(coalesce(_city, '')))
      AND o.status IN ('offered','accepted','granted','consumed')
      AND o.expires_at > now()
  ) c;
$function$;

REVOKE ALL ON FUNCTION public.affiliate_city_free_slots(text) FROM public;
GRANT EXECUTE ON FUNCTION public.affiliate_city_free_slots(text) TO authenticated, service_role;
