-- STAGED ONLY. Requires unpro-gold/migration.sql, verified backup/target preflight.
-- Extends existing GOLD + checkout reservations. No backfill, price change or release.
ALTER TABLE public.contractor_gold_config
 ADD COLUMN pioneer_status text NOT NULL DEFAULT 'draft' CHECK(pioneer_status IN ('draft','active','closed')),
 ADD COLUMN pioneer_checkout_ready boolean NOT NULL DEFAULT false,
 ADD COLUMN pioneer_closes_at timestamptz NOT NULL DEFAULT '2027-01-01 05:00:00+00';
ALTER TABLE public.contractor_gold_memberships ADD COLUMN pioneer_2026 boolean NOT NULL DEFAULT false;
ALTER TABLE public.contractor_checkout_reservations ADD COLUMN pioneer_member_number integer CHECK(pioneer_member_number BETWEEN 1 AND 1000);
CREATE UNIQUE INDEX pioneer_checkout_number_mode_idx ON public.contractor_checkout_reservations(stripe_mode,pioneer_member_number)
 WHERE pioneer_member_number IS NOT NULL AND status IN ('reserved','open','paid');

-- Historical badge readable after refund, only for a publicly verified company.
-- Keep a single policy per command/role; owner/admin conditions remain unchanged.
DROP POLICY gold_public ON public.contractor_gold_memberships;
DROP POLICY gold_owner_admin ON public.contractor_gold_memberships;
CREATE POLICY gold_public ON public.contractor_gold_memberships FOR SELECT TO anon USING (
 (status='active' OR pioneer_2026) AND EXISTS(SELECT 1 FROM public.contractors c WHERE c.id=contractor_id AND c.public_status='verified_active'));
CREATE POLICY gold_owner_admin ON public.contractor_gold_memberships FOR SELECT TO authenticated USING (
 ((status='active' OR pioneer_2026) AND EXISTS(SELECT 1 FROM public.contractors c WHERE c.id=contractor_id AND c.public_status='verified_active'))
 OR EXISTS(SELECT 1 FROM public.contractors c WHERE c.id=contractor_id AND c.user_id=(select auth.uid()))
 OR (select public.has_role((select auth.uid()),'admin')));

CREATE FUNCTION public.guard_pioneer_history() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF NEW.pioneer_2026 IS DISTINCT FROM OLD.pioneer_2026 THEN RAISE EXCEPTION 'pioneer_history_immutable'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER pioneer_history_immutable BEFORE UPDATE ON public.contractor_gold_memberships FOR EACH ROW EXECUTE FUNCTION public.guard_pioneer_history();

-- Service-only, after canonical reservation acquisition and BEFORE Stripe create.
-- Unknown Stripe state retains the slot. Existing settlement alone proves expiry.
CREATE FUNCTION public.reserve_pioneer_checkout(p_reservation_id uuid) RETURNS jsonb
 LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE cfg record; r record; n integer;
BEGIN
 PERFORM pg_advisory_xact_lock(746351,1);
 SELECT * INTO cfg FROM public.contractor_gold_config WHERE id=true;
 IF cfg.status IS DISTINCT FROM 'active' OR cfg.pioneer_status IS DISTINCT FROM 'active' OR NOT cfg.pioneer_checkout_ready
 THEN RETURN jsonb_build_object('ok',false,'code','pioneer_unavailable'); END IF;
 IF now() >= cfg.pioneer_closes_at THEN RETURN jsonb_build_object('ok',false,'code','pioneer_closed'); END IF;
 SELECT * INTO r FROM public.contractor_checkout_reservations WHERE id=p_reservation_id FOR UPDATE;
 IF r.id IS NULL OR r.kind<>'entry_350' OR NOT r.includes_presence OR r.quote_id IS NOT NULL
 OR r.status NOT IN ('reserved','open') OR r.session_expires_at<=now()
 THEN RETURN jsonb_build_object('ok',false,'code','pioneer_reservation_invalid'); END IF;
 IF NOT EXISTS(SELECT 1 FROM public.contractors c WHERE c.id=r.contractor_id AND c.public_status='verified_active')
 OR EXISTS(SELECT 1 FROM public.contractor_gold_memberships WHERE contractor_id=r.contractor_id)
 THEN RETURN jsonb_build_object('ok',false,'code','pioneer_eligibility_pending'); END IF;
 -- A session must expire by the cutoff; Stripe requires a 30-minute minimum.
 IF r.stripe_session_id IS NULL AND least(r.session_expires_at,cfg.pioneer_closes_at)<now()+interval '30 minutes'
 THEN RETURN jsonb_build_object('ok',false,'code','pioneer_window_too_short'); END IF;
 IF r.pioneer_member_number IS NOT NULL THEN n:=r.pioneer_member_number;
 ELSIF r.contractor_id=cfg.pilot_contractor_id AND NOT EXISTS(SELECT 1 FROM public.contractor_gold_memberships WHERE member_number=1)
 AND NOT EXISTS(SELECT 1 FROM public.contractor_checkout_reservations h WHERE h.pioneer_member_number=1 AND h.stripe_mode=r.stripe_mode AND h.status IN ('reserved','open','paid')) THEN
 n:=1;
 UPDATE public.contractor_checkout_reservations SET pioneer_member_number=n,session_expires_at=least(session_expires_at,cfg.pioneer_closes_at),updated_at=now() WHERE id=r.id;
 ELSE
 SELECT min(s) INTO n FROM generate_series(2,1000) s
 WHERE NOT EXISTS(SELECT 1 FROM public.contractor_gold_memberships m WHERE m.member_number=s)
 AND NOT EXISTS(SELECT 1 FROM public.contractor_checkout_reservations h WHERE h.pioneer_member_number=s AND h.stripe_mode=r.stripe_mode AND h.status IN ('reserved','open','paid'));
 IF n IS NULL THEN RETURN jsonb_build_object('ok',false,'code','pioneer_full'); END IF;
 UPDATE public.contractor_checkout_reservations SET pioneer_member_number=n,session_expires_at=least(session_expires_at,cfg.pioneer_closes_at),updated_at=now() WHERE id=r.id;
 END IF;
 RETURN jsonb_build_object('ok',true,'member_number',n,'expires_at',extract(epoch FROM least(r.session_expires_at,cfg.pioneer_closes_at))::bigint);
END $$;
REVOKE ALL ON FUNCTION public.reserve_pioneer_checkout(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_pioneer_checkout(uuid) TO service_role;
CREATE OR REPLACE FUNCTION public.sync_contractor_gold(p_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE c record; cfg record; paid record; revoked record; m record; n integer; hold record; pioneer boolean := false;
BEGIN
 PERFORM pg_advisory_xact_lock(746351,1);
 SELECT * INTO m FROM public.contractor_gold_memberships WHERE contractor_id=p_id FOR UPDATE;
 SELECT l.* INTO revoked FROM public.contractor_activation_ledger l
 JOIN public.stripe_webhook_events e ON e.stripe_event_id=l.metadata->>'stripe_event_id'
 WHERE l.contractor_id=p_id AND e.livemode=true
 AND e.event_type IN ('charge.refunded','charge.dispute.created')
 AND l.action='deactivated' AND l.source='stripe_webhook' AND l.metadata->>'livemode'='true'
 ORDER BY l.created_at LIMIT 1;
 IF revoked.id IS NOT NULL THEN
  IF m.contractor_id IS NOT NULL AND m.status='active' THEN
   UPDATE public.contractor_gold_memberships SET status='refunded',updated_at=now() WHERE contractor_id=p_id;
   INSERT INTO public.contractor_gold_events(contractor_id,member_number,status,source_ledger_id) VALUES(p_id,m.member_number,'refunded',revoked.id);
  END IF;
  RETURN;
 END IF;
 IF m.contractor_id IS NOT NULL THEN RETURN; END IF;
 SELECT * INTO cfg FROM public.contractor_gold_config WHERE id=true;
 IF cfg.status IS DISTINCT FROM 'active' THEN RETURN; END IF;
 SELECT * INTO c FROM public.contractors WHERE id=p_id;
 IF c.public_status IS DISTINCT FROM 'verified_active' OR c.account_status IS DISTINCT FROM 'active'
 OR c.activation_status NOT IN ('active','activated') OR c.activation_status IS NULL THEN RETURN; END IF;
 SELECT l.* INTO paid FROM public.contractor_activation_ledger l
 JOIN public.stripe_webhook_events e ON e.stripe_event_id=l.metadata->>'stripe_event_id'
 WHERE l.contractor_id=p_id AND l.action='entry_activation_350_paid' AND l.source='stripe_webhook'
 AND l.metadata->>'livemode'='true' AND e.livemode=true AND e.success=true AND e.processed_at IS NOT NULL
 AND e.event_type IN ('checkout.session.completed','checkout.session.async_payment_succeeded')
 AND e.payload #>> '{data,object,payment_status}'='paid'
 AND e.payload #>> '{data,object,currency}'='cad'
 AND e.payload #>> '{data,object,id}'=l.metadata->>'stripe_session_id'
 AND e.payload #>> '{data,object,metadata,contractor_id}'=p_id::text
 AND (e.payload #>> '{data,object,amount_total}')::bigint >= 35000
 AND (l.metadata->>'amount_cents')::bigint >= 35000
 AND coalesce(l.metadata->>'amount_discount_cents','0')='0'
 AND NOT EXISTS(SELECT 1 FROM public.contractor_activation_ledger dup WHERE dup.contractor_id=p_id
  AND dup.action='entry_activation_350_paid' AND dup.source='stripe_webhook' AND dup.metadata->>'livemode'='true'
  AND dup.metadata->>'stripe_session_id' IS DISTINCT FROM l.metadata->>'stripe_session_id')
 ORDER BY l.created_at LIMIT 1;
 IF paid.id IS NULL THEN RETURN; END IF;
 SELECT r.* INTO hold FROM public.contractor_checkout_reservations r
 JOIN public.stripe_webhook_events e ON e.stripe_event_id=paid.metadata->>'stripe_event_id'
 WHERE r.contractor_id=p_id AND r.stripe_mode='live' AND r.pioneer_member_number IS NOT NULL
 AND r.stripe_session_id=paid.metadata->>'stripe_session_id' AND r.status='paid'
 AND e.payload #>> '{data,object,metadata,pioneer_offer}'='pioneer_2026'
 AND e.payload #>> '{data,object,metadata,pioneer_member_number}'=r.pioneer_member_number::text
 AND e.payload #>> '{data,object,metadata,checkout_reservation_id}'=r.id::text
 AND e.payload #>> '{data,object,metadata,offer}'='entry_activation_350'
 AND e.payload #>> '{data,object,amount_subtotal}'='35000'
 AND e.payload #>> '{data,object,metadata,presence_ia_months}'='12'
 AND coalesce(e.payload #>> '{data,object,total_details,amount_discount}','0')='0'
 AND to_timestamp((e.payload->>'created')::double precision) < cfg.pioneer_closes_at;
 pioneer := hold.id IS NOT NULL;
 IF NOT pioneer AND cfg.pilot_contractor_id IS NULL THEN RETURN; END IF;
 IF pioneer THEN n:=hold.pioneer_member_number;
 ELSIF p_id=cfg.pilot_contractor_id THEN n:=1;
 ELSE SELECT min(s) INTO n FROM generate_series(2,1000) s
 WHERE NOT EXISTS(SELECT 1 FROM public.contractor_gold_memberships occupied WHERE occupied.member_number=s)
 AND NOT EXISTS(SELECT 1 FROM public.contractor_checkout_reservations r WHERE r.stripe_mode='live' AND r.pioneer_member_number=s AND r.status IN ('reserved','open','paid')); END IF;
 IF n IS NULL OR n>1000 THEN RETURN; END IF;
 INSERT INTO public.contractor_gold_memberships(contractor_id,member_number,status,joined_at,pioneer_2026) VALUES(p_id,n,'active',paid.created_at,pioneer);
 INSERT INTO public.contractor_gold_events(contractor_id,member_number,status,source_ledger_id) VALUES(p_id,n,'active',paid.id);
END $$;
-- Public aggregate only. TEST holds, refunds and reserved #1 are not sales.
CREATE OR REPLACE FUNCTION public.gold_availability() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT jsonb_build_object('status',status,
 'available',CASE WHEN status='active' AND pilot_contractor_id IS NOT NULL THEN
 1000-(SELECT count(*) FROM public.contractor_gold_memberships)-CASE WHEN EXISTS(SELECT 1 FROM public.contractor_gold_memberships WHERE member_number=1) THEN 0 ELSE 1 END
 -(SELECT count(*) FROM public.contractor_checkout_reservations h WHERE h.pioneer_member_number IS NOT NULL AND h.stripe_mode='live' AND h.status IN ('reserved','open','paid') AND NOT EXISTS(SELECT 1 FROM public.contractor_gold_memberships m WHERE m.member_number=h.pioneer_member_number)) ELSE NULL END,
 'pioneer_status',CASE WHEN now()>=pioneer_closes_at THEN 'closed' ELSE pioneer_status END,
 'checkout_supported',pioneer_checkout_ready AND pioneer_status='active' AND now()<pioneer_closes_at,
 'first_reserved',NOT EXISTS(SELECT 1 FROM public.contractor_gold_memberships WHERE member_number=1),
 'pioneer_available',CASE WHEN status='active' AND pioneer_status='active' AND pioneer_checkout_ready AND now()<pioneer_closes_at THEN
 (SELECT count(*) FROM generate_series(2,1000) s WHERE NOT EXISTS(SELECT 1 FROM public.contractor_gold_memberships m WHERE m.member_number=s)
 AND NOT EXISTS(SELECT 1 FROM public.contractor_checkout_reservations h WHERE h.pioneer_member_number=s AND h.stripe_mode='live' AND h.status IN ('reserved','open','paid'))) ELSE NULL END,
 'pioneer_next_number',CASE WHEN status='active' AND pioneer_status='active' AND pioneer_checkout_ready AND now()<pioneer_closes_at THEN
 (SELECT min(s) FROM generate_series(2,1000) s WHERE NOT EXISTS(SELECT 1 FROM public.contractor_gold_memberships m WHERE m.member_number=s)
 AND NOT EXISTS(SELECT 1 FROM public.contractor_checkout_reservations h WHERE h.pioneer_member_number=s AND h.stripe_mode='live' AND h.status IN ('reserved','open','paid'))) ELSE NULL END,
 'pioneer_sales',CASE WHEN status='active' AND pioneer_status='active' AND pioneer_checkout_ready THEN
 (SELECT count(*) FROM public.contractor_gold_memberships WHERE pioneer_2026 AND status='active') ELSE NULL END)
 FROM public.contractor_gold_config WHERE id=true
$$;
