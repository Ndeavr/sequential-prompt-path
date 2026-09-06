CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles
    (user_id, email, full_name, salutation, first_name, last_name, account_type)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'salutation', ''),
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    'homeowner'
  )
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'homeowner'::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.activate_my_contractor_account(
  _activation_token text DEFAULT NULL,
  _context jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_user_email text;
  v_prospect record;
  v_contractor_id uuid;
  v_business_name text;
  v_token text := nullif(btrim(coalesce(_activation_token, '')), '');
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'authentication_required' USING ERRCODE = '42501';
  END IF;

  SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;

  IF v_token IS NOT NULL THEN
    SELECT p.id, p.business_name, p.category, p.city, p.phone_e164, p.email,
           p.website_url, p.street_address, p.postal_code
      INTO v_prospect
      FROM public.verified_prospect_tokens t
      JOIN public.verified_contractor_prospects p ON p.id = t.prospect_id
     WHERE t.token = v_token
     LIMIT 1;
    IF v_prospect.id IS NULL THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'invalid_invitation');
    END IF;
  END IF;

  v_business_name := coalesce(
    nullif(btrim(v_prospect.business_name), ''),
    nullif(btrim(_context->>'business_name'), ''),
    nullif(split_part(coalesce(v_user_email, ''), '@', 1), ''),
    'Entreprise UNPRO'
  );

  INSERT INTO public.profiles (user_id, email, account_type, onboarding_status)
  VALUES (v_user_id, v_user_email, 'contractor', 'profile_activation')
  ON CONFLICT (user_id) DO UPDATE SET
    account_type = 'contractor',
    email = coalesce(public.profiles.email, EXCLUDED.email),
    onboarding_status = CASE
      WHEN public.profiles.onboarding_completed THEN public.profiles.onboarding_status
      ELSE coalesce(public.profiles.onboarding_status, EXCLUDED.onboarding_status)
    END;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, 'contractor'::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  DELETE FROM public.user_roles
   WHERE user_id = v_user_id AND role = 'homeowner'::public.app_role;

  INSERT INTO public.contractors
    (user_id, business_name, specialty, phone, email, website, address, city, postal_code)
  VALUES (
    v_user_id, v_business_name, v_prospect.category, v_prospect.phone_e164,
    coalesce(v_prospect.email, v_user_email), v_prospect.website_url,
    v_prospect.street_address, v_prospect.city, v_prospect.postal_code
  )
  ON CONFLICT (user_id) DO UPDATE SET
    business_name = CASE
      WHEN nullif(btrim(public.contractors.business_name), '') IS NULL
        THEN EXCLUDED.business_name ELSE public.contractors.business_name END,
    specialty = coalesce(public.contractors.specialty, EXCLUDED.specialty),
    phone = coalesce(public.contractors.phone, EXCLUDED.phone),
    email = coalesce(public.contractors.email, EXCLUDED.email),
    website = coalesce(public.contractors.website, EXCLUDED.website),
    address = coalesce(public.contractors.address, EXCLUDED.address),
    city = coalesce(public.contractors.city, EXCLUDED.city),
    postal_code = coalesce(public.contractors.postal_code, EXCLUDED.postal_code)
  RETURNING id INTO v_contractor_id;

  IF v_token IS NOT NULL THEN
    UPDATE public.contractor_matching_profiles
       SET contractor_id = v_contractor_id,
           prospect_id = coalesce(prospect_id, v_prospect.id),
           business_name = coalesce(business_name, v_prospect.business_name),
           city = coalesce(city, v_prospect.city),
           trade = coalesce(trade, v_prospect.category),
           affiliate_ref = coalesce(affiliate_ref, nullif(_context->>'affiliate_ref', '')),
           utm = coalesce(utm, '{}'::jsonb) || coalesce(_context->'utm', '{}'::jsonb)
     WHERE activation_token = v_token
       AND (prospect_id IS NULL OR prospect_id = v_prospect.id)
       AND (contractor_id IS NULL OR contractor_id = v_contractor_id);

    UPDATE public.verified_contractor_prospects
       SET outreach_status = 'activated', updated_at = now()
     WHERE id = v_prospect.id;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'contractor_id', v_contractor_id,
    'prospect_id', v_prospect.id,
    'business_name', v_business_name
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.activate_my_contractor_account(text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.activate_my_contractor_account(text, jsonb) TO authenticated;

DROP POLICY IF EXISTS "public can read tokens" ON public.verified_prospect_tokens;
DROP POLICY IF EXISTS "service updates tokens" ON public.verified_prospect_tokens;
REVOKE SELECT, INSERT, UPDATE ON public.verified_prospect_tokens FROM anon, authenticated;

DROP POLICY IF EXISTS "System can insert attributions" ON public.affiliate_attributions;
CREATE POLICY "Users can insert own attributions"
ON public.affiliate_attributions FOR INSERT TO authenticated
WITH CHECK (referred_user_id = auth.uid() OR referrer_user_id = auth.uid());