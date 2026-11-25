-- Staged only: apply through the migration tool after backup/target preflight.
-- No backfill. Pilot identity must be configured server-side before opening GOLD.
CREATE TABLE public.contractor_gold_config (
 id boolean PRIMARY KEY DEFAULT true CHECK (id),
 pilot_contractor_id uuid REFERENCES public.contractors(id),
 status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active')),
 renewal_protection jsonb NOT NULL DEFAULT '{"published":false,"months":36}',
 referral_terms jsonb NOT NULL DEFAULT '{"published":false}',
 benefit_release jsonb NOT NULL DEFAULT '{"early_access":false,"founder_highlighting":false,"feature_consultation":false,"strict_equal_matching_priority":false}',
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.contractor_gold_config TO authenticated;
GRANT ALL ON public.contractor_gold_config TO service_role;
ALTER TABLE public.contractor_gold_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY gold_config_admin ON public.contractor_gold_config FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
INSERT INTO public.contractor_gold_config(id) VALUES(true);

-- Public-safe columns only; payment evidence lives in the private audit.
CREATE TABLE public.contractor_gold_memberships (
 contractor_id uuid PRIMARY KEY REFERENCES public.contractors(id) ON DELETE RESTRICT,
 member_number integer UNIQUE NOT NULL CHECK (member_number BETWEEN 1 AND 1000),
 status text NOT NULL CHECK (status IN ('active','refunded')),
 joined_at timestamptz NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.contractor_gold_memberships TO anon, authenticated;
GRANT ALL ON public.contractor_gold_memberships TO service_role;
ALTER TABLE public.contractor_gold_memberships ENABLE ROW LEVEL SECURITY;
CREATE POLICY gold_public ON public.contractor_gold_memberships FOR SELECT TO anon, authenticated USING (
 status='active' AND EXISTS(SELECT 1 FROM public.contractors c WHERE c.id=contractor_id AND c.public_status='verified_active')
);
CREATE POLICY gold_owner_admin ON public.contractor_gold_memberships FOR SELECT TO authenticated USING (
 EXISTS(SELECT 1 FROM public.contractors c WHERE c.id=contractor_id AND c.user_id=auth.uid())
 OR public.has_role(auth.uid(),'admin')
);

CREATE TABLE public.contractor_gold_events (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 contractor_id uuid NOT NULL REFERENCES public.contractor_gold_memberships(contractor_id),
 member_number integer NOT NULL,
 status text NOT NULL CHECK(status IN ('active','refunded')),
 source_ledger_id uuid NOT NULL REFERENCES public.contractor_activation_ledger(id),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(contractor_id,status)
);
GRANT SELECT ON public.contractor_gold_events TO authenticated;
GRANT ALL ON public.contractor_gold_events TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.contractor_gold_events_id_seq TO service_role;
ALTER TABLE public.contractor_gold_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY gold_audit_admin ON public.contractor_gold_events FOR SELECT TO authenticated USING(public.has_role(auth.uid(),'admin'));
CREATE INDEX gold_events_ledger_idx ON public.contractor_gold_events(source_ledger_id);

CREATE FUNCTION public.guard_gold_immutable() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'gold_history_immutable'; END IF;
 IF TG_TABLE_NAME='contractor_gold_events' THEN RAISE EXCEPTION 'gold_audit_immutable'; END IF;
 IF NEW.contractor_id IS DISTINCT FROM OLD.contractor_id OR NEW.member_number IS DISTINCT FROM OLD.member_number
 OR NEW.joined_at IS DISTINCT FROM OLD.joined_at OR NEW.created_at IS DISTINCT FROM OLD.created_at
 OR OLD.status='refunded' THEN RAISE EXCEPTION 'gold_number_immutable'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER gold_immutable BEFORE UPDATE OR DELETE ON public.contractor_gold_memberships FOR EACH ROW EXECUTE FUNCTION public.guard_gold_immutable();
CREATE TRIGGER gold_audit_immutable BEFORE UPDATE OR DELETE ON public.contractor_gold_events FOR EACH ROW EXECUTE FUNCTION public.guard_gold_immutable();

-- Called by database triggers only: no browser RPC, no client amount or activation flag.
CREATE FUNCTION public.sync_contractor_gold(p_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE c record; cfg record; paid record; revoked record; m record; n integer;
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
 IF cfg.status IS DISTINCT FROM 'active' OR cfg.pilot_contractor_id IS NULL THEN RETURN; END IF;
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
 IF p_id=cfg.pilot_contractor_id THEN n:=1;
 ELSE SELECT min(s) INTO n FROM generate_series(2,1000) s
 WHERE NOT EXISTS(SELECT 1 FROM public.contractor_gold_memberships occupied WHERE occupied.member_number=s); END IF;
 IF n IS NULL OR n>1000 THEN RETURN; END IF;
 INSERT INTO public.contractor_gold_memberships(contractor_id,member_number,status,joined_at) VALUES(p_id,n,'active',paid.created_at);
 INSERT INTO public.contractor_gold_events(contractor_id,member_number,status,source_ledger_id) VALUES(p_id,n,'active',paid.id);
END $$;
REVOKE ALL ON FUNCTION public.sync_contractor_gold(uuid) FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.gold_existing_flow_trigger() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE cid uuid;
BEGIN
 IF TG_TABLE_NAME='contractors' THEN PERFORM public.sync_contractor_gold(NEW.id);
 ELSIF TG_TABLE_NAME='contractor_activation_ledger' THEN PERFORM public.sync_contractor_gold(NEW.contractor_id);
 ELSE
  FOR cid IN SELECT DISTINCT contractor_id FROM public.contractor_activation_ledger WHERE metadata->>'stripe_event_id'=NEW.stripe_event_id LOOP
   PERFORM public.sync_contractor_gold(cid);
  END LOOP;
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.gold_existing_flow_trigger() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER gold_on_activation AFTER UPDATE OF public_status,account_status,activation_status ON public.contractors FOR EACH ROW EXECUTE FUNCTION public.gold_existing_flow_trigger();
CREATE TRIGGER gold_on_ledger AFTER INSERT ON public.contractor_activation_ledger FOR EACH ROW EXECUTE FUNCTION public.gold_existing_flow_trigger();
CREATE TRIGGER gold_on_signed_success AFTER UPDATE OF success,processed_at ON public.stripe_webhook_events FOR EACH ROW WHEN(NEW.success=true AND NEW.processed_at IS NOT NULL) EXECUTE FUNCTION public.gold_existing_flow_trigger();

CREATE FUNCTION public.gold_availability() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT jsonb_build_object('status',status,'available',CASE WHEN status='active' AND pilot_contractor_id IS NOT NULL THEN
  1000-(SELECT count(*) FROM public.contractor_gold_memberships)-CASE WHEN EXISTS(SELECT 1 FROM public.contractor_gold_memberships WHERE member_number=1) THEN 0 ELSE 1 END
 ELSE NULL END) FROM public.contractor_gold_config WHERE id=true
$$;
REVOKE ALL ON FUNCTION public.gold_availability() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.gold_availability() TO anon,authenticated,service_role;
