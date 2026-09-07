-- 1) Catégories de services résidentiels : ajout piscine ouverture/fermeture, cap 10 par ville+catégorie
INSERT INTO public.founder_eligible_categories (slug, name_fr, group_type, internal_cap_per_city, is_active)
VALUES ('ouverture-fermeture-piscine', 'Ouverture et fermeture de piscine', 'local_service', 10, true)
ON CONFLICT (slug) DO NOTHING;

UPDATE public.founder_eligible_categories
SET name_fr = 'Nettoyage de conduits d''air et de sécheuse', updated_at = now()
WHERE slug = 'nettoyage-conduits';

UPDATE public.founder_eligible_categories
SET internal_cap_per_city = 10, updated_at = now()
WHERE group_type = 'local_service' AND internal_cap_per_city <> 10;

-- 2) Adhésions : place, compte, fiche entreprise, code d'offre
ALTER TABLE public.founder_memberships
  ADD COLUMN IF NOT EXISTS slot_number integer,
  ADD COLUMN IF NOT EXISTS user_id uuid,
  ADD COLUMN IF NOT EXISTS contractor_id uuid,
  ADD COLUMN IF NOT EXISTS offer_code text NOT NULL DEFAULT 'free_year_local_service';

CREATE UNIQUE INDEX IF NOT EXISTS uniq_founder_membership_prospect
  ON public.founder_memberships (prospect_id) WHERE prospect_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uniq_founder_membership_contractor
  ON public.founder_memberships (contractor_id) WHERE contractor_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uniq_founder_membership_slot
  ON public.founder_memberships (lower(city), category_slug, slot_number)
  WHERE slot_number IS NOT NULL
    AND status IN ('founder_activated','first_referral','renewal_due','renewed');
CREATE INDEX IF NOT EXISTS idx_founder_membership_city_cat
  ON public.founder_memberships (lower(city), category_slug, status);

-- 3) Prospects : catégorie normalisée + provenance + offre visée
ALTER TABLE public.verified_contractor_prospects
  ADD COLUMN IF NOT EXISTS service_category_slug text,
  ADD COLUMN IF NOT EXISTS service_category_source text
    CHECK (service_category_source IN ('verified','declared','inferred','pending')),
  ADD COLUMN IF NOT EXISTS offer_code text;

CREATE INDEX IF NOT EXISTS idx_vcp_service_category
  ON public.verified_contractor_prospects (lower(city), service_category_slug);

-- 4) Disponibilité réelle par ville + catégorie
CREATE OR REPLACE FUNCTION public.local_service_offer_status(p_city text, p_category_slug text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_cat record;
  v_claimed int;
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

  RETURN jsonb_build_object(
    'verified', true,
    'city', initcap(btrim(p_city)),
    'category_slug', v_cat.slug,
    'category_name', v_cat.name_fr,
    'cap', v_cat.internal_cap_per_city,
    'claimed', v_claimed,
    'remaining', greatest(v_cat.internal_cap_per_city - v_claimed, 0),
    'eligible', v_claimed < v_cat.internal_cap_per_city,
    'reason', CASE WHEN v_claimed < v_cat.internal_cap_per_city THEN NULL ELSE 'city_category_full' END
  );
END;
$$;

-- 5) Réclamation de place : concurrente-sûre et idempotente
CREATE OR REPLACE FUNCTION public.claim_local_service_free_year(
  p_city text,
  p_category_slug text,
  p_business_name text,
  p_prospect_id uuid DEFAULT NULL,
  p_contractor_id uuid DEFAULT NULL,
  p_user_id uuid DEFAULT NULL,
  p_contact_name text DEFAULT NULL,
  p_email text DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_source text DEFAULT 'activation_link',
  p_attribution jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_status jsonb;
  v_existing record;
  v_slot int;
  v_user uuid := coalesce(p_user_id, auth.uid());
  v_row record;
BEGIN
  IF p_business_name IS NULL OR btrim(p_business_name) = '' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'missing_business_name');
  END IF;

  -- Idempotence : même prospect / même fiche / même compte = même place
  SELECT * INTO v_existing FROM public.founder_memberships
  WHERE (p_prospect_id IS NOT NULL AND prospect_id = p_prospect_id)
     OR (p_contractor_id IS NOT NULL AND contractor_id = p_contractor_id)
     OR (v_user IS NOT NULL AND user_id = v_user)
  ORDER BY created_at
  LIMIT 1;

  IF FOUND THEN
    UPDATE public.founder_memberships
    SET contractor_id = coalesce(contractor_id, p_contractor_id),
        user_id = coalesce(user_id, v_user),
        prospect_id = coalesce(prospect_id, p_prospect_id),
        updated_at = now()
    WHERE id = v_existing.id
    RETURNING * INTO v_row;

    RETURN jsonb_build_object(
      'ok', true, 'already_claimed', true, 'membership_id', v_row.id,
      'slot_number', v_row.slot_number, 'city', v_row.city,
      'category_slug', v_row.category_slug, 'offer_code', v_row.offer_code,
      'founder_start', v_row.founder_start, 'founder_end', v_row.founder_end,
      'status', v_row.status
    );
  END IF;

  -- Sérialise les réclamations concurrentes de la même ville + catégorie
  PERFORM pg_advisory_xact_lock(hashtextextended(lower(btrim(p_city)) || ':' || p_category_slug, 0));

  v_status := public.local_service_offer_status(p_city, p_category_slug);
  IF NOT coalesce((v_status->>'eligible')::boolean, false) THEN
    RETURN jsonb_build_object('ok', false, 'reason', coalesce(v_status->>'reason', 'not_eligible'), 'status', v_status);
  END IF;

  v_slot := coalesce((v_status->>'claimed')::int, 0) + 1;

  INSERT INTO public.founder_memberships (
    business_name, contact_name, email, phone, city, category_slug,
    status, founder_start, founder_end, renewal_price_cents, renewal_cadence,
    attribution, source, prospect_id, contractor_id, user_id, slot_number, offer_code
  ) VALUES (
    btrim(p_business_name), nullif(btrim(p_contact_name), ''), lower(nullif(btrim(p_email), '')),
    nullif(btrim(p_phone), ''), btrim(p_city), p_category_slug,
    'founder_activated', now(), now() + interval '12 months', 35000, 'year',
    coalesce(p_attribution, '{}'::jsonb), coalesce(p_source, 'activation_link'),
    p_prospect_id, p_contractor_id, v_user, v_slot, 'free_year_local_service'
  )
  RETURNING * INTO v_row;

  RETURN jsonb_build_object(
    'ok', true, 'already_claimed', false, 'membership_id', v_row.id,
    'slot_number', v_row.slot_number, 'city', v_row.city,
    'category_slug', v_row.category_slug, 'offer_code', v_row.offer_code,
    'founder_start', v_row.founder_start, 'founder_end', v_row.founder_end,
    'status', v_row.status
  );
EXCEPTION WHEN unique_violation THEN
  SELECT * INTO v_row FROM public.founder_memberships
  WHERE (p_prospect_id IS NOT NULL AND prospect_id = p_prospect_id)
     OR (p_contractor_id IS NOT NULL AND contractor_id = p_contractor_id)
  LIMIT 1;
  IF FOUND THEN
    RETURN jsonb_build_object('ok', true, 'already_claimed', true, 'membership_id', v_row.id,
      'slot_number', v_row.slot_number, 'city', v_row.city, 'category_slug', v_row.category_slug,
      'offer_code', v_row.offer_code, 'founder_start', v_row.founder_start,
      'founder_end', v_row.founder_end, 'status', v_row.status);
  END IF;
  RETURN jsonb_build_object('ok', false, 'reason', 'conflict');
END;
$$;

-- 6) L'admissibilité publique existante s'aligne sur la règle ville + catégorie
CREATE OR REPLACE FUNCTION public.check_founder_eligibility(p_city text, p_category_slug text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v jsonb;
BEGIN
  v := public.local_service_offer_status(p_city, p_category_slug);
  RETURN jsonb_build_object(
    'eligible', coalesce((v->>'eligible')::boolean, false),
    'reason', CASE WHEN coalesce((v->>'eligible')::boolean, false) THEN NULL
                   ELSE coalesce(v->>'reason', 'not_eligible') END,
    'city_remaining', (v->>'remaining')::int,
    'cap', (v->>'cap')::int,
    'claimed', (v->>'claimed')::int
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.local_service_offer_status(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_local_service_free_year(text, text, text, uuid, uuid, uuid, text, text, text, text, jsonb) TO authenticated, service_role;

-- 7) Vue d'acquisition pour l'administration
CREATE OR REPLACE VIEW public.v_local_service_acquisition
WITH (security_invoker = true) AS
SELECT
  p.id                                AS prospect_id,
  p.business_name,
  p.city,
  p.region,
  coalesce(p.service_category_slug, p.category)      AS service_category_slug,
  coalesce(p.service_category_source, 'pending')     AS service_category_source,
  p.source                            AS provenance,
  p.verification_status,
  p.sms_eligible,
  p.email_eligible,
  p.outreach_status,
  p.outreach_sent_at,
  p.outreach_delivered_at,
  p.outreach_clicked_at,
  c.id                                AS claim_id,
  c.claimed_at,
  c.contractor_id,
  m.id                                AS membership_id,
  m.slot_number,
  m.offer_code,
  m.founder_start,
  m.founder_end,
  m.status                            AS membership_status,
  ct.onboarding_status,
  ct.activation_status,
  (ct.service_areas IS NOT NULL)      AS has_service_areas,
  (ct.logo_url IS NOT NULL)           AS has_logo
FROM public.verified_contractor_prospects p
LEFT JOIN public.contractor_prospect_claims c ON c.prospect_id = p.id
LEFT JOIN public.founder_memberships m ON m.prospect_id = p.id
LEFT JOIN public.contractors ct ON ct.id = coalesce(c.contractor_id, m.contractor_id);

GRANT SELECT ON public.v_local_service_acquisition TO authenticated, service_role;