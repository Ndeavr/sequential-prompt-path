-- Harden auth_role_intents: table privileges, single-use, sanitized input.

REVOKE ALL ON TABLE public.auth_role_intents FROM PUBLIC;
REVOKE ALL ON TABLE public.auth_role_intents FROM anon;
REVOKE ALL ON TABLE public.auth_role_intents FROM authenticated;
GRANT ALL ON TABLE public.auth_role_intents TO service_role;
ALTER TABLE public.auth_role_intents ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_auth_role_intents_email_created
  ON public.auth_role_intents (email_hash, created_at DESC);

-- 1) create: strict allowlist + size caps + rate limit + expired cleanup
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
  v_affiliate text := nullif(btrim(coalesce(_affiliate_ref, '')), '');
  v_email_hash text;
  v_meta jsonb := '{}'::jsonb;
  v_raw jsonb := coalesce(_metadata, '{}'::jsonb);
  v_utm jsonb := '{}'::jsonb;
  v_key text;
  v_val text;
  v_recent int;
BEGIN
  IF v_token IS NULL OR length(v_token) < 24 OR length(v_token) > 128 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_token');
  END IF;
  IF v_email IS NULL OR position('@' in v_email) < 2 OR length(v_email) > 254 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_email');
  END IF;
  IF v_role NOT IN ('homeowner', 'contractor') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'role_not_self_assignable');
  END IF;
  IF v_account_type IS NULL OR v_account_type NOT IN ('homeowner', 'contractor', 'property_manager') THEN
    v_account_type := v_role;
  END IF;
  IF v_return IS NOT NULL AND (
       length(v_return) > 512
       OR v_return !~ '^/[^/]'
       OR v_return ~ '^/(login|signup|logout|auth/callback|role)(/|\?|$)'
     ) THEN
    v_return := NULL;
  END IF;
  IF v_affiliate IS NOT NULL AND (length(v_affiliate) > 64 OR v_affiliate !~ '^[A-Za-z0-9._-]+$') THEN
    v_affiliate := NULL;
  END IF;
  IF pg_column_size(v_raw) > 8192 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'metadata_too_large');
  END IF;

  v_email_hash := encode(sha256(convert_to(v_email, 'UTF8')), 'hex');

  -- Opportunistic cleanup of stale rows (bounded work).
  DELETE FROM public.auth_role_intents
   WHERE expires_at < now() - interval '1 day';

  -- Basic abuse limit per email hash.
  SELECT count(*) INTO v_recent
    FROM public.auth_role_intents
   WHERE email_hash = v_email_hash
     AND created_at > now() - interval '15 minutes';
  IF v_recent >= 10 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'rate_limited');
  END IF;

  -- Allowlist: only the keys the post-auth flow actually needs, nulls dropped.
  FOREACH v_key IN ARRAY ARRAY[
    'activation_token','prospect_id','lead_id','campaign_id',
    'onboarding_step','business_name','city','trade'
  ] LOOP
    v_val := nullif(btrim(coalesce(v_raw ->> v_key, '')), '');
    IF v_val IS NOT NULL THEN
      IF length(v_val) > 200 THEN
        RETURN jsonb_build_object('ok', false, 'reason', 'metadata_field_too_large');
      END IF;
      v_meta := v_meta || jsonb_build_object(v_key, v_val);
    END IF;
  END LOOP;

  IF jsonb_typeof(v_raw -> 'utm') = 'object' THEN
    FOR v_key, v_val IN
      SELECT k, v FROM jsonb_each_text(v_raw -> 'utm') AS t(k, v)
    LOOP
      IF v_key IN ('utm_source','utm_medium','utm_campaign','utm_term','utm_content','gclid','fbclid')
         AND nullif(btrim(coalesce(v_val, '')), '') IS NOT NULL
         AND length(v_val) <= 200 THEN
        v_utm := v_utm || jsonb_build_object(v_key, btrim(v_val));
      END IF;
    END LOOP;
  END IF;
  IF v_utm <> '{}'::jsonb THEN
    v_meta := v_meta || jsonb_build_object('utm', v_utm);
  END IF;

  INSERT INTO public.auth_role_intents (
    token_hash, email_hash, role, account_type, return_path, affiliate_ref, metadata, expires_at
  ) VALUES (
    encode(sha256(convert_to(v_token, 'UTF8')), 'hex'),
    v_email_hash, v_role, v_account_type, v_return, v_affiliate, v_meta,
    now() + interval '1 hour'
  )
  ON CONFLICT (token_hash) DO NOTHING;

  RETURN jsonb_build_object('ok', true);
END;
$function$;

REVOKE ALL ON FUNCTION public.create_auth_role_intent(text, text, text, text, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_auth_role_intent(text, text, text, text, text, text, jsonb) TO anon, authenticated, service_role;

-- 2) consume: any consumed_at is final (true single use)
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
  IF v_row.consumed_at IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'intent_already_consumed');
  END IF;
  IF v_row.expires_at <= now() THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'intent_expired');
  END IF;
  IF v_email IS NULL OR v_row.email_hash <> encode(sha256(convert_to(v_email, 'UTF8')), 'hex') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'email_mismatch');
  END IF;
  IF v_row.role NOT IN ('homeowner', 'contractor') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'role_not_self_assignable');
  END IF;

  UPDATE public.auth_role_intents
     SET consumed_at = now(), consumed_by = v_uid
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
REVOKE ALL ON FUNCTION public.consume_auth_role_intent(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.consume_auth_role_intent(text) TO authenticated, service_role;

-- 3) release: same consumer only, before expiry
CREATE OR REPLACE FUNCTION public.release_auth_role_intent(_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_token text := nullif(btrim(coalesce(_token, '')), '');
  v_uid uuid := auth.uid();
  v_count int := 0;
BEGIN
  IF v_uid IS NULL OR v_token IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_authenticated');
  END IF;

  WITH released AS (
    UPDATE public.auth_role_intents
       SET consumed_at = NULL, consumed_by = NULL
     WHERE token_hash = encode(sha256(convert_to(v_token, 'UTF8')), 'hex')
       AND consumed_by = v_uid
       AND consumed_at IS NOT NULL
       AND expires_at > now()
    RETURNING 1
  )
  SELECT count(*) INTO v_count FROM released;

  RETURN jsonb_build_object('ok', v_count > 0);
END;
$function$;

REVOKE ALL ON FUNCTION public.release_auth_role_intent(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.release_auth_role_intent(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.release_auth_role_intent(text) TO authenticated, service_role;

-- 4) contractor activation stays server-side only
REVOKE ALL ON FUNCTION public.activate_my_contractor_account(uuid, text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.activate_my_contractor_account(uuid, text, jsonb) FROM anon;
REVOKE ALL ON FUNCTION public.activate_my_contractor_account(uuid, text, jsonb) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.activate_my_contractor_account(uuid, text, jsonb) TO service_role;