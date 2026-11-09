-- A) Voie invitée (prospect) dans la MÊME table de réservation : une seule session
-- payable par prospect canonique (table + id vérifiés côté serveur) et mode Stripe.
-- Le prospect lié à un entrepreneur existant passe par la voie entrepreneur
-- (reserve_contractor_checkout) : jamais deux Présences entre les deux voies.
ALTER TABLE public.contractor_checkout_reservations ALTER COLUMN contractor_id DROP NOT NULL;
ALTER TABLE public.contractor_checkout_reservations ADD COLUMN IF NOT EXISTS prospect_table text;
ALTER TABLE public.contractor_checkout_reservations ADD COLUMN IF NOT EXISTS prospect_id uuid;
ALTER TABLE public.contractor_checkout_reservations DROP CONSTRAINT IF EXISTS ckr_subject_chk;
ALTER TABLE public.contractor_checkout_reservations ADD CONSTRAINT ckr_subject_chk CHECK (
  (contractor_id IS NOT NULL AND prospect_id IS NULL AND prospect_table IS NULL)
  OR (contractor_id IS NULL AND prospect_id IS NOT NULL
      AND prospect_table IN ('verified_contractor_prospects', 'prospects')
      AND kind = 'entry_350' AND includes_presence));
CREATE UNIQUE INDEX IF NOT EXISTS uq_checkout_reservation_prospect_active
  ON public.contractor_checkout_reservations (prospect_table, prospect_id, stripe_mode) WHERE status IN ('reserved', 'open');

CREATE OR REPLACE FUNCTION public.reserve_prospect_checkout(
  _prospect_table text, _prospect_id uuid, _stripe_mode text, _fingerprint text, _ttl_seconds integer DEFAULT 3600)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  r public.contractor_checkout_reservations%ROWTYPE;
  v_new public.contractor_checkout_reservations%ROWTYPE;
  v_exists boolean;
BEGIN
  IF _prospect_id IS NULL OR _prospect_table NOT IN ('verified_contractor_prospects', 'prospects') OR _stripe_mode NOT IN ('live', 'test')
     OR _fingerprint IS NULL OR length(_fingerprint) NOT BETWEEN 16 AND 128 OR _ttl_seconds NOT BETWEEN 1800 AND 86400 THEN
    RAISE EXCEPTION 'invalid_reservation_request';
  END IF;
  IF _prospect_table = 'verified_contractor_prospects' THEN
    SELECT EXISTS (SELECT 1 FROM public.verified_contractor_prospects WHERE id = _prospect_id) INTO v_exists;
  ELSE
    SELECT EXISTS (SELECT 1 FROM public.prospects WHERE id = _prospect_id) INTO v_exists;
  END IF;
  IF NOT v_exists THEN RETURN jsonb_build_object('action', 'refuse', 'reason', 'prospect_identity_unverified'); END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('checkout_reservation_prospect:' || _prospect_table || ':' || _prospect_id::text || ':' || _stripe_mode, 0));

  -- Présence déjà payée (< 12 mois, même mode) par cette voie : jamais une deuxième.
  IF EXISTS (
    SELECT 1 FROM public.contractor_checkout_reservations p
    WHERE p.prospect_table = _prospect_table AND p.prospect_id = _prospect_id AND p.stripe_mode = _stripe_mode
      AND p.status = 'paid' AND p.updated_at > now() - interval '12 months'
      AND NOT EXISTS (SELECT 1 FROM public.contractor_activation_ledger d
                      WHERE d.action = 'deactivated' AND d.source = 'stripe_webhook'
                        AND d.metadata->>'stripe_session_id' = p.stripe_session_id)
  ) OR EXISTS (
    -- Paiements invités antérieurs à la réservation : session payée ET événement signé du même mode.
    SELECT 1 FROM public.billing_checkout_sessions b
    WHERE b.prospect_id = _prospect_id AND b.payment_status = 'paid'
      AND coalesce(b.paid_at, b.updated_at, b.created_at) > now() - interval '12 months'
      AND EXISTS (SELECT 1 FROM public.stripe_webhook_events e
                  WHERE coalesce(e.livemode, (e.payload->>'livemode')::boolean) = (_stripe_mode = 'live')
                    AND e.event_type IN ('checkout.session.completed', 'checkout.session.async_payment_succeeded')
                    AND e.payload->'data'->'object'->>'id' = b.stripe_checkout_session_id)
      AND NOT EXISTS (SELECT 1 FROM public.contractor_activation_ledger d
                      WHERE d.action = 'deactivated' AND d.source = 'stripe_webhook'
                        AND d.metadata->>'stripe_session_id' = b.stripe_checkout_session_id)
  ) THEN
    RETURN jsonb_build_object('action', 'refuse', 'reason', 'presence_payment_already_received');
  END IF;

  SELECT * INTO r FROM public.contractor_checkout_reservations
   WHERE prospect_table = _prospect_table AND prospect_id = _prospect_id AND stripe_mode = _stripe_mode AND status IN ('reserved', 'open')
   FOR UPDATE;
  IF FOUND THEN
    IF r.stripe_session_id IS NOT NULL THEN
      RETURN jsonb_build_object('action', 'verify_existing', 'reservation_id', r.id, 'stripe_session_id', r.stripe_session_id,
        'same_fingerprint', r.fingerprint = _fingerprint, 'idempotency_key', r.idempotency_key,
        'session_expires_at', extract(epoch FROM r.session_expires_at)::bigint);
    END IF;
    IF now() > r.session_expires_at + interval '10 minutes' THEN
      UPDATE public.contractor_checkout_reservations
         SET status = 'superseded', closed_reason = 'reserved_without_session_past_expiry', updated_at = now()
       WHERE id = r.id;
    ELSIF r.fingerprint = _fingerprint THEN
      RETURN jsonb_build_object('action', 'create', 'reservation_id', r.id, 'idempotency_key', r.idempotency_key,
        'session_expires_at', extract(epoch FROM r.session_expires_at)::bigint, 'retry', true);
    ELSE
      RETURN jsonb_build_object('action', 'busy',
        'reason', CASE WHEN r.created_at < now() - interval '2 minutes' THEN 'reconciliation_pending' ELSE 'in_flight' END,
        'retry_after', extract(epoch FROM (r.session_expires_at + interval '10 minutes'))::bigint);
    END IF;
  END IF;

  INSERT INTO public.contractor_checkout_reservations (contractor_id, prospect_table, prospect_id, stripe_mode, kind, includes_presence, quote_id, fingerprint, idempotency_key, session_expires_at)
  VALUES (NULL, _prospect_table, _prospect_id, _stripe_mode, 'entry_350', true, NULL, _fingerprint,
          'ckp_' || replace(gen_random_uuid()::text, '-', ''), now() + make_interval(secs => _ttl_seconds))
  RETURNING * INTO v_new;
  RETURN jsonb_build_object('action', 'create', 'reservation_id', v_new.id, 'idempotency_key', v_new.idempotency_key,
    'session_expires_at', extract(epoch FROM v_new.session_expires_at)::bigint, 'retry', false);
END;
$$;
REVOKE ALL ON FUNCTION public.reserve_prospect_checkout(text, uuid, text, text, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_prospect_checkout(text, uuid, text, text, integer) TO service_role;

-- B) Preuves des droits historiques en attente, SÉPARÉES par mode Stripe : seule une
-- preuve du même mode que le droit compte. Aucun nom, courriel ni téléphone; aucune
-- décision automatique (l'indice de nom de test n'est qu'une information).
DROP FUNCTION IF EXISTS public.admin_historical_presence_review_evidence();
CREATE FUNCTION public.admin_historical_presence_review_evidence()
RETURNS TABLE (
  contractor_id uuid, stripe_mode text, activation_status_at_rule text, is_published boolean,
  auth_user_exists boolean, synthetic_name_hint boolean,
  same_mode_paid_sessions bigint, other_mode_paid_sessions bigint, unknown_mode_paid_sessions bigint,
  same_mode_signed_paid_events bigint, other_mode_signed_paid_events bigint, same_mode_max_paid_amount_cents bigint,
  ledger_actions text, admin_activation_logs bigint, evidence_class text, checkout_impact text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'admin_required' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  WITH h AS (
    SELECT hr.contractor_id AS cid, hr.stripe_mode AS mode, hr.activation_status_at_rule::text AS st
    FROM public.contractor_historical_presence_rights hr WHERE hr.review_status = 'pending'
  ), ev AS (
    -- Événements Stripe payés rattachés à l'entrepreneur (colonne, métadonnée ou session du registre).
    SELECT h.cid, h.mode, coalesce(e.livemode, (e.payload->>'livemode')::boolean) AS livemode,
           NULLIF(e.payload->'data'->'object'->>'amount_total', '')::bigint AS amount
    FROM h JOIN public.stripe_webhook_events e
      ON e.event_type IN ('checkout.session.completed', 'checkout.session.async_payment_succeeded')
     AND e.payload->'data'->'object'->>'payment_status' = 'paid'
     AND (e.contractor_id = h.cid::text
          OR e.payload->'data'->'object'->'metadata'->>'contractor_id' = h.cid::text
          OR e.payload->'data'->'object'->>'id' IN (
               SELECT l.metadata->>'stripe_session_id' FROM public.contractor_activation_ledger l
               WHERE l.contractor_id = h.cid AND l.metadata ? 'stripe_session_id'))
  ), bs AS (
    -- Sessions payées : mode établi seulement par un événement signé de la même session
    -- (colonne livemode, sinon le livemode de l'événement Stripe enregistré).
    SELECT h.cid, h.mode,
      (SELECT bool_or(coalesce(e.livemode, (e.payload->>'livemode')::boolean)) FROM public.stripe_webhook_events e
        WHERE e.payload->'data'->'object'->>'id' = b.stripe_checkout_session_id) AS live
    FROM h JOIN public.billing_checkout_sessions b ON b.contractor_id = h.cid AND b.payment_status = 'paid'
  ), agg AS (
    SELECT h.cid, h.mode, h.st, c.is_published,
      EXISTS (SELECT 1 FROM auth.users u WHERE u.id = c.user_id) AS user_exists,
      coalesce(c.business_name ~* '(test|demo|qa|e2e|fixture|sample|exemple)' OR c.slug ~* '(test|demo|qa|e2e|fixture|sample)', false) AS synthetic,
      (SELECT count(*) FROM bs WHERE bs.cid = h.cid AND bs.mode = h.mode AND bs.live = (h.mode = 'live')) AS s_same,
      (SELECT count(*) FROM bs WHERE bs.cid = h.cid AND bs.mode = h.mode AND bs.live = (h.mode <> 'live')) AS s_other,
      (SELECT count(*) FROM bs WHERE bs.cid = h.cid AND bs.mode = h.mode AND bs.live IS NULL) AS s_unknown,
      (SELECT count(*) FROM ev WHERE ev.cid = h.cid AND ev.mode = h.mode AND ev.livemode = (h.mode = 'live')) AS e_same,
      (SELECT count(*) FROM ev WHERE ev.cid = h.cid AND ev.mode = h.mode AND ev.livemode IS DISTINCT FROM (h.mode = 'live')) AS e_other,
      (SELECT max(ev.amount) FROM ev WHERE ev.cid = h.cid AND ev.mode = h.mode AND ev.livemode = (h.mode = 'live')) AS max_same,
      (SELECT string_agg(DISTINCT l.action || '/' || coalesce(l.source, ''), ',') FROM public.contractor_activation_ledger l WHERE l.contractor_id = h.cid) AS ledger,
      (SELECT count(*) FROM public.admin_activation_logs a WHERE a.contractor_id = h.cid) AS admin_logs
    FROM h LEFT JOIN public.contractors c ON c.id = h.cid
  )
  SELECT agg.cid, agg.mode, agg.st, agg.is_published, agg.user_exists, agg.synthetic,
    agg.s_same, agg.s_other, agg.s_unknown, agg.e_same, agg.e_other, agg.max_same,
    agg.ledger, agg.admin_logs,
    CASE
      WHEN agg.e_same > 0 AND coalesce(agg.max_same, 0) >= 35000 THEN 'same_mode_paid_350_evidence'
      WHEN agg.e_same > 0 THEN 'same_mode_paid_other_amount'
      WHEN agg.e_other > 0 OR agg.s_other > 0 OR agg.s_unknown > 0 THEN 'other_or_unknown_mode_payment_only'
      WHEN coalesce(agg.is_published, false) THEN 'no_same_mode_payment_published'
      ELSE 'no_same_mode_payment_unpublished'
    END,
    'checkout_blocked_until_review'::text
  FROM agg
  ORDER BY agg.mode, agg.cid;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_historical_presence_review_evidence() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_historical_presence_review_evidence() TO authenticated, service_role;

-- C) Décision humaine limitée au mode Stripe du droit (la version sans mode n'est plus exposée aux clients).
CREATE OR REPLACE FUNCTION public.review_historical_presence_right(_contractor_id uuid, _stripe_mode text, _decision text, _reason text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'admin_required' USING ERRCODE = '42501';
  END IF;
  IF _stripe_mode NOT IN ('live', 'test') THEN RAISE EXCEPTION 'invalid_stripe_mode'; END IF;
  IF _decision NOT IN ('confirmed', 'rejected') THEN RAISE EXCEPTION 'invalid_decision'; END IF;
  IF length(coalesce(trim(_reason), '')) < 20 THEN RAISE EXCEPTION 'reason_too_short'; END IF;
  UPDATE public.contractor_historical_presence_rights
     SET review_status = _decision, reviewed_by = auth.uid(), reviewed_at = now(), review_reason = trim(_reason),
         provenance = CASE WHEN _decision = 'confirmed' AND provenance = 'unproven_activation_status' THEN 'admin_confirmed' ELSE provenance END
   WHERE contractor_id = _contractor_id AND stripe_mode = _stripe_mode AND review_status = 'pending';
  IF NOT FOUND THEN RAISE EXCEPTION 'no_pending_right'; END IF;
  RETURN jsonb_build_object('ok', true, 'review_status', _decision, 'stripe_mode', _stripe_mode);
END;
$$;
REVOKE ALL ON FUNCTION public.review_historical_presence_right(uuid, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_historical_presence_right(uuid, text, text, text) TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.review_historical_presence_right(uuid, text, text) FROM authenticated;