CREATE TABLE public.promo_code_scopes (
  promo_code_id uuid PRIMARY KEY REFERENCES public.promo_codes(id) ON DELETE CASCADE,
  offer_code text NOT NULL,
  city_key text NOT NULL,
  city_label text NOT NULL,
  category_slug text NOT NULL,
  service_pattern text NOT NULL,
  seat_cap int NOT NULL CHECK (seat_cap > 0),
  months int NOT NULL DEFAULT 12,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.promo_code_scopes TO authenticated;
GRANT ALL ON public.promo_code_scopes TO service_role;
ALTER TABLE public.promo_code_scopes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read promo scopes" ON public.promo_code_scopes FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.normalize_city_key(p text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT regexp_replace(regexp_replace(
    translate(lower(btrim(coalesce(p,''))), 'àâäéèêëîïôöùûüç', 'aaaeeeeiioouuuc'),
    '^(sainte|saint)[- ]', CASE WHEN lower(btrim(coalesce(p,''))) LIKE 'sainte%' THEN 'ste-' ELSE 'st-' END), '[^a-z0-9]+', '-', 'g')
$$;

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

  -- Une entreprise = une seule offre gratuite, toutes villes/années confondues
  SELECT * INTO v_existing FROM founder_memberships WHERE contractor_id = v_c.id OR user_id = v_uid ORDER BY created_at LIMIT 1;
  IF FOUND THEN
    RETURN jsonb_build_object('ok', v_existing.offer_code = v_scope.offer_code AND v_existing.city = v_scope.city_label,
      'already_claimed', true, 'reason', CASE WHEN v_existing.offer_code = v_scope.offer_code AND v_existing.city = v_scope.city_label THEN NULL ELSE 'business_already_has_offer' END,
      'offer_code', v_existing.offer_code, 'city', v_existing.city, 'founder_start', v_existing.founder_start, 'founder_end', v_existing.founder_end, 'amount_cents', 0, 'auto_renew', false);
  END IF;

  IF public.normalize_city_key(v_c.city) <> v_scope.city_key THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'city_not_eligible', 'expected_city', v_scope.city_label);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM contractor_services s WHERE s.contractor_id = v_c.id AND coalesce(s.is_active, true)
       AND (coalesce(s.category,'') ~* v_scope.service_pattern OR coalesce(s.service_name_fr,'') ~* v_scope.service_pattern OR coalesce(s.service_name_en,'') ~* v_scope.service_pattern)) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'service_not_offered');
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('scoped_free:' || v_promo.id::text, 0));
  SELECT count(*) INTO v_count FROM founder_memberships
   WHERE offer_code = v_scope.offer_code AND city = v_scope.city_label AND category_slug = v_scope.category_slug
     AND status IN ('founder_activated','first_referral','renewal_due','renewed');
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