-- ============================================================================
-- UNPRO — Canonical affiliate economics for the $350 CAD entry offer
-- Direct: 20% of pre-tax base ($70 on $350). Sub-affiliate override: 5% ($17.50).
-- Commission base is stored explicitly. Obsolete $1 CRM logic repaired.
-- ============================================================================

-- 1. Canonical direct rate: 20 (percent) everywhere --------------------------
ALTER TABLE public.affiliates ALTER COLUMN commission_rate SET DEFAULT 20.0;
ALTER TABLE public.affiliate_conversions ALTER COLUMN commission_rate SET DEFAULT 20.0;

-- Align existing affiliates stuck at the legacy 10.0 default (no historical
-- conversions exist, so no historical transaction data is affected).
UPDATE public.affiliates
SET commission_rate = 20.0, updated_at = now()
WHERE commission_rate = 10.0 AND COALESCE(commission_pct, 20) = 20;

-- 2. Explicit commission base on every conversion ----------------------------
ALTER TABLE public.affiliate_conversions
  ADD COLUMN IF NOT EXISTS commission_base_cents integer,
  ADD COLUMN IF NOT EXISTS commission_base_kind text NOT NULL DEFAULT 'pre_tax';

-- Backfill base for any pre-existing rows (currently zero rows; safe no-op).
UPDATE public.affiliate_conversions
SET commission_base_cents = value_cents
WHERE commission_base_cents IS NULL;

-- 3. track_affiliate_conversion — canonical rate (commission_pct, default 20),
--    explicit pre-tax base, correct revenue vs commission totals. -------------
CREATE OR REPLACE FUNCTION public.track_affiliate_conversion(p_user_id uuid, p_conversion_type text, p_value_cents integer DEFAULT 0)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_attr record;
  v_affiliate record;
  v_rate numeric;
  v_commission integer;
BEGIN
  SELECT * INTO v_attr FROM public.affiliate_attributions
  WHERE referred_user_id = p_user_id::text AND confirmation_status = 'confirmed'
  ORDER BY created_at DESC LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('tracked', false, 'reason', 'no_confirmed_attribution');
  END IF;

  SELECT * INTO v_affiliate FROM public.affiliates WHERE id::text = v_attr.referrer_user_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('tracked', false, 'reason', 'affiliate_not_found');
  END IF;

  -- Canonical rate: commission_pct (percent). Fallback 20 = canonical direct rate.
  v_rate := COALESCE(NULLIF(v_affiliate.commission_pct, 0), 20);
  v_commission := round(p_value_cents * v_rate / 100);

  INSERT INTO public.affiliate_conversions (
    affiliate_id, user_id, attribution_id, conversion_type, value_cents,
    commission_rate, commission_amount_cents,
    commission_base_cents, commission_base_kind
  ) VALUES (
    v_affiliate.id, p_user_id, v_attr.id, p_conversion_type, p_value_cents,
    v_rate, v_commission,
    p_value_cents, 'pre_tax'
  );

  UPDATE public.affiliates SET
    total_conversions = total_conversions + 1,
    total_revenue_cents = total_revenue_cents + p_value_cents,
    total_commissions_cents = total_commissions_cents + v_commission,
    updated_at = now()
  WHERE id = v_affiliate.id;

  RETURN jsonb_build_object('tracked', true, 'commission_cents', v_commission, 'rate', v_rate);
END;
$function$;

-- 4. Sub-affiliate override — unchanged 5% logic, now with explicit base. ----
CREATE OR REPLACE FUNCTION public.affiliate_apply_subaffiliate_override()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_parent uuid;
  v_pct numeric;
  v_amount integer;
BEGIN
  IF NEW.commission_kind <> 'direct' THEN
    RETURN NEW;
  END IF;

  SELECT a.parent_affiliate_id INTO v_parent
  FROM public.affiliates a
  WHERE a.id = NEW.affiliate_id;

  IF v_parent IS NULL THEN
    RETURN NEW;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.affiliates p WHERE p.id = v_parent AND p.status = 'active') THEN
    INSERT INTO public.affiliate_activities (affiliate_id, activity_type, outcome, note, metadata)
    VALUES (v_parent, 'subaffiliate_override_skipped', 'skipped', 'parent inactive',
            jsonb_build_object('source_conversion_id', NEW.id, 'selling_affiliate_id', NEW.affiliate_id));
    RETURN NEW;
  END IF;

  SELECT COALESCE(subaffiliate_override_pct, 5) INTO v_pct FROM public.affiliate_settings LIMIT 1;
  v_pct := COALESCE(v_pct, 5);
  -- Override base = the same explicit pre-tax base as the direct conversion.
  v_amount := round(COALESCE(NEW.commission_base_cents, NEW.value_cents, 0) * v_pct / 100.0);

  IF v_amount <= 0 THEN
    RETURN NEW;
  END IF;

  BEGIN
    INSERT INTO public.affiliate_conversions (
      affiliate_id, user_id, attribution_id, conversion_type, value_cents,
      commission_rate, commission_amount_cents, status,
      commission_kind, parent_of_affiliate_id, source_conversion_id,
      commission_base_cents, commission_base_kind, metadata
    ) VALUES (
      v_parent, NEW.user_id, NEW.attribution_id, NEW.conversion_type, NEW.value_cents,
      v_pct, v_amount, COALESCE(NEW.status, 'pending'),
      'subaffiliate_override', NEW.affiliate_id, NEW.id,
      COALESCE(NEW.commission_base_cents, NEW.value_cents), 'pre_tax',
      jsonb_build_object('source', 'subaffiliate_override_v1')
    );

    INSERT INTO public.affiliate_activities (affiliate_id, activity_type, outcome, note, metadata)
    VALUES (v_parent, 'subaffiliate_override_created', 'created', 'Commission équipe 5%',
            jsonb_build_object('source_conversion_id', NEW.id, 'selling_affiliate_id', NEW.affiliate_id,
                               'amount_cents', v_amount, 'rate', v_pct));
  EXCEPTION WHEN unique_violation THEN
    INSERT INTO public.affiliate_activities (affiliate_id, activity_type, outcome, note, metadata)
    VALUES (v_parent, 'subaffiliate_override_duplicate_prevented', 'skipped', 'duplicate prevented',
            jsonb_build_object('source_conversion_id', NEW.id));
  END;

  RETURN NEW;
END;
$function$;

-- 5. CRM manual-queue activation — repair obsolete $1 (100 cents, 0 commission)
--    to the canonical $350 pre-tax base with the 20% direct commission. --------
CREATE OR REPLACE FUNCTION public.crm_apply_contact_outcome()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_terminal boolean := NEW.outcome IN ('activated','not_interested','invalid_contact');
  v_aff uuid;
  v_rate numeric;
  v_base integer := 35000; -- canonical entry offer, pre-tax CAD cents
  v_commission integer;
BEGIN
  IF NEW.assignment_id IS NULL THEN
    RETURN NEW;
  END IF;

  UPDATE public.crm_manual_assignments a
     SET attempts = a.attempts + 1,
         last_outcome = NEW.outcome,
         last_outcome_at = NEW.created_at,
         objection = COALESCE(NEW.objection, a.objection),
         next_action = CASE WHEN v_terminal THEN NULL ELSE NEW.next_action END,
         due_at = CASE WHEN v_terminal THEN NULL ELSE NEW.due_at END,
         status = CASE
           WHEN NEW.outcome = 'activated' THEN 'closed_won'
           WHEN v_terminal THEN 'closed_lost'
           ELSE 'in_progress' END,
         closed_at = CASE WHEN v_terminal THEN now() ELSE NULL END
   WHERE a.id = NEW.assignment_id
   RETURNING a.affiliate_id INTO v_aff;

  -- Canonical $350 entry-pack attribution (replaces obsolete $1 logic).
  IF NEW.outcome = 'activated' AND v_aff IS NOT NULL THEN
    SELECT COALESCE(NULLIF(a.commission_pct, 0), 20) INTO v_rate
    FROM public.affiliates a WHERE a.id = v_aff;
    v_rate := COALESCE(v_rate, 20);
    v_commission := round(v_base * v_rate / 100);

    INSERT INTO public.affiliate_conversions (
      affiliate_id, conversion_type, value_cents, status,
      commission_rate, commission_amount_cents,
      commission_base_cents, commission_base_kind, metadata
    ) VALUES (
      v_aff, 'plan_activated', v_base, 'pending',
      v_rate, v_commission,
      v_base, 'pre_tax',
      jsonb_build_object('prospect_id', NEW.prospect_id, 'source', 'crm_manual_queue',
                         'assignment_id', NEW.assignment_id, 'offer', 'entry_pack_350')
    );
  END IF;

  RETURN NEW;
END;
$function$;

-- 6. record_affiliate_payment_conversion — called by the Stripe webhook when a
--    real payment lands. Idempotent per Stripe session. Resolves the affiliate
--    via explicit id, referral code, prospect lock, assignment, or confirmed
--    attribution. Direct 20% insert cascades the 5% override via trigger. -----
CREATE OR REPLACE FUNCTION public.record_affiliate_payment_conversion(
  p_prospect_id uuid DEFAULT NULL,
  p_contractor_id uuid DEFAULT NULL,
  p_user_id uuid DEFAULT NULL,
  p_amount_pretax_cents integer DEFAULT 35000,
  p_stripe_session_id text DEFAULT NULL,
  p_affiliate_id uuid DEFAULT NULL,
  p_referral_code text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_aff record;
  v_affiliate_id uuid;
  v_rate numeric;
  v_commission integer;
  v_existing uuid;
BEGIN
  IF p_amount_pretax_cents IS NULL OR p_amount_pretax_cents <= 0 THEN
    RETURN jsonb_build_object('recorded', false, 'reason', 'invalid_amount');
  END IF;

  -- Idempotency: one direct conversion per Stripe session.
  IF p_stripe_session_id IS NOT NULL THEN
    SELECT id INTO v_existing FROM public.affiliate_conversions
    WHERE commission_kind = 'direct'
      AND metadata->>'stripe_session_id' = p_stripe_session_id
    LIMIT 1;
    IF FOUND THEN
      RETURN jsonb_build_object('recorded', false, 'reason', 'already_recorded', 'conversion_id', v_existing);
    END IF;
  END IF;

  -- Resolution chain (best-effort, never blocks payment).
  v_affiliate_id := p_affiliate_id;

  IF v_affiliate_id IS NULL AND p_referral_code IS NOT NULL THEN
    SELECT id INTO v_affiliate_id FROM public.affiliates
    WHERE referral_code = p_referral_code AND status = 'active' LIMIT 1;
  END IF;

  IF v_affiliate_id IS NULL AND p_prospect_id IS NOT NULL THEN
    SELECT affiliate_id INTO v_affiliate_id FROM public.affiliate_prospect_locks
    WHERE lead_id = p_prospect_id AND expires_at > now()
    ORDER BY created_at DESC LIMIT 1;
  END IF;

  IF v_affiliate_id IS NULL AND p_prospect_id IS NOT NULL THEN
    SELECT affiliate_id INTO v_affiliate_id FROM public.affiliate_assignments
    WHERE prospect_id = p_prospect_id AND status <> 'lost'
    ORDER BY assigned_at DESC LIMIT 1;
  END IF;

  IF v_affiliate_id IS NULL AND p_user_id IS NOT NULL THEN
    SELECT a.id INTO v_affiliate_id
    FROM public.affiliate_attributions at
    JOIN public.affiliates a ON a.id::text = at.referrer_user_id::text
    WHERE at.referred_user_id = p_user_id AND at.confirmation_status = 'confirmed'
    ORDER BY at.created_at DESC LIMIT 1;
  END IF;

  IF v_affiliate_id IS NULL THEN
    RETURN jsonb_build_object('recorded', false, 'reason', 'no_affiliate');
  END IF;

  SELECT * INTO v_aff FROM public.affiliates WHERE id = v_affiliate_id AND status = 'active';
  IF NOT FOUND THEN
    RETURN jsonb_build_object('recorded', false, 'reason', 'affiliate_inactive');
  END IF;

  v_rate := COALESCE(NULLIF(v_aff.commission_pct, 0), 20);
  v_commission := round(p_amount_pretax_cents * v_rate / 100);

  INSERT INTO public.affiliate_conversions (
    affiliate_id, user_id, conversion_type, value_cents, status,
    commission_rate, commission_amount_cents,
    commission_base_cents, commission_base_kind, metadata
  ) VALUES (
    v_aff.id, p_user_id, 'payment', p_amount_pretax_cents, 'pending',
    v_rate, v_commission,
    p_amount_pretax_cents, 'pre_tax',
    jsonb_build_object(
      'stripe_session_id', p_stripe_session_id,
      'prospect_id', p_prospect_id,
      'contractor_id', p_contractor_id,
      'offer', 'entry_pack_350',
      'source', 'stripe_webhook'
    ) || COALESCE(p_metadata, '{}'::jsonb)
  );

  UPDATE public.affiliates SET
    total_conversions = total_conversions + 1,
    total_revenue_cents = total_revenue_cents + p_amount_pretax_cents,
    total_commissions_cents = total_commissions_cents + v_commission,
    updated_at = now()
  WHERE id = v_aff.id;

  RETURN jsonb_build_object('recorded', true, 'affiliate_id', v_aff.id,
                            'commission_cents', v_commission, 'rate', v_rate,
                            'base_cents', p_amount_pretax_cents);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.record_affiliate_payment_conversion(uuid, uuid, uuid, integer, text, uuid, text, jsonb) TO service_role;