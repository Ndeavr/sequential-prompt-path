-- Offre campagne /allume : 350 $ CA, 10 contrats garantis sur 12 mois.
-- Versions d'offre immuables, registre des garanties payées (écrit seulement
-- par le webhook Stripe signé via service_role), registre des contrats acceptés
-- par les deux parties et journal d'audit append-only. Aucune écriture client
-- directe : l'entrepreneur déclare par RPC, l'admin révise par RPC.

CREATE TABLE public.contractor_offer_versions (
  code text PRIMARY KEY CHECK (code ~ '^[a-z0-9_]{3,64}$'),
  label_fr text NOT NULL,
  base_amount_cents integer NOT NULL CHECK (base_amount_cents > 0),
  currency text NOT NULL DEFAULT 'cad' CHECK (currency = 'cad'),
  term_months integer NOT NULL CHECK (term_months > 0),
  guaranteed_contracts integer NOT NULL CHECK (guaranteed_contracts >= 0),
  refund_per_missing_cents integer NOT NULL CHECK (refund_per_missing_cents >= 0),
  refund_cap_cents integer NOT NULL CHECK (refund_cap_cents >= 0),
  auto_renew boolean NOT NULL DEFAULT false CHECK (auto_renew = false),
  terms_fr text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  retired_at timestamptz
);
GRANT SELECT ON public.contractor_offer_versions TO anon, authenticated;
GRANT ALL ON public.contractor_offer_versions TO service_role;
ALTER TABLE public.contractor_offer_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY offer_versions_read ON public.contractor_offer_versions FOR SELECT TO anon, authenticated USING (true);

CREATE FUNCTION public.contractor_offer_versions_immutable() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'offer_version_immutable'; END IF;
  IF (NEW.code, NEW.label_fr, NEW.base_amount_cents, NEW.currency, NEW.term_months, NEW.guaranteed_contracts,
      NEW.refund_per_missing_cents, NEW.refund_cap_cents, NEW.auto_renew, NEW.terms_fr, NEW.created_at)
     IS DISTINCT FROM (OLD.code, OLD.label_fr, OLD.base_amount_cents, OLD.currency, OLD.term_months, OLD.guaranteed_contracts,
      OLD.refund_per_missing_cents, OLD.refund_cap_cents, OLD.auto_renew, OLD.terms_fr, OLD.created_at)
     OR (OLD.is_active = false AND NEW.is_active = true) THEN
    RAISE EXCEPTION 'offer_version_immutable';
  END IF;
  IF NEW.is_active = false AND OLD.is_active = true THEN NEW.retired_at := now(); END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_offer_versions_immutable BEFORE UPDATE OR DELETE ON public.contractor_offer_versions
  FOR EACH ROW EXECUTE FUNCTION public.contractor_offer_versions_immutable();

INSERT INTO public.contractor_offer_versions
  (code, label_fr, base_amount_cents, term_months, guaranteed_contracts, refund_per_missing_cents, refund_cap_cents, auto_renew, terms_fr)
VALUES ('allume_350_10_contrats_v1', '350 $ : 10 contrats garantis', 35000, 12, 10, 3500, 35000, false,
  '350 $ CA avant taxes, payés une fois, pour 12 mois à partir du paiement confirmé. 10 contrats acceptés par vous et vos clients en 12 mois, pour les services et le territoire de votre profil. À l''échéance, 35 $ remboursés par contrat manquant (maximum 350 $), avec la part correspondante des taxes payées. Un rendez-vous, une demande de soumission, une soumission envoyée, un prospect ou une inscription ne comptent pas comme contrat. Aucun montant minimum de contrat. Aucun renouvellement automatique.');

CREATE TABLE public.contractor_contract_guarantees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid NOT NULL REFERENCES public.contractors(id) ON DELETE RESTRICT,
  offer_version_code text NOT NULL REFERENCES public.contractor_offer_versions(code),
  stripe_mode text NOT NULL CHECK (stripe_mode IN ('live', 'test')),
  stripe_session_id text NOT NULL UNIQUE,
  stripe_payment_intent text,
  stripe_event_id text,
  amount_subtotal_cents integer NOT NULL CHECK (amount_subtotal_cents > 0),
  amount_tax_cents integer NOT NULL DEFAULT 0 CHECK (amount_tax_cents >= 0),
  amount_total_cents integer NOT NULL CHECK (amount_total_cents > 0),
  guaranteed_contracts integer NOT NULL,
  refund_per_missing_cents integer NOT NULL,
  refund_cap_cents integer NOT NULL,
  paid_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'payment_review', 'refund_due', 'refund_recorded', 'closed_no_refund')),
  status_reason text,
  refund_recorded_cents integer CHECK (refund_recorded_cents IS NULL OR refund_recorded_cents >= 0),
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_at > paid_at)
);
CREATE INDEX idx_contract_guarantees_contractor ON public.contractor_contract_guarantees (contractor_id, stripe_mode, ends_at);
CREATE INDEX idx_contract_guarantees_pi ON public.contractor_contract_guarantees (stripe_payment_intent);
GRANT SELECT ON public.contractor_contract_guarantees TO authenticated;
GRANT ALL ON public.contractor_contract_guarantees TO service_role;
ALTER TABLE public.contractor_contract_guarantees ENABLE ROW LEVEL SECURITY;
CREATE POLICY contract_guarantees_read ON public.contractor_contract_guarantees FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM public.contractors c WHERE c.id = contractor_id AND c.user_id = auth.uid()));

CREATE TABLE public.contractor_guarantee_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guarantee_id uuid NOT NULL REFERENCES public.contractor_contract_guarantees(id) ON DELETE RESTRICT,
  contractor_id uuid NOT NULL REFERENCES public.contractors(id) ON DELETE RESTRICT,
  service_label text NOT NULL CHECK (char_length(btrim(service_label)) BETWEEN 2 AND 160),
  city text NOT NULL CHECK (char_length(btrim(city)) BETWEEN 2 AND 120),
  client_reference text NOT NULL CHECK (char_length(btrim(client_reference)) BETWEEN 2 AND 160),
  contract_reference text CHECK (contract_reference IS NULL OR char_length(contract_reference) <= 120),
  contractor_accepted_at timestamptz NOT NULL,
  contractor_accepted_by uuid NOT NULL,
  contractor_evidence_note text CHECK (contractor_evidence_note IS NULL OR char_length(contractor_evidence_note) <= 1000),
  client_accepted_at timestamptz,
  client_acceptance_method text CHECK (client_acceptance_method IS NULL OR client_acceptance_method IN ('signed_contract', 'written_confirmation', 'homeowner_account')),
  client_acceptance_evidence text CHECK (client_acceptance_evidence IS NULL OR char_length(client_acceptance_evidence) <= 1000),
  scope_matches boolean,
  status text NOT NULL DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'counted', 'not_counted')),
  cancellation_review_open boolean NOT NULL DEFAULT false,
  review_reason text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_guarantee_contracts_guarantee ON public.contractor_guarantee_contracts (guarantee_id, status);
GRANT SELECT ON public.contractor_guarantee_contracts TO authenticated;
GRANT ALL ON public.contractor_guarantee_contracts TO service_role;
ALTER TABLE public.contractor_guarantee_contracts ENABLE ROW LEVEL SECURITY;
CREATE POLICY guarantee_contracts_read ON public.contractor_guarantee_contracts FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM public.contractors c WHERE c.id = contractor_id AND c.user_id = auth.uid()));

-- Un contrat ne compte que s'il est accepté par les DEUX parties, prouvé et dans la période.
CREATE FUNCTION public.guarantee_contract_validate() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
DECLARE g public.contractor_contract_guarantees;
BEGIN
  SELECT * INTO g FROM public.contractor_contract_guarantees WHERE id = NEW.guarantee_id;
  IF g.id IS NULL OR g.contractor_id <> NEW.contractor_id THEN RAISE EXCEPTION 'guarantee_contractor_mismatch'; END IF;
  IF NEW.status = 'counted' THEN
    IF NEW.client_accepted_at IS NULL OR NEW.client_acceptance_method IS NULL
       OR char_length(btrim(coalesce(NEW.client_acceptance_evidence, ''))) < 10
       OR NEW.scope_matches IS DISTINCT FROM true
       OR NEW.client_accepted_at < g.paid_at OR NEW.client_accepted_at > least(g.ends_at, now())
       OR NEW.contractor_accepted_at < g.paid_at OR NEW.contractor_accepted_at > g.ends_at THEN
      RAISE EXCEPTION 'contract_not_countable';
    END IF;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER trg_guarantee_contract_validate BEFORE INSERT OR UPDATE ON public.contractor_guarantee_contracts
  FOR EACH ROW EXECUTE FUNCTION public.guarantee_contract_validate();

CREATE FUNCTION public.contract_guarantee_touch() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END $$;
CREATE TRIGGER trg_contract_guarantee_touch BEFORE UPDATE ON public.contractor_contract_guarantees
  FOR EACH ROW EXECUTE FUNCTION public.contract_guarantee_touch();

CREATE TABLE public.contractor_contract_guarantee_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guarantee_id uuid REFERENCES public.contractor_contract_guarantees(id) ON DELETE RESTRICT,
  contract_id uuid REFERENCES public.contractor_guarantee_contracts(id) ON DELETE RESTRICT,
  actor_id uuid,
  actor_kind text NOT NULL CHECK (actor_kind IN ('stripe_webhook', 'contractor', 'admin')),
  action text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_contract_guarantee_events_guarantee ON public.contractor_contract_guarantee_events (guarantee_id, created_at);
GRANT SELECT ON public.contractor_contract_guarantee_events TO authenticated;
GRANT ALL ON public.contractor_contract_guarantee_events TO service_role;
ALTER TABLE public.contractor_contract_guarantee_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY contract_guarantee_events_admin_read ON public.contractor_contract_guarantee_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE FUNCTION public.contract_guarantee_events_append_only() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN RAISE EXCEPTION 'contract_guarantee_events_append_only'; END $$;
CREATE TRIGGER trg_contract_guarantee_events_append_only BEFORE UPDATE OR DELETE ON public.contractor_contract_guarantee_events
  FOR EACH ROW EXECUTE FUNCTION public.contract_guarantee_events_append_only();

-- Base de remboursement : 35 $ × max(0, 10 − contrats comptés), plafonnée à 350 $.
CREATE FUNCTION public.contract_guarantee_refund_base_cents(p_counted integer, p_guaranteed integer, p_per_missing integer, p_cap integer)
RETURNS integer LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT LEAST(GREATEST(p_cap, 0), GREATEST(p_per_missing, 0) * GREATEST(0, p_guaranteed - GREATEST(coalesce(p_counted, 0), 0)))
$$;

-- Webhook signé seulement (service_role). Idempotent par session Stripe.
CREATE FUNCTION public.record_contract_guarantee_payment(
  p_contractor_id uuid, p_offer_version text, p_stripe_mode text, p_session_id text, p_payment_intent text,
  p_event_id text, p_subtotal_cents integer, p_tax_cents integer, p_total_cents integer, p_discount_cents integer, p_paid_at timestamptz)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v public.contractor_offer_versions; existing public.contractor_contract_guarantees; new_id uuid;
BEGIN
  IF p_stripe_mode NOT IN ('live', 'test') OR p_session_id IS NULL OR p_paid_at IS NULL THEN
    RETURN jsonb_build_object('status', 'refused', 'reason', 'invalid_input');
  END IF;
  SELECT * INTO v FROM public.contractor_offer_versions WHERE code = p_offer_version;
  IF v.code IS NULL THEN RETURN jsonb_build_object('status', 'refused', 'reason', 'unknown_offer_version'); END IF;
  IF p_subtotal_cents <> v.base_amount_cents OR coalesce(p_discount_cents, 0) <> 0 OR p_total_cents < p_subtotal_cents THEN
    RETURN jsonb_build_object('status', 'refused', 'reason', 'amount_mismatch');
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('contract_guarantee:' || p_contractor_id::text || ':' || p_stripe_mode, 0));
  SELECT * INTO existing FROM public.contractor_contract_guarantees WHERE stripe_session_id = p_session_id;
  IF existing.id IS NOT NULL THEN
    IF existing.contractor_id <> p_contractor_id THEN RAISE EXCEPTION 'guarantee_session_owner_mismatch'; END IF;
    RETURN jsonb_build_object('status', 'already_recorded', 'guarantee_id', existing.id);
  END IF;
  IF EXISTS (SELECT 1 FROM public.contractor_contract_guarantees
             WHERE contractor_id = p_contractor_id AND stripe_mode = p_stripe_mode
               AND status IN ('active', 'payment_review', 'refund_due') AND ends_at > p_paid_at) THEN
    RETURN jsonb_build_object('status', 'overlap');
  END IF;
  INSERT INTO public.contractor_contract_guarantees (contractor_id, offer_version_code, stripe_mode, stripe_session_id,
    stripe_payment_intent, stripe_event_id, amount_subtotal_cents, amount_tax_cents, amount_total_cents,
    guaranteed_contracts, refund_per_missing_cents, refund_cap_cents, paid_at, ends_at)
  VALUES (p_contractor_id, v.code, p_stripe_mode, p_session_id, p_payment_intent, p_event_id, p_subtotal_cents,
    coalesce(p_tax_cents, 0), p_total_cents, v.guaranteed_contracts, v.refund_per_missing_cents, v.refund_cap_cents,
    p_paid_at, p_paid_at + make_interval(months => v.term_months))
  RETURNING id INTO new_id;
  INSERT INTO public.contractor_contract_guarantee_events (guarantee_id, actor_kind, action, details)
  VALUES (new_id, 'stripe_webhook', 'payment_recorded', jsonb_build_object('stripe_session_id', p_session_id, 'stripe_event_id', p_event_id, 'stripe_mode', p_stripe_mode));
  RETURN jsonb_build_object('status', 'recorded', 'guarantee_id', new_id);
END $$;

-- Remboursement ou litige Stripe : jamais de suppression; revue admin et audit.
CREATE FUNCTION public.flag_contract_guarantee_payment_event(p_payment_intent text, p_event_id text, p_kind text, p_amount_refunded_cents integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE g public.contractor_contract_guarantees;
BEGIN
  IF p_kind NOT IN ('refunded', 'disputed') THEN RETURN jsonb_build_object('status', 'refused'); END IF;
  SELECT * INTO g FROM public.contractor_contract_guarantees WHERE stripe_payment_intent = p_payment_intent LIMIT 1;
  IF g.id IS NULL THEN RETURN jsonb_build_object('status', 'not_found'); END IF;
  IF EXISTS (SELECT 1 FROM public.contractor_contract_guarantee_events WHERE guarantee_id = g.id AND details->>'stripe_event_id' = p_event_id) THEN
    RETURN jsonb_build_object('status', 'already_processed', 'guarantee_id', g.id);
  END IF;
  -- Avant l'échéance (ou litige) : garantie suspendue en revue. Après une décision
  -- de remboursement dû : simple consignation, l'admin rapproche le montant.
  IF g.status IN ('active', 'payment_review') THEN
    UPDATE public.contractor_contract_guarantees SET status = 'payment_review', status_reason = 'stripe_' || p_kind WHERE id = g.id;
  END IF;
  INSERT INTO public.contractor_contract_guarantee_events (guarantee_id, actor_kind, action, details)
  VALUES (g.id, 'stripe_webhook', 'payment_' || p_kind, jsonb_build_object('stripe_event_id', p_event_id, 'amount_refunded_cents', p_amount_refunded_cents, 'prior_status', g.status));
  RETURN jsonb_build_object('status', 'flagged', 'guarantee_id', g.id);
END $$;

CREATE FUNCTION public.contract_guarantee_counts(p_guarantee_id uuid)
RETURNS TABLE (counted integer, pending integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT count(*) FILTER (WHERE status = 'counted')::integer, count(*) FILTER (WHERE status = 'pending_review')::integer
  FROM public.contractor_guarantee_contracts WHERE guarantee_id = p_guarantee_id
$$;

-- Solde visible par l'entrepreneur propriétaire seulement.
CREATE FUNCTION public.my_contract_guarantees()
RETURNS TABLE (guarantee_id uuid, offer_version_code text, label_fr text, terms_fr text, stripe_mode text, paid_at timestamptz,
  ends_at timestamptz, status text, guaranteed_contracts integer, counted_contracts integer, pending_contracts integer,
  missing_contracts integer, refund_base_cents integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT g.id, g.offer_version_code, v.label_fr, v.terms_fr, g.stripe_mode, g.paid_at, g.ends_at, g.status, g.guaranteed_contracts,
    c.counted, c.pending, GREATEST(0, g.guaranteed_contracts - c.counted),
    public.contract_guarantee_refund_base_cents(c.counted, g.guaranteed_contracts, g.refund_per_missing_cents, g.refund_cap_cents)
  FROM public.contractor_contract_guarantees g
  JOIN public.contractors ct ON ct.id = g.contractor_id AND ct.user_id = auth.uid()
  JOIN public.contractor_offer_versions v ON v.code = g.offer_version_code
  CROSS JOIN LATERAL public.contract_guarantee_counts(g.id) c
  ORDER BY g.paid_at DESC
$$;

-- Déclaration par l'entrepreneur : acceptation de son côté seulement; jamais comptée sans preuve client vérifiée.
CREATE FUNCTION public.declare_guarantee_contract(p_guarantee_id uuid, p_service_label text, p_city text, p_client_reference text,
  p_contract_reference text DEFAULT NULL, p_evidence_note text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE g public.contractor_contract_guarantees; new_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'auth_required'; END IF;
  SELECT g2.* INTO g FROM public.contractor_contract_guarantees g2
    JOIN public.contractors c ON c.id = g2.contractor_id AND c.user_id = auth.uid()
    WHERE g2.id = p_guarantee_id;
  IF g.id IS NULL THEN RAISE EXCEPTION 'guarantee_not_found'; END IF;
  IF g.status NOT IN ('active', 'payment_review') OR now() > g.ends_at THEN RAISE EXCEPTION 'guarantee_closed'; END IF;
  IF (SELECT count(*) FROM public.contractor_guarantee_contracts WHERE guarantee_id = g.id) >= 200 THEN RAISE EXCEPTION 'too_many_declarations'; END IF;
  INSERT INTO public.contractor_guarantee_contracts (guarantee_id, contractor_id, service_label, city, client_reference,
    contract_reference, contractor_accepted_at, contractor_accepted_by, contractor_evidence_note)
  VALUES (g.id, g.contractor_id, btrim(p_service_label), btrim(p_city), btrim(p_client_reference),
    nullif(btrim(coalesce(p_contract_reference, '')), ''), now(), auth.uid(), nullif(btrim(coalesce(p_evidence_note, '')), ''))
  RETURNING id INTO new_id;
  INSERT INTO public.contractor_contract_guarantee_events (guarantee_id, contract_id, actor_id, actor_kind, action)
  VALUES (g.id, new_id, auth.uid(), 'contractor', 'contract_declared');
  RETURN new_id;
END $$;

-- Revue admin : preuve d'acceptation client + concordance services/territoire.
CREATE FUNCTION public.admin_review_guarantee_contract(p_contract_id uuid, p_decision text, p_client_method text DEFAULT NULL,
  p_client_accepted_at timestamptz DEFAULT NULL, p_client_evidence text DEFAULT NULL, p_scope_matches boolean DEFAULT NULL, p_reason text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c public.contractor_guarantee_contracts;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'admin_required'; END IF;
  IF char_length(btrim(coalesce(p_reason, ''))) < 20 THEN RAISE EXCEPTION 'reason_required'; END IF;
  SELECT * INTO c FROM public.contractor_guarantee_contracts WHERE id = p_contract_id FOR UPDATE;
  IF c.id IS NULL THEN RAISE EXCEPTION 'contract_not_found'; END IF;
  IF p_decision = 'counted' THEN
    UPDATE public.contractor_guarantee_contracts SET status = 'counted', client_acceptance_method = p_client_method,
      client_accepted_at = p_client_accepted_at, client_acceptance_evidence = btrim(p_client_evidence), scope_matches = p_scope_matches,
      review_reason = btrim(p_reason), reviewed_by = auth.uid(), reviewed_at = now()
    WHERE id = c.id;
  ELSIF p_decision = 'not_counted' THEN
    UPDATE public.contractor_guarantee_contracts SET status = 'not_counted', review_reason = btrim(p_reason), reviewed_by = auth.uid(), reviewed_at = now(),
      cancellation_review_open = false WHERE id = c.id;
  ELSIF p_decision = 'open_cancellation_review' THEN
    UPDATE public.contractor_guarantee_contracts SET cancellation_review_open = true WHERE id = c.id;
  ELSIF p_decision = 'close_cancellation_review' THEN
    UPDATE public.contractor_guarantee_contracts SET cancellation_review_open = false WHERE id = c.id;
  ELSE RAISE EXCEPTION 'invalid_decision';
  END IF;
  INSERT INTO public.contractor_contract_guarantee_events (guarantee_id, contract_id, actor_id, actor_kind, action, details)
  VALUES (c.guarantee_id, c.id, auth.uid(), 'admin', 'contract_' || p_decision,
    jsonb_build_object('reason', btrim(p_reason), 'prior_status', c.status, 'client_method', p_client_method, 'scope_matches', p_scope_matches));
END $$;

CREATE FUNCTION public.admin_contract_guarantee_queue()
RETURNS TABLE (guarantee_id uuid, contractor_id uuid, business_name text, stripe_mode text, paid_at timestamptz, ends_at timestamptz,
  status text, status_reason text, guaranteed_contracts integer, counted_contracts integer, pending_contracts integer,
  refund_base_cents integer, refund_total_estimate_cents integer, amount_subtotal_cents integer, amount_total_cents integer,
  refund_recorded_cents integer, is_due boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'admin_required'; END IF;
  RETURN QUERY
  SELECT g.id, g.contractor_id, ct.business_name, g.stripe_mode, g.paid_at, g.ends_at, g.status, g.status_reason, g.guaranteed_contracts,
    c.counted, c.pending,
    public.contract_guarantee_refund_base_cents(c.counted, g.guaranteed_contracts, g.refund_per_missing_cents, g.refund_cap_cents),
    round(public.contract_guarantee_refund_base_cents(c.counted, g.guaranteed_contracts, g.refund_per_missing_cents, g.refund_cap_cents)::numeric
      * g.amount_total_cents / g.amount_subtotal_cents)::integer,
    g.amount_subtotal_cents, g.amount_total_cents, g.refund_recorded_cents, now() >= g.ends_at
  FROM public.contractor_contract_guarantees g
  JOIN public.contractors ct ON ct.id = g.contractor_id
  CROSS JOIN LATERAL public.contract_guarantee_counts(g.id) c
  ORDER BY (now() >= g.ends_at AND g.status IN ('active', 'refund_due')) DESC, g.ends_at;
END $$;

-- Statut de remboursement : décision humaine; aucun remboursement Stripe n'est déclenché ici.
CREATE FUNCTION public.admin_set_contract_guarantee_status(p_guarantee_id uuid, p_status text, p_refund_recorded_cents integer DEFAULT NULL, p_reason text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE g public.contractor_contract_guarantees; base integer; cnt integer;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'admin_required'; END IF;
  IF char_length(btrim(coalesce(p_reason, ''))) < 20 THEN RAISE EXCEPTION 'reason_required'; END IF;
  SELECT * INTO g FROM public.contractor_contract_guarantees WHERE id = p_guarantee_id FOR UPDATE;
  IF g.id IS NULL THEN RAISE EXCEPTION 'guarantee_not_found'; END IF;
  SELECT counted INTO cnt FROM public.contract_guarantee_counts(g.id);
  base := public.contract_guarantee_refund_base_cents(cnt, g.guaranteed_contracts, g.refund_per_missing_cents, g.refund_cap_cents);
  IF p_status IN ('refund_due', 'closed_no_refund') AND now() < g.ends_at THEN RAISE EXCEPTION 'guarantee_not_due'; END IF;
  IF p_status = 'refund_due' AND base = 0 THEN RAISE EXCEPTION 'no_refund_due'; END IF;
  IF p_status = 'closed_no_refund' AND base > 0 THEN RAISE EXCEPTION 'refund_due_not_closed'; END IF;
  IF p_status = 'refund_recorded' AND (g.status <> 'refund_due' OR coalesce(p_refund_recorded_cents, 0) <= 0) THEN RAISE EXCEPTION 'refund_record_invalid'; END IF;
  IF p_status = 'active' AND g.status <> 'payment_review' THEN RAISE EXCEPTION 'invalid_transition'; END IF;
  IF p_status NOT IN ('refund_due', 'closed_no_refund', 'refund_recorded', 'active') THEN RAISE EXCEPTION 'invalid_status'; END IF;
  UPDATE public.contractor_contract_guarantees SET status = p_status, status_reason = btrim(p_reason),
    refund_recorded_cents = CASE WHEN p_status = 'refund_recorded' THEN p_refund_recorded_cents ELSE refund_recorded_cents END,
    reviewed_by = auth.uid(), reviewed_at = now()
  WHERE id = g.id;
  INSERT INTO public.contractor_contract_guarantee_events (guarantee_id, actor_id, actor_kind, action, details)
  VALUES (g.id, auth.uid(), 'admin', 'status_' || p_status,
    jsonb_build_object('reason', btrim(p_reason), 'prior_status', g.status, 'refund_base_cents', base, 'counted', cnt, 'refund_recorded_cents', p_refund_recorded_cents));
END $$;

REVOKE ALL ON FUNCTION public.record_contract_guarantee_payment(uuid, text, text, text, text, text, integer, integer, integer, integer, timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.flag_contract_guarantee_payment_event(text, text, text, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.contract_guarantee_counts(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.my_contract_guarantees() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.declare_guarantee_contract(uuid, text, text, text, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_review_guarantee_contract(uuid, text, text, timestamptz, text, boolean, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_contract_guarantee_queue() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_set_contract_guarantee_status(uuid, text, integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_contract_guarantee_payment(uuid, text, text, text, text, text, integer, integer, integer, integer, timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.flag_contract_guarantee_payment_event(text, text, text, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.contract_guarantee_counts(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.my_contract_guarantees() TO authenticated;
GRANT EXECUTE ON FUNCTION public.declare_guarantee_contract(uuid, text, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_review_guarantee_contract(uuid, text, text, timestamptz, text, boolean, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_contract_guarantee_queue() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_contract_guarantee_status(uuid, text, integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.contract_guarantee_refund_base_cents(integer, integer, integer, integer) TO anon, authenticated, service_role;
