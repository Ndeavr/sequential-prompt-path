CREATE OR REPLACE FUNCTION public.activate_my_contractor_account(
  _user_id uuid,
  _activation_token text DEFAULT NULL,
  _context jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := _user_id;
  v_user_email text;
  v_prospect record;
  v_contractor_id uuid;
  v_business_name text;
  v_token text := nullif(btrim(coalesce(_activation_token, '')), '');
BEGIN
  IF v_user_id IS NULL OR NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_user_id) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_authenticated_user');
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
    IF nullif(_context->>'prospect_id', '') IS NOT NULL
       AND (_context->>'prospect_id')::uuid <> v_prospect.id THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'invitation_context_mismatch');
    END IF;
  END IF;

  v_business_name := coalesce(
    nullif(btrim(v_prospect.business_name), ''),
    nullif(btrim(_context->>'business_name'), ''),
    nullif(split_part(coalesce(v_user_email, ''), '@', 1), '')
  );
  IF v_business_name IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'business_name_required');
  END IF;

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
    v_user_id, v_business_name,
    coalesce(v_prospect.category, nullif(_context->>'trade', '')),
    v_prospect.phone_e164, coalesce(v_prospect.email, v_user_email),
    v_prospect.website_url, v_prospect.street_address,
    coalesce(v_prospect.city, nullif(_context->>'city', '')), v_prospect.postal_code
  )
  ON CONFLICT (user_id) DO UPDATE SET
    business_name = CASE WHEN nullif(btrim(public.contractors.business_name), '') IS NULL THEN EXCLUDED.business_name ELSE public.contractors.business_name END,
    specialty = coalesce(public.contractors.specialty, EXCLUDED.specialty),
    phone = coalesce(public.contractors.phone, EXCLUDED.phone),
    email = coalesce(public.contractors.email, EXCLUDED.email),
    website = coalesce(public.contractors.website, EXCLUDED.website),
    address = coalesce(public.contractors.address, EXCLUDED.address),
    city = coalesce(public.contractors.city, EXCLUDED.city),
    postal_code = coalesce(public.contractors.postal_code, EXCLUDED.postal_code)
  RETURNING id INTO v_contractor_id;

  UPDATE public.contractor_matching_profiles
     SET contractor_id = v_contractor_id,
         prospect_id = coalesce(prospect_id, v_prospect.id),
         business_name = coalesce(business_name, v_business_name),
         city = coalesce(city, v_prospect.city, nullif(_context->>'city', '')),
         trade = coalesce(trade, v_prospect.category, nullif(_context->>'trade', '')),
         affiliate_ref = coalesce(affiliate_ref, nullif(_context->>'affiliate_ref', '')),
         utm = coalesce(utm, '{}'::jsonb) || coalesce(_context->'utm', '{}'::jsonb)
   WHERE (v_token IS NOT NULL AND activation_token = v_token)
      OR contractor_id = v_contractor_id;

  IF v_token IS NOT NULL THEN
    UPDATE public.verified_contractor_prospects
       SET outreach_status = 'activated', updated_at = now()
     WHERE id = v_prospect.id;
  END IF;

  RETURN jsonb_build_object('ok', true, 'contractor_id', v_contractor_id,
    'prospect_id', v_prospect.id, 'business_name', v_business_name);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.activate_my_contractor_account(uuid, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.activate_my_contractor_account(uuid, text, jsonb) TO service_role;
DROP FUNCTION public.activate_my_contractor_account(text, jsonb);