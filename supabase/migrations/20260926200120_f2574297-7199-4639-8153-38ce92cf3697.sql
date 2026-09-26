CREATE OR REPLACE FUNCTION public.admin_get_contractor_account_origin(_contractor_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  c record;
  sub record;
  fm record;
  pr record;
  last_led record;
  last_admin record;
  origin_code text;
  source_exact text;
  has_payment boolean := false;
  has_active_plan boolean := false;
  email_confirmed boolean := false;
  phone_confirmed boolean := false;
  is_test boolean := false;
  has_import boolean := false;
  has_clara boolean := false;
  has_admin_log boolean := false;
  last_action_label text;
  last_action_at timestamptz;
  last_action_source text;
  profile_complete boolean := false;
  page_published boolean := false;
  activated boolean := false;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT * INTO c FROM public.contractors WHERE id = _contractor_id;
  IF c.id IS NULL THEN RETURN NULL; END IF;

  SELECT * INTO sub FROM public.contractor_subscriptions
   WHERE contractor_id = c.id ORDER BY created_at DESC LIMIT 1;

  SELECT * INTO fm FROM public.founder_memberships
   WHERE contractor_id = c.id OR (c.user_id IS NOT NULL AND user_id = c.user_id)
   ORDER BY created_at DESC LIMIT 1;

  SELECT * INTO pr FROM public.prospects
   WHERE contractor_id = c.id
      OR (c.email IS NOT NULL AND lower(email) = lower(c.email))
   ORDER BY created_at DESC LIMIT 1;

  SELECT * INTO last_led FROM public.contractor_activation_ledger
   WHERE contractor_id = c.id ORDER BY created_at DESC LIMIT 1;

  SELECT * INTO last_admin FROM public.admin_activation_logs
   WHERE contractor_id = c.id ORDER BY created_at DESC LIMIT 1;

  has_admin_log := last_admin.id IS NOT NULL;

  -- Paiement réel : abonnement payé ou écriture de paiement au journal.
  has_payment := COALESCE(sub.payment_status = 'paid', false)
                 OR sub.stripe_subscription_id IS NOT NULL
                 OR EXISTS (SELECT 1 FROM public.contractor_activation_ledger l
                             WHERE l.contractor_id = c.id AND l.action = 'paid')
                 OR EXISTS (SELECT 1 FROM public.pricing_transactions t
                             WHERE t.contractor_id = c.id AND t.amount_cents > 0);

  has_active_plan := COALESCE(sub.status IN ('active','trialing'), false);

  IF c.user_id IS NOT NULL THEN
    SELECT (u.email_confirmed_at IS NOT NULL) INTO email_confirmed
      FROM auth.users u WHERE u.id = c.user_id;
    email_confirmed := COALESCE(email_confirmed, false);
    has_clara := EXISTS (SELECT 1 FROM public.alex_conversation_sessions s WHERE s.user_id = c.user_id);
  END IF;

  phone_confirmed := c.normalized_phone IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.contact_verification_queue q
       WHERE q.verification_status = 'verified'
         AND regexp_replace(COALESCE(q.phone,''), '\D', '', 'g') =
             regexp_replace(c.normalized_phone, '\D', '', 'g')
    );

  has_import := pr.id IS NOT NULL
    OR EXISTS (SELECT 1 FROM public.sniper_targets st WHERE st.contractor_id = c.id);

  is_test := COALESCE(pr.is_test_e2e, false)
    OR COALESCE(pr.source, '') = 'e2e_test'
    OR COALESCE(c.email, '') ILIKE 'e2e+%'
    OR COALESCE(c.business_name, '') ILIKE 'E2E %'
    OR COALESCE(c.business_name, '') ILIKE '%QA Test%';

  page_published := COALESCE(c.is_published, false)
    AND EXISTS (SELECT 1 FROM public.contractor_public_pages pp
                 WHERE pp.contractor_id = c.id AND pp.is_published = true);

  profile_complete := c.business_name IS NOT NULL AND c.specialty IS NOT NULL
    AND c.city IS NOT NULL AND c.phone IS NOT NULL AND c.email IS NOT NULL;

  activated := COALESCE(c.account_status, '') = 'active'
    AND COALESCE(c.activation_status, '') = 'active';

  -- Classement déterministe, du signal le plus probant au plus faible.
  IF is_test THEN
    origin_code := 'test_e2e';
  ELSIF has_payment THEN
    origin_code := 'stripe_paid';
  ELSIF has_admin_log OR COALESCE(last_led.source, '') = 'admin' THEN
    origin_code := 'manual_activation';
  ELSIF COALESCE(last_led.source, '') ILIKE '%sms%' OR COALESCE(pr.source, '') ILIKE '%sms%' THEN
    origin_code := 'sms_link';
  ELSIF has_import THEN
    origin_code := 'import_scraping';
  ELSIF has_clara THEN
    origin_code := 'clara';
  ELSIF c.user_id IS NOT NULL THEN
    origin_code := 'public_form';
  ELSE
    origin_code := 'unknown';
  END IF;

  source_exact := COALESCE(
    NULLIF(last_led.source, ''),
    NULLIF(pr.source, ''),
    NULLIF(fm.source, ''),
    NULLIF(sub.activation_source, ''),
    CASE WHEN has_admin_log THEN 'admin_activation_logs' END,
    'non enregistrée'
  );

  IF last_led.created_at IS NOT NULL
     AND (last_admin.created_at IS NULL OR last_led.created_at >= last_admin.created_at) THEN
    last_action_label := last_led.action;
    last_action_at := last_led.created_at;
    last_action_source := last_led.source;
  ELSIF last_admin.created_at IS NOT NULL THEN
    last_action_label := last_admin.action;
    last_action_at := last_admin.created_at;
    last_action_source := 'admin';
  ELSE
    last_action_label := NULL;
    last_action_at := c.updated_at;
    last_action_source := NULL;
  END IF;

  RETURN jsonb_build_object(
    'contractor_id', c.id,
    'origin_code', origin_code,
    'source_exact', source_exact,
    'created_at', c.created_at,
    'last_action', jsonb_build_object(
      'action', last_action_label,
      'at', last_action_at,
      'source', last_action_source
    ),
    'owner_user_id', c.user_id,
    'email_confirmed', email_confirmed,
    'phone_confirmed', phone_confirmed,
    'has_payment', has_payment,
    'has_active_plan', has_active_plan,
    'plan_id', sub.plan_id,
    'page_published', page_published,
    'public_status', c.public_status,
    'public_slug', c.slug,
    'profile_complete', profile_complete,
    'account_status', c.account_status,
    'activation_status', c.activation_status,
    'is_activated', activated,
    'admin_verified', COALESCE(c.admin_verified, false),
    'recommendation_eligible', COALESCE(c.public_status, '') = 'verified_active',
    'free_offer', CASE WHEN fm.id IS NULL THEN NULL ELSE jsonb_build_object(
      'offer_code', fm.offer_code,
      'label', '12 mois gratuits',
      'status', fm.status,
      'start', fm.founder_start,
      'end', fm.founder_end,
      'slot_number', fm.slot_number,
      'city', fm.city,
      'category_slug', fm.category_slug,
      'consent_received', (fm.attribution IS NOT NULL)
    ) END
  );
END $function$;

REVOKE ALL ON FUNCTION public.admin_get_contractor_account_origin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_contractor_account_origin(uuid) TO authenticated, service_role;