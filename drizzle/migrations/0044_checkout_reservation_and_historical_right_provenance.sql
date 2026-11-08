-- A) Droits historiques Présence IA : provenance explicite, aucune exemption permanente inventée.
ALTER TABLE public.contractor_historical_presence_rights
  ADD COLUMN IF NOT EXISTS provenance text,
  ADD COLUMN IF NOT EXISTS stripe_mode text,
  ADD COLUMN IF NOT EXISTS review_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS reviewed_by uuid,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS review_reason text;

UPDATE public.contractor_historical_presence_rights h
SET provenance = CASE WHEN q.qa THEN 'qa_test_only' ELSE 'unproven_activation_status' END,
    stripe_mode = CASE WHEN q.qa THEN 'test' ELSE 'live' END,
    review_status = CASE WHEN q.qa THEN 'confirmed' ELSE 'pending' END,
    review_reason = CASE WHEN q.qa THEN 'Compte QA synthétique : droit valable en mode TEST seulement.' ELSE NULL END
FROM (
  SELECT h2.contractor_id,
         coalesce(bool_or(u.email ILIKE 'e2e+%@unpro.ca' OR (u.raw_user_meta_data->>'e2e_test') = 'true'), false) AS qa
  FROM public.contractor_historical_presence_rights h2
  LEFT JOIN public.contractors c ON c.id = h2.contractor_id
  LEFT JOIN auth.users u ON u.id = c.user_id
  GROUP BY h2.contractor_id
) q
WHERE q.contractor_id = h.contractor_id AND h.provenance IS NULL;

ALTER TABLE public.contractor_historical_presence_rights
  ADD CONSTRAINT chpr_provenance_chk CHECK (provenance IN ('qa_test_only', 'unproven_activation_status', 'admin_confirmed')),
  ADD CONSTRAINT chpr_mode_chk CHECK (stripe_mode IN ('live', 'test')),
  ADD CONSTRAINT chpr_review_chk CHECK (review_status IN ('pending', 'confirmed', 'rejected'));

-- Revue humaine : un administrateur, en son nom, avec une raison ≥ 20 caractères.
CREATE OR REPLACE FUNCTION public.review_historical_presence_right(_contractor_id uuid, _decision text, _reason text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'admin_required' USING ERRCODE = '42501';
  END IF;
  IF _decision NOT IN ('confirmed', 'rejected') THEN RAISE EXCEPTION 'invalid_decision'; END IF;
  IF length(coalesce(trim(_reason), '')) < 20 THEN RAISE EXCEPTION 'reason_too_short'; END IF;
  UPDATE public.contractor_historical_presence_rights
     SET review_status = _decision, reviewed_by = auth.uid(), reviewed_at = now(), review_reason = trim(_reason),
         provenance = CASE WHEN _decision = 'confirmed' AND provenance = 'unproven_activation_status' THEN 'admin_confirmed' ELSE provenance END
   WHERE contractor_id = _contractor_id AND review_status = 'pending';
  IF NOT FOUND THEN RAISE EXCEPTION 'no_pending_right'; END IF;
  RETURN jsonb_build_object('ok', true, 'review_status', _decision);
END;
$$;
REVOKE ALL ON FUNCTION public.review_historical_presence_right(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_historical_presence_right(uuid, text, text) TO authenticated, service_role;

-- Décision : abonnement historique seulement s'il est antérieur à la règle ET prouvé par un
-- événement Stripe signé du même mode; droit figé seulement s'il est confirmé (ou QA en TEST).
-- Un droit non prouvé n'est ni accordé ni retiré : la caisse est bloquée jusqu'à la revue.
CREATE OR REPLACE FUNCTION public.annual_presence_decision(_contractor_id uuid, _include_test boolean DEFAULT false)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  s jsonb := public.annual_presence_status(_contractor_id, _include_test);
  rule_at constant timestamptz := '2026-11-08 21:00:00+00';
  mode text := CASE WHEN _include_test THEN 'test' ELSE 'live' END;
BEGIN
  IF (s->>'valid')::boolean THEN
    RETURN jsonb_build_object('required', false, 'reason', 'valid_annual_presence', 'valid_until', s->'valid_until');
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.contractor_subscriptions cs
    WHERE cs.contractor_id = _contractor_id
      AND cs.status IN ('active', 'trialing', 'past_due')
      AND cs.created_at < rule_at
      AND cs.stripe_subscription_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.stripe_webhook_events e
        WHERE e.livemode = (mode = 'live')
          AND e.event_type IN ('checkout.session.completed', 'customer.subscription.created', 'customer.subscription.updated', 'invoice.paid')
          AND (e.payload->'data'->'object'->>'subscription' = cs.stripe_subscription_id
               OR e.payload->'data'->'object'->>'id' = cs.stripe_subscription_id)
      )
  ) THEN
    RETURN jsonb_build_object('required', false, 'reason', 'historical_subscription', 'valid_until', NULL);
  END IF;
  IF EXISTS (SELECT 1 FROM public.contractor_historical_presence_rights h
             WHERE h.contractor_id = _contractor_id AND h.review_status = 'confirmed' AND h.stripe_mode = mode) THEN
    RETURN jsonb_build_object('required', false, 'reason', 'historical_activation', 'valid_until', NULL);
  END IF;
  IF EXISTS (SELECT 1 FROM public.contractor_historical_presence_rights h
             WHERE h.contractor_id = _contractor_id AND h.review_status = 'pending' AND h.stripe_mode = mode)
     OR EXISTS (SELECT 1 FROM public.contractor_subscriptions cs
                WHERE cs.contractor_id = _contractor_id AND cs.status IN ('active', 'trialing', 'past_due') AND cs.created_at < rule_at) THEN
    RETURN jsonb_build_object('required', true, 'blocked', true, 'reason', 'historical_right_review_required', 'valid_until', NULL);
  END IF;
  RETURN jsonb_build_object('required', true, 'reason', CASE WHEN s->>'last_paid_at' IS NULL THEN 'annual_presence_required' ELSE 'annual_presence_expired' END,
    'valid_until', NULL, 'expired_at', s->'valid_until');
END;
$$;
REVOKE ALL ON FUNCTION public.annual_presence_decision(uuid, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.annual_presence_decision(uuid, boolean) TO service_role;

-- B) Réservation atomique d'achat : une seule session payable par entrepreneur et mode Stripe.
CREATE TABLE IF NOT EXISTS public.contractor_checkout_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid NOT NULL,
  stripe_mode text NOT NULL CHECK (stripe_mode IN ('live', 'test')),
  kind text NOT NULL CHECK (kind IN ('entry_350', 'combined_presence_plan', 'plan')),
  includes_presence boolean NOT NULL,
  quote_id text,
  fingerprint text NOT NULL CHECK (length(fingerprint) BETWEEN 16 AND 128),
  idempotency_key text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'reserved' CHECK (status IN ('reserved', 'open', 'paid', 'expired', 'superseded', 'failed')),
  stripe_session_id text UNIQUE,
  session_expires_at timestamptz NOT NULL,
  closed_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.contractor_checkout_reservations TO authenticated;
GRANT ALL ON public.contractor_checkout_reservations TO service_role;
ALTER TABLE public.contractor_checkout_reservations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read checkout reservations" ON public.contractor_checkout_reservations
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE UNIQUE INDEX IF NOT EXISTS uq_checkout_reservation_active
  ON public.contractor_checkout_reservations (contractor_id, stripe_mode) WHERE status IN ('reserved', 'open');
CREATE INDEX IF NOT EXISTS idx_checkout_reservation_presence_paid
  ON public.contractor_checkout_reservations (contractor_id, stripe_mode, updated_at) WHERE includes_presence AND status = 'paid';

CREATE OR REPLACE FUNCTION public.reserve_contractor_checkout(
  _contractor_id uuid, _stripe_mode text, _kind text, _includes_presence boolean,
  _quote_id text, _fingerprint text, _ttl_seconds integer DEFAULT 3600)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  r public.contractor_checkout_reservations%ROWTYPE;
  v_new public.contractor_checkout_reservations%ROWTYPE;
BEGIN
  IF _contractor_id IS NULL OR _stripe_mode NOT IN ('live', 'test') OR _kind NOT IN ('entry_350', 'combined_presence_plan', 'plan')
     OR _fingerprint IS NULL OR length(_fingerprint) NOT BETWEEN 16 AND 128 OR _ttl_seconds NOT BETWEEN 1800 AND 86400 THEN
    RAISE EXCEPTION 'invalid_reservation_request';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('checkout_reservation:' || _contractor_id::text || ':' || _stripe_mode, 0));

  IF _includes_presence THEN
    IF (public.annual_presence_status(_contractor_id, _stripe_mode = 'test')->>'valid')::boolean THEN
      RETURN jsonb_build_object('action', 'refuse', 'reason', 'annual_presence_still_valid');
    END IF;
    IF EXISTS (
      SELECT 1 FROM public.contractor_checkout_reservations p
      WHERE p.contractor_id = _contractor_id AND p.stripe_mode = _stripe_mode AND p.includes_presence
        AND p.status = 'paid' AND p.updated_at > now() - interval '12 months'
        AND NOT EXISTS (SELECT 1 FROM public.contractor_activation_ledger d
                        WHERE d.action = 'deactivated' AND d.source = 'stripe_webhook'
                          AND d.metadata->>'stripe_session_id' = p.stripe_session_id)
    ) THEN
      RETURN jsonb_build_object('action', 'refuse', 'reason', 'presence_payment_already_received');
    END IF;
  END IF;

  SELECT * INTO r FROM public.contractor_checkout_reservations
   WHERE contractor_id = _contractor_id AND stripe_mode = _stripe_mode AND status IN ('reserved', 'open')
   FOR UPDATE;
  IF FOUND THEN
    IF r.stripe_session_id IS NOT NULL THEN
      RETURN jsonb_build_object('action', 'verify_existing', 'reservation_id', r.id, 'stripe_session_id', r.stripe_session_id,
        'same_fingerprint', r.fingerprint = _fingerprint, 'idempotency_key', r.idempotency_key,
        'session_expires_at', extract(epoch FROM r.session_expires_at)::bigint);
    END IF;
    -- Aucune session rattachée : une session non rattachée n'a jamais été remise au client.
    IF r.created_at < now() - interval '2 minutes' THEN
      UPDATE public.contractor_checkout_reservations
         SET status = 'superseded', closed_reason = 'stale_reserved_without_session', updated_at = now()
       WHERE id = r.id;
    ELSIF r.fingerprint = _fingerprint THEN
      RETURN jsonb_build_object('action', 'create', 'reservation_id', r.id, 'idempotency_key', r.idempotency_key,
        'session_expires_at', extract(epoch FROM r.session_expires_at)::bigint, 'retry', true);
    ELSE
      RETURN jsonb_build_object('action', 'busy');
    END IF;
  END IF;

  INSERT INTO public.contractor_checkout_reservations (contractor_id, stripe_mode, kind, includes_presence, quote_id, fingerprint, idempotency_key, session_expires_at)
  VALUES (_contractor_id, _stripe_mode, _kind, _includes_presence, _quote_id, _fingerprint,
          'ckr_' || replace(gen_random_uuid()::text, '-', ''), now() + make_interval(secs => _ttl_seconds))
  RETURNING * INTO v_new;
  RETURN jsonb_build_object('action', 'create', 'reservation_id', v_new.id, 'idempotency_key', v_new.idempotency_key,
    'session_expires_at', extract(epoch FROM v_new.session_expires_at)::bigint, 'retry', false);
END;
$$;
REVOKE ALL ON FUNCTION public.reserve_contractor_checkout(uuid, text, text, boolean, text, text, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_contractor_checkout(uuid, text, text, boolean, text, text, integer) TO service_role;

-- Transitions : rattacher (reserved→open), fermer (→expired/superseded/failed, jamais depuis paid),
-- payé (webhook signé, prioritaire sur toute fermeture).
CREATE OR REPLACE FUNCTION public.settle_contractor_checkout(
  _reservation_id uuid, _status text, _stripe_session_id text, _reason text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  r public.contractor_checkout_reservations%ROWTYPE;
BEGIN
  IF _status NOT IN ('open', 'paid', 'expired', 'superseded', 'failed') THEN RAISE EXCEPTION 'invalid_status'; END IF;
  IF _reservation_id IS NOT NULL THEN
    SELECT * INTO r FROM public.contractor_checkout_reservations WHERE id = _reservation_id FOR UPDATE;
  ELSE
    SELECT * INTO r FROM public.contractor_checkout_reservations WHERE stripe_session_id = _stripe_session_id FOR UPDATE;
  END IF;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'not_found'); END IF;
  IF _stripe_session_id IS NOT NULL AND r.stripe_session_id IS NOT NULL AND r.stripe_session_id <> _stripe_session_id THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'session_mismatch');
  END IF;
  IF _status = 'open' THEN
    IF r.status = 'open' AND r.stripe_session_id = _stripe_session_id THEN RETURN jsonb_build_object('ok', true, 'status', 'open'); END IF;
    IF r.status <> 'reserved' OR _stripe_session_id IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'not_reserved'); END IF;
  ELSIF _status = 'paid' THEN
    IF r.status = 'paid' THEN RETURN jsonb_build_object('ok', true, 'status', 'paid'); END IF;
  ELSE
    IF r.status = 'paid' THEN RETURN jsonb_build_object('ok', false, 'reason', 'already_paid'); END IF;
    IF r.status NOT IN ('reserved', 'open') THEN RETURN jsonb_build_object('ok', true, 'status', r.status); END IF;
  END IF;
  UPDATE public.contractor_checkout_reservations
     SET status = _status, stripe_session_id = coalesce(r.stripe_session_id, _stripe_session_id),
         closed_reason = CASE WHEN _status IN ('expired', 'superseded', 'failed') THEN left(coalesce(_reason, _status), 120) ELSE closed_reason END,
         updated_at = now()
   WHERE id = r.id;
  RETURN jsonb_build_object('ok', true, 'status', _status);
END;
$$;
REVOKE ALL ON FUNCTION public.settle_contractor_checkout(uuid, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.settle_contractor_checkout(uuid, text, text, text) TO service_role;

-- C) Date d'inscription publique : seulement l'événement canonique, seulement pour une fiche publiée.
CREATE OR REPLACE FUNCTION public.get_contractor_public_registration(_slug text)
RETURNS timestamptz
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT c.unpro_registered_at
  FROM public.contractors c
  WHERE c.is_published = true
    AND (c.slug = _slug OR EXISTS (SELECT 1 FROM public.contractor_public_pages pp
                                   WHERE pp.contractor_id = c.id AND pp.slug = _slug AND pp.is_published = true))
  LIMIT 1
$$;
REVOKE ALL ON FUNCTION public.get_contractor_public_registration(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_contractor_public_registration(text) TO anon, authenticated, service_role;