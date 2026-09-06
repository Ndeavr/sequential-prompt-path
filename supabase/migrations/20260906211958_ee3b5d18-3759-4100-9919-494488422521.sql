-- 1) Cross-device auth role intent tokens (server-side, single-use, hashed)
CREATE TABLE IF NOT EXISTS public.auth_role_intents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash text NOT NULL UNIQUE,
  email_hash text NOT NULL,
  role text NOT NULL,
  account_type text NOT NULL DEFAULT 'homeowner',
  return_path text,
  affiliate_ref text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  expires_at timestamptz NOT NULL DEFAULT now() + interval '1 hour',
  consumed_at timestamptz,
  consumed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.auth_role_intents TO service_role;
-- No anon/authenticated grants: access is only through the SECURITY DEFINER functions below.

ALTER TABLE public.auth_role_intents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role manages auth role intents" ON public.auth_role_intents;
CREATE POLICY "service_role manages auth role intents"
  ON public.auth_role_intents FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_auth_role_intents_expires ON public.auth_role_intents (expires_at);

DROP TRIGGER IF EXISTS trg_auth_role_intents_updated_at ON public.auth_role_intents;
CREATE TRIGGER trg_auth_role_intents_updated_at
  BEFORE UPDATE ON public.auth_role_intents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) Create an intent (called before auth, by anon)
CREATE OR REPLACE FUNCTION public.create_auth_role_intent(
  _token text,
  _email text,
  _role text,
  _account_type text DEFAULT NULL,
  _return_path text DEFAULT NULL,
  _affiliate_ref text DEFAULT NULL,
  _metadata jsonb DEFAULT '{}'::jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_token text := nullif(btrim(coalesce(_token, '')), '');
  v_email text := lower(nullif(btrim(coalesce(_email, '')), ''));
  v_role text := lower(nullif(btrim(coalesce(_role, '')), ''));
  v_account_type text := lower(nullif(btrim(coalesce(_account_type, '')), ''));
  v_return text := nullif(btrim(coalesce(_return_path, '')), '');
BEGIN
  IF v_token IS NULL OR length(v_token) < 24 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_token');
  END IF;
  IF v_email IS NULL OR position('@' in v_email) < 2 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_email');
  END IF;
  -- Strict whitelist: only self-serve public roles.
  IF v_role NOT IN ('homeowner', 'contractor') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'role_not_self_assignable');
  END IF;
  IF v_account_type IS NULL OR v_account_type NOT IN ('homeowner', 'contractor', 'property_manager') THEN
    v_account_type := v_role;
  END IF;
  -- Only safe internal return paths.
  IF v_return IS NOT NULL AND (v_return !~ '^/[^/]' OR v_return ~ '^/(login|signup|logout|auth/callback|role)(/|\?|$)') THEN
    v_return := NULL;
  END IF;

  INSERT INTO public.auth_role_intents (
    token_hash, email_hash, role, account_type, return_path, affiliate_ref, metadata, expires_at
  ) VALUES (
    encode(sha256(convert_to(v_token, 'UTF8')), 'hex'),
    encode(sha256(convert_to(v_email, 'UTF8')), 'hex'),
    v_role,
    v_account_type,
    v_return,
    nullif(btrim(coalesce(_affiliate_ref, '')), ''),
    coalesce(_metadata, '{}'::jsonb),
    now() + interval '1 hour'
  )
  ON CONFLICT (token_hash) DO NOTHING;

  RETURN jsonb_build_object('ok', true);
END;
$function$;

REVOKE ALL ON FUNCTION public.create_auth_role_intent(text, text, text, text, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_auth_role_intent(text, text, text, text, text, text, jsonb) TO anon, authenticated, service_role;

-- 3) Consume an intent (called after the session exists)
CREATE OR REPLACE FUNCTION public.consume_auth_role_intent(_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_token text := nullif(btrim(coalesce(_token, '')), '');
  v_uid uuid := auth.uid();
  v_email text;
  v_row public.auth_role_intents;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_authenticated');
  END IF;
  IF v_token IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_token');
  END IF;

  SELECT lower(email) INTO v_email FROM auth.users WHERE id = v_uid;

  SELECT * INTO v_row
    FROM public.auth_role_intents
   WHERE token_hash = encode(sha256(convert_to(v_token, 'UTF8')), 'hex')
   FOR UPDATE;

  IF v_row.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'intent_not_found');
  END IF;
  IF v_row.expires_at <= now() THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'intent_expired');
  END IF;
  IF v_row.consumed_at IS NOT NULL AND v_row.consumed_by IS DISTINCT FROM v_uid THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'intent_already_consumed');
  END IF;
  IF v_email IS NULL OR v_row.email_hash <> encode(sha256(convert_to(v_email, 'UTF8')), 'hex') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'email_mismatch');
  END IF;
  IF v_row.role NOT IN ('homeowner', 'contractor') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'role_not_self_assignable');
  END IF;

  UPDATE public.auth_role_intents
     SET consumed_at = coalesce(consumed_at, now()),
         consumed_by = v_uid
   WHERE id = v_row.id;

  RETURN jsonb_build_object(
    'ok', true,
    'role', v_row.role,
    'account_type', v_row.account_type,
    'return_path', v_row.return_path,
    'affiliate_ref', v_row.affiliate_ref,
    'metadata', v_row.metadata
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.consume_auth_role_intent(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_auth_role_intent(text) TO authenticated, service_role;

-- 4) Release an intent when the application failed (keeps it usable)
CREATE OR REPLACE FUNCTION public.release_auth_role_intent(_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_token text := nullif(btrim(coalesce(_token, '')), '');
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL OR v_token IS NULL THEN
    RETURN jsonb_build_object('ok', false);
  END IF;

  UPDATE public.auth_role_intents
     SET consumed_at = NULL, consumed_by = NULL
   WHERE token_hash = encode(sha256(convert_to(v_token, 'UTF8')), 'hex')
     AND consumed_by = v_uid
     AND expires_at > now();

  RETURN jsonb_build_object('ok', true);
END;
$function$;

REVOKE ALL ON FUNCTION public.release_auth_role_intent(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.release_auth_role_intent(text) TO authenticated, service_role;

-- 5) Multi-role fix: activating a contractor must NOT drop an existing homeowner role.
CREATE OR REPLACE FUNCTION public.activate_my_contractor_account(_user_id uuid, _activation_token text DEFAULT NULL::text, _context jsonb DEFAULT '{}'::jsonb)
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
  v_offer_id uuid;
  v_offer_granted boolean := false;
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
       AND t.expires_at > now()
     LIMIT 1;
    IF v_prospect.id IS NULL THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'invalid_or_expired_invitation');
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

  -- UNPRO is multi-role: existing legitimate roles (homeowner, etc.) are preserved.

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

    SELECT o.id INTO v_offer_id
      FROM public.affiliate_free_appointment_offers o
      JOIN public.contractor_leads l ON l.id = o.lead_id
     WHERE o.contractor_id IS NULL
       AND o.status IN ('offered', 'accepted')
       AND o.expires_at > now()
       AND lower(coalesce(l.city, '')) = lower(coalesce(v_prospect.city, ''))
       AND (
         (v_prospect.phone_e164 IS NOT NULL AND regexp_replace(coalesce(l.mobile_phone, l.phone, ''), '\D', '', 'g') = regexp_replace(v_prospect.phone_e164, '\D', '', 'g'))
         OR (v_prospect.email IS NOT NULL AND lower(coalesce(l.email, '')) = lower(v_prospect.email))
       )
     ORDER BY o.offered_at
     FOR UPDATE OF o SKIP LOCKED
     LIMIT 1;

    IF v_offer_id IS NOT NULL THEN
      UPDATE public.affiliate_free_appointment_offers
         SET contractor_id = v_contractor_id,
             status = 'granted',
             accepted_at = coalesce(accepted_at, now()),
             granted_at = coalesce(granted_at, now()),
             granted_appointments = free_appointments,
             updated_at = now()
       WHERE id = v_offer_id;
      v_offer_granted := true;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'contractor_id', v_contractor_id,
    'prospect_id', v_prospect.id,
    'business_name', v_business_name,
    'free_offer_eligible', v_offer_id IS NOT NULL,
    'free_offer_accepted', v_offer_granted,
    'free_offer_id', v_offer_id
  );
END;
$function$;