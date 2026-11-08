-- A) Réservation d'achat : une réservation sans session rattachée n'est JAMAIS
-- remplacée sur simple délai court. Une session Stripe a pu être créée (plantage
-- entre création et rattachement) et rester payable jusqu'à `session_expires_at`,
-- l'échéance que la réservation impose à la session.
--  - même demande (empreinte identique) → même clé d'idempotence, à tout moment;
--  - autre demande → bloquée jusqu'à l'échéance + 10 min;
--  - après l'échéance + 10 min : toute session de cette réservation est expirée → remplacement sûr.
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

-- B) Revue des droits Présence historiques en attente : preuves canoniques seulement
-- (aucun nom, courriel ni téléphone). Admin seulement, aucune décision automatique.
CREATE OR REPLACE FUNCTION public.admin_historical_presence_review_evidence()
RETURNS TABLE (
  contractor_id uuid, stripe_mode text, activation_status_at_rule text, is_published boolean,
  auth_user_exists boolean, synthetic_name_pattern boolean, paid_checkout_sessions bigint,
  signed_paid_webhook_events bigint, max_paid_amount_cents bigint, ledger_actions text,
  admin_activation_logs bigint, evidence_class text)
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
    SELECT hr.contractor_id, hr.stripe_mode, hr.activation_status_at_rule::text AS st
    FROM public.contractor_historical_presence_rights hr WHERE hr.review_status = 'pending'
  ), sess AS (
    SELECT l.contractor_id, l.metadata->>'stripe_session_id' AS sid
    FROM public.contractor_activation_ledger l WHERE l.metadata ? 'stripe_session_id'
  ), ev AS (
    SELECT h.contractor_id, c.is_published,
      EXISTS (SELECT 1 FROM auth.users u WHERE u.id = c.user_id) AS user_exists,
      coalesce(c.business_name ~* '(test|demo|qa|e2e|fixture|sample|exemple)' OR c.slug ~* '(test|demo|qa|e2e|fixture|sample)', false) AS synthetic,
      (SELECT count(*) FROM public.billing_checkout_sessions b WHERE b.contractor_id = h.contractor_id AND b.payment_status = 'paid') AS paid_sessions,
      (SELECT count(*) FROM public.stripe_webhook_events e
        WHERE e.event_type IN ('checkout.session.completed', 'checkout.session.async_payment_succeeded')
          AND e.payload->'data'->'object'->>'payment_status' = 'paid'
          AND (e.contractor_id = h.contractor_id::text
               OR e.payload->'data'->'object'->'metadata'->>'contractor_id' = h.contractor_id::text
               OR e.payload->'data'->'object'->>'id' IN (SELECT s.sid FROM sess s WHERE s.contractor_id = h.contractor_id))) AS paid_events,
      (SELECT max(NULLIF(e.payload->'data'->'object'->>'amount_total', '')::bigint) FROM public.stripe_webhook_events e
        WHERE e.payload->'data'->'object'->>'payment_status' = 'paid'
          AND (e.contractor_id = h.contractor_id::text
               OR e.payload->'data'->'object'->'metadata'->>'contractor_id' = h.contractor_id::text
               OR e.payload->'data'->'object'->>'id' IN (SELECT s.sid FROM sess s WHERE s.contractor_id = h.contractor_id))) AS max_amount,
      (SELECT string_agg(DISTINCT l.action || '/' || coalesce(l.source, ''), ',') FROM public.contractor_activation_ledger l WHERE l.contractor_id = h.contractor_id) AS ledger,
      (SELECT count(*) FROM public.admin_activation_logs a WHERE a.contractor_id = h.contractor_id) AS admin_logs
    FROM h LEFT JOIN public.contractors c ON c.id = h.contractor_id
  )
  SELECT h.contractor_id, h.stripe_mode, h.st, ev.is_published, ev.user_exists, ev.synthetic,
    ev.paid_sessions, ev.paid_events, ev.max_amount, ev.ledger, ev.admin_logs,
    CASE
      WHEN ev.paid_events > 0 AND coalesce(ev.max_amount, 0) >= 35000 THEN 'paid_350_evidence'
      WHEN ev.paid_events > 0 THEN 'paid_other_amount_policy_decision'
      WHEN ev.synthetic THEN 'no_payment_synthetic_name'
      WHEN NOT coalesce(ev.is_published, false) AND ev.admin_logs = 0 AND ev.paid_sessions = 0 THEN 'no_payment_unpublished'
      ELSE 'no_payment_published_needs_review'
    END
  FROM h JOIN ev ON ev.contractor_id = h.contractor_id;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_historical_presence_review_evidence() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_historical_presence_review_evidence() TO authenticated, service_role;