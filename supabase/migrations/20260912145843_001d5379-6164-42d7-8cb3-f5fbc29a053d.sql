CREATE OR REPLACE FUNCTION public.create_estimator_project(
  p_user_id uuid,
  p_idempotency_key text,
  p_category text,
  p_category_label text,
  p_description text,
  p_source text,
  p_source_page text,
  p_address text,
  p_normalized_address text,
  p_city text,
  p_postal_code text,
  p_latitude numeric,
  p_longitude numeric,
  p_property_type text,
  p_budget_min numeric,
  p_budget_max numeric,
  p_urgency text,
  p_payload jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_exists boolean;
  v_property_id uuid;
  v_project_id uuid;
  v_lead_id uuid;
  v_existing record;
  v_first_name text;
  v_email text;
BEGIN
  IF p_user_id IS NULL THEN RAISE EXCEPTION 'user_required'; END IF;
  IF coalesce(btrim(p_idempotency_key), '') = '' OR length(p_idempotency_key) > 120 THEN
    RAISE EXCEPTION 'invalid_idempotency_key';
  END IF;
  IF coalesce(btrim(p_normalized_address), '') = '' OR coalesce(btrim(p_address), '') = '' THEN
    RAISE EXCEPTION 'verified_address_required';
  END IF;
  IF p_budget_min IS NULL OR p_budget_max IS NULL
     OR p_budget_min < 0 OR p_budget_max < p_budget_min OR p_budget_max > 100000000 THEN
    RAISE EXCEPTION 'invalid_budget_range';
  END IF;

  -- Sérialise les requêtes concurrentes portant la même clé d'idempotence.
  PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::text || ':' || p_idempotency_key, 0));

  SELECT project_id, lead_id INTO v_existing
  FROM public.project_intake_keys
  WHERE user_id = p_user_id AND idempotency_key = p_idempotency_key;

  IF FOUND THEN
    RETURN jsonb_build_object('project_id', v_existing.project_id, 'lead_id', v_existing.lead_id, 'reused', true);
  END IF;

  v_first_name := nullif(btrim(coalesce(p_payload->>'first_name', '')), '');
  v_email := nullif(btrim(coalesce(p_payload->>'email', '')), '');

  -- Profil propriétaire : obligatoire AVANT la demande (leads.owner_profile_id -> profiles.user_id).
  SELECT true INTO v_profile_exists FROM public.profiles WHERE user_id = p_user_id LIMIT 1;
  IF v_profile_exists IS NULL THEN
    INSERT INTO public.profiles (user_id, first_name, email, full_name)
    VALUES (p_user_id, v_first_name, v_email, v_first_name)
    ON CONFLICT (user_id) DO NOTHING;
  ELSE
    -- Seules les valeurs réellement vides sont complétées ; aucune donnée
    -- saisie par la personne n'est écrasée.
    UPDATE public.profiles
    SET first_name = coalesce(nullif(btrim(first_name), ''), v_first_name),
        email = coalesce(nullif(btrim(email), ''), v_email),
        full_name = coalesce(nullif(btrim(full_name), ''), v_first_name)
    WHERE user_id = p_user_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = p_user_id) THEN
    RAISE EXCEPTION 'profile_unavailable';
  END IF;

  -- Propriété : uniquement la même adresse normalisée.
  SELECT id INTO v_property_id
  FROM public.properties
  WHERE user_id = p_user_id AND normalized_address = p_normalized_address
  ORDER BY created_at ASC LIMIT 1;

  IF v_property_id IS NULL THEN
    INSERT INTO public.properties (
      user_id, address, full_address, normalized_address, city, province, country,
      postal_code, property_type, latitude, longitude
    ) VALUES (
      p_user_id, p_address, p_address, p_normalized_address, p_city, 'QC', 'CA',
      p_postal_code, p_property_type, p_latitude, p_longitude
    ) RETURNING id INTO v_property_id;
  END IF;

  INSERT INTO public.projects (
    user_id, property_id, title, description, subcategory, status, urgency,
    budget_min, budget_max, matching_status
  ) VALUES (
    p_user_id, v_property_id, left(coalesce(p_category_label, 'Projet'), 120),
    left(coalesce(nullif(btrim(p_description), ''), coalesce(p_category_label, 'Projet')), 4000),
    p_category, 'open', coalesce(p_urgency, 'normal'),
    p_budget_min, p_budget_max, 'pending'
  ) RETURNING id INTO v_project_id;

  INSERT INTO public.leads (
    owner_profile_id, property_id, lead_type, city, intent, project_category,
    budget_min, budget_max, urgency, language, status, matching_status, payload
  ) VALUES (
    p_user_id, v_property_id, 'contractor', p_city, 'renovation', p_category,
    p_budget_min, p_budget_max, coalesce(p_urgency, 'normal'), 'fr', 'new', 'pending',
    coalesce(p_payload, '{}'::jsonb) || jsonb_build_object(
      'project_id', v_project_id, 'source', p_source, 'source_page', p_source_page,
      'idempotency_key', p_idempotency_key
    )
  ) RETURNING id INTO v_lead_id;

  IF v_lead_id IS NULL THEN RAISE EXCEPTION 'lead_creation_failed'; END IF;

  INSERT INTO public.project_intake_keys (idempotency_key, user_id, project_id, lead_id, source)
  VALUES (p_idempotency_key, p_user_id, v_project_id, v_lead_id, coalesce(p_source, 'renovation_calculator'));

  RETURN jsonb_build_object('project_id', v_project_id, 'lead_id', v_lead_id, 'reused', false);
END;
$$;

REVOKE ALL ON FUNCTION public.create_estimator_project(uuid, text, text, text, text, text, text, text, text, text, text, numeric, numeric, text, numeric, numeric, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_estimator_project(uuid, text, text, text, text, text, text, text, text, text, text, numeric, numeric, text, numeric, numeric, text, jsonb) TO service_role;