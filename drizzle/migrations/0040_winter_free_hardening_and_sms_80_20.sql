ALTER TABLE public.outreach_daily_sms_reservations ADD COLUMN IF NOT EXISTS lane text NOT NULL DEFAULT 'paid' CHECK (lane IN ('paid','free'));

DROP FUNCTION IF EXISTS public.reserve_outreach_sms_slot(text, uuid);
CREATE OR REPLACE FUNCTION public.reserve_outreach_sms_slot(p_dedupe_key text, p_prospect_id uuid DEFAULT NULL, p_lane text DEFAULT 'paid')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_day date := (now() AT TIME ZONE 'America/Toronto')::date;
  v_lane text := CASE WHEN p_lane = 'free' THEN 'free' ELSE 'paid' END;
  v_cap int; v_free_cap int; v_lane_cap int; v_used int; v_lane_used int;
BEGIN
  SELECT LEAST(25, GREATEST(0, COALESCE(sms_daily_limit, 0))) INTO v_cap FROM outreach_settings LIMIT 1;
  v_cap := COALESCE(v_cap, 0);
  v_free_cap := floor(v_cap * 0.2)::int;           -- 25 => 5 gratuits
  v_lane_cap := CASE WHEN v_lane = 'free' THEN v_free_cap ELSE v_cap - v_free_cap END; -- 25 => 20 payants
  PERFORM pg_advisory_xact_lock(hashtext('outreach_sms_daily_cap'));
  IF EXISTS (SELECT 1 FROM outreach_daily_sms_reservations WHERE day_local = v_day AND dedupe_key = p_dedupe_key) THEN
    RETURN jsonb_build_object('granted', false, 'reason', 'already_reserved_today', 'cap', v_cap, 'lane', v_lane);
  END IF;
  SELECT count(*), count(*) FILTER (WHERE lane = v_lane) INTO v_used, v_lane_used FROM outreach_daily_sms_reservations WHERE day_local = v_day;
  IF v_used >= v_cap THEN
    RETURN jsonb_build_object('granted', false, 'reason', 'daily_cap_reached', 'cap', v_cap, 'used', v_used, 'lane', v_lane);
  END IF;
  IF v_lane_used >= v_lane_cap THEN
    RETURN jsonb_build_object('granted', false, 'reason', 'lane_cap_reached', 'lane', v_lane, 'lane_cap', v_lane_cap, 'lane_used', v_lane_used);
  END IF;
  INSERT INTO outreach_daily_sms_reservations(day_local, dedupe_key, prospect_id, lane) VALUES (v_day, p_dedupe_key, p_prospect_id, v_lane);
  RETURN jsonb_build_object('granted', true, 'cap', v_cap, 'used', v_used + 1, 'lane', v_lane, 'lane_cap', v_lane_cap, 'lane_used', v_lane_used + 1);
END $$;
REVOKE ALL ON FUNCTION public.reserve_outreach_sms_slot(text, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_outreach_sms_slot(text, uuid, text) TO service_role;

CREATE OR REPLACE FUNCTION public.claim_scoped_free_activation(p_code text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_promo record; v_scope record; v_c record; v_existing record; v_row record;
  v_count int; v_n int;
BEGIN
  IF v_uid IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'auth_required'); END IF;
  SELECT * INTO v_promo FROM promo_codes
   WHERE upper(code) = upper(btrim(coalesce(p_code,''))) AND active AND archived_at IS NULL
     AND (starts_at IS NULL OR starts_at <= now()) AND (ends_at IS NULL OR ends_at > now());
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'invalid_or_expired'); END IF;
  SELECT * INTO v_scope FROM promo_code_scopes WHERE promo_code_id = v_promo.id;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'not_free_activation_code'); END IF;

  SELECT count(*) INTO v_n FROM contractors WHERE user_id = v_uid;
  IF v_n <> 1 THEN RETURN jsonb_build_object('ok', false, 'reason', CASE WHEN v_n = 0 THEN 'no_business' ELSE 'ambiguous_business' END); END IF;
  SELECT id, city, business_name, email, phone INTO v_c FROM contractors WHERE user_id = v_uid;

  -- Ordre stable : verrou ENTREPRISE d'abord (sérialise deux codes/villes), puis verrou du code.
  PERFORM pg_advisory_xact_lock(hashtextextended('scoped_free_biz:' || v_c.id::text, 0));
  PERFORM pg_advisory_xact_lock(hashtextextended('scoped_free:' || v_promo.id::text, 0));

  -- Une entreprise = une seule offre gratuite, tout statut (expirée/révoquée incluse) : aucun nouveau droit.
  SELECT * INTO v_existing FROM founder_memberships WHERE contractor_id = v_c.id OR user_id = v_uid ORDER BY created_at LIMIT 1;
  IF FOUND THEN
    RETURN jsonb_build_object('ok', v_existing.offer_code = v_scope.offer_code AND v_existing.city = v_scope.city_label
        AND v_existing.status IN ('founder_activated','first_referral','renewal_due','renewed'),
      'already_claimed', true,
      'reason', CASE WHEN v_existing.offer_code IS DISTINCT FROM v_scope.offer_code OR v_existing.city IS DISTINCT FROM v_scope.city_label THEN 'business_already_has_offer'
                     WHEN v_existing.status NOT IN ('founder_activated','first_referral','renewal_due','renewed') THEN 'offer_no_longer_active' ELSE NULL END,
      'offer_code', v_existing.offer_code, 'city', v_existing.city, 'founder_start', v_existing.founder_start, 'founder_end', v_existing.founder_end, 'amount_cents', 0, 'auto_renew', false);
  END IF;

  IF public.normalize_city_key(v_c.city) <> v_scope.city_key THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'city_not_eligible', 'expected_city', v_scope.city_label);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM contractor_services s WHERE s.contractor_id = v_c.id AND coalesce(s.is_active, true)
       AND (coalesce(s.category,'') ~* v_scope.service_pattern OR coalesce(s.service_name_fr,'') ~* v_scope.service_pattern OR coalesce(s.service_name_en,'') ~* v_scope.service_pattern)) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'service_not_offered');
  END IF;

  -- Plafond cumulatif : toutes les places déjà attribuées comptent, même expirées/révoquées (ne se libère jamais).
  SELECT count(*) INTO v_count FROM founder_memberships
   WHERE offer_code = v_scope.offer_code AND city = v_scope.city_label AND category_slug = v_scope.category_slug;
  IF v_count >= LEAST(v_scope.seat_cap, coalesce(v_promo.usage_limit_total, v_scope.seat_cap)) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'exhausted');
  END IF;

  INSERT INTO founder_memberships (business_name, email, phone, city, category_slug, status, founder_start, founder_end,
    renewal_price_cents, renewal_cadence, attribution, source, contractor_id, user_id, slot_number, offer_code)
  VALUES (coalesce(nullif(btrim(v_c.business_name),''), 'Entreprise'), lower(nullif(btrim(v_c.email),'')), v_c.phone, v_scope.city_label, v_scope.category_slug,
    'founder_activated', now(), now() + make_interval(months => v_scope.months), 0, 'none',
    jsonb_build_object('promo_code', v_promo.code, 'promo_code_id', v_promo.id, 'auto_renew', false), 'promo_code_scoped', v_c.id, v_uid, v_count + 1, v_scope.offer_code)
  RETURNING * INTO v_row;
  UPDATE promo_codes SET current_redemptions_count = v_count + 1, updated_at = now() WHERE id = v_promo.id;

  RETURN jsonb_build_object('ok', true, 'already_claimed', false, 'slot_number', v_row.slot_number, 'seat_cap', v_scope.seat_cap,
    'offer_code', v_row.offer_code, 'city', v_row.city, 'founder_start', v_row.founder_start, 'founder_end', v_row.founder_end, 'amount_cents', 0, 'auto_renew', false);
EXCEPTION WHEN unique_violation THEN
  RETURN jsonb_build_object('ok', false, 'reason', 'retry_conflict');
END;
$$;
REVOKE ALL ON FUNCTION public.claim_scoped_free_activation(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_scoped_free_activation(text) TO authenticated;

-- Code saisonnier : droits 12 mois, mais aucune publication/recommandation automatique avant vérification.
CREATE OR REPLACE FUNCTION public.publish_contractor_on_free_activation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE v_contractor_id uuid;
BEGIN
  IF NEW.status NOT IN ('founder_activated', 'first_referral', 'renewal_due', 'renewed') THEN RETURN NEW; END IF;
  v_contractor_id := NEW.contractor_id;
  IF v_contractor_id IS NULL AND NEW.user_id IS NOT NULL THEN
    SELECT id INTO v_contractor_id FROM public.contractors WHERE user_id = NEW.user_id ORDER BY created_at LIMIT 1;
  END IF;
  IF v_contractor_id IS NULL THEN RETURN NEW; END IF;

  IF NEW.source = 'promo_code_scoped' THEN
    BEGIN
      INSERT INTO public.contractor_activation_ledger (contractor_id, action, reason, metadata)
      VALUES (v_contractor_id, 'free_year_activated', 'Activation offerte 12 mois — publication après vérification',
        jsonb_build_object('membership_id', NEW.id, 'city', NEW.city, 'category_slug', NEW.category_slug, 'published', false));
    EXCEPTION WHEN others THEN NULL; END;
    RETURN NEW;
  END IF;

  PERFORM public.ensure_contractor_public_slug(v_contractor_id);
  UPDATE public.contractors
  SET account_status = 'active', activation_status = 'active', is_published = true, is_discoverable = true,
      is_accepting_appointments = true, updated_at = now()
  WHERE id = v_contractor_id AND coalesce(is_published, false) = false;
  BEGIN
    INSERT INTO public.contractor_activation_ledger (contractor_id, action, reason, metadata)
    VALUES (v_contractor_id, 'free_year_activated', 'Publication automatique après activation 12 mois gratuits',
      jsonb_build_object('membership_id', NEW.id, 'city', NEW.city, 'category_slug', NEW.category_slug));
  EXCEPTION WHEN others THEN NULL; END;
  RETURN NEW;
END;
$function$;