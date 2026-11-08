-- Présence IA annuelle (350 $ + taxes par année) : statut canonique, renouvellements
-- manuels reconnus, achat combiné avec un forfait, droits historiques figés,
-- garde atomique anti-double 350 $ et date d'inscription d'entreprise.

-- 1) Droits historiques figés à l'entrée en vigueur de la règle annuelle.
CREATE TABLE IF NOT EXISTS public.contractor_historical_presence_rights (
  contractor_id uuid PRIMARY KEY,
  source text NOT NULL,
  activation_status_at_rule text NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.contractor_historical_presence_rights TO authenticated;
GRANT ALL ON public.contractor_historical_presence_rights TO service_role;
ALTER TABLE public.contractor_historical_presence_rights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read historical presence rights" ON public.contractor_historical_presence_rights
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.contractor_historical_presence_rights (contractor_id, source, activation_status_at_rule)
SELECT c.id, 'activation_status_snapshot', c.activation_status
FROM public.contractors c
WHERE c.activation_status IN ('activated', 'active')
  AND NOT EXISTS (
    SELECT 1 FROM public.contractor_activation_ledger l
    WHERE l.contractor_id = c.id AND l.action = 'entry_activation_350_paid'
  )
ON CONFLICT (contractor_id) DO NOTHING;

-- 2) Statut canonique : DERNIER paiement 350 $ signé, non annulé, de moins de 12 mois.
CREATE OR REPLACE FUNCTION public.annual_presence_status(_contractor_id uuid, _include_test boolean DEFAULT false)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH paid AS (
    SELECT l.created_at
    FROM public.contractor_activation_ledger l
    JOIN public.stripe_webhook_events e
      ON e.stripe_event_id = l.metadata->>'stripe_event_id'
     AND e.session_id = l.metadata->>'stripe_session_id'
    WHERE l.contractor_id = _contractor_id
      AND l.action = 'entry_activation_350_paid'
      AND l.source = 'stripe_webhook'
      AND (
        (e.livemode = true AND l.metadata->>'livemode' = 'true')
        OR (_include_test AND e.livemode = false AND l.metadata->>'livemode' = 'false')
      )
      AND e.event_type IN ('checkout.session.completed', 'checkout.session.async_payment_succeeded')
      AND e.payload->'data'->'object'->>'payment_status' = 'paid'
      AND lower(e.payload->'data'->'object'->>'currency') = 'cad'
      AND (
        (e.payload->'data'->'object'->'metadata'->>'offer' IN ('entry_activation_350', 'entry_pack_350')
          AND e.payload->'data'->'object'->>'amount_subtotal' = '35000')
        OR (e.payload->'data'->'object'->'metadata'->>'annual_presence' = 'included'
          AND e.payload->'data'->'object'->'metadata'->>'annual_presence_cents' = '35000'
          AND l.metadata->>'annual_presence_line_verified' = 'true')
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.contractor_activation_ledger r
        WHERE r.action = 'deactivated'
          AND r.source = 'stripe_webhook'
          AND r.metadata->>'stripe_session_id' = l.metadata->>'stripe_session_id'
      )
  )
  SELECT jsonb_build_object(
    'valid', coalesce(max(created_at) + interval '12 months' > now(), false),
    'last_paid_at', max(created_at),
    'valid_until', max(created_at) + interval '12 months'
  )
  FROM paid
$$;
REVOKE ALL ON FUNCTION public.annual_presence_status(uuid, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.annual_presence_status(uuid, boolean) TO service_role;

-- 3) Décision serveur : Présence valide, abonnement actif, droit historique figé, sinon 350 $ requis.
CREATE OR REPLACE FUNCTION public.annual_presence_decision(_contractor_id uuid, _include_test boolean DEFAULT false)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  s jsonb := public.annual_presence_status(_contractor_id, _include_test);
BEGIN
  IF (s->>'valid')::boolean THEN
    RETURN jsonb_build_object('required', false, 'reason', 'valid_annual_presence', 'valid_until', s->'valid_until');
  END IF;
  IF EXISTS (SELECT 1 FROM public.contractor_subscriptions cs
             WHERE cs.contractor_id = _contractor_id AND cs.status IN ('active', 'trialing', 'past_due')) THEN
    RETURN jsonb_build_object('required', false, 'reason', 'historical_subscription', 'valid_until', NULL);
  END IF;
  IF EXISTS (SELECT 1 FROM public.contractor_historical_presence_rights h WHERE h.contractor_id = _contractor_id) THEN
    RETURN jsonb_build_object('required', false, 'reason', 'historical_activation', 'valid_until', NULL);
  END IF;
  RETURN jsonb_build_object('required', true, 'reason', CASE WHEN s->>'last_paid_at' IS NULL THEN 'annual_presence_required' ELSE 'annual_presence_expired' END,
    'valid_until', NULL, 'expired_at', s->'valid_until');
END;
$$;
REVOKE ALL ON FUNCTION public.annual_presence_decision(uuid, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.annual_presence_decision(uuid, boolean) TO service_role;

-- 4) Lecture du propriétaire (affichage seulement; le paiement redécide côté serveur).
CREATE OR REPLACE FUNCTION public.my_annual_presence_decision()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.annual_presence_decision(c.id, false)
  FROM public.contractors c
  WHERE auth.uid() IS NOT NULL AND c.user_id = auth.uid()
  ORDER BY c.created_at DESC
  LIMIT 1
$$;
REVOKE ALL ON FUNCTION public.my_annual_presence_decision() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_annual_presence_decision() TO authenticated, service_role;

-- 5) contractor_plan_code : même source; un renouvellement manuel compte (dernier paiement valide).
CREATE OR REPLACE FUNCTION public.contractor_plan_code(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT coalesce(
    (
      SELECT public.canonical_plan_code(cs.plan_id)
      FROM public.contractors c
      JOIN public.contractor_subscriptions cs ON cs.contractor_id = c.id
      WHERE c.user_id = _user_id
        AND (auth.uid() IS NULL OR auth.uid() = _user_id OR public.has_role(auth.uid(), 'admin'))
        AND cs.status IN ('active', 'trialing', 'past_due')
      ORDER BY cs.updated_at DESC
      LIMIT 1
    ),
    (
      SELECT 'presence'::text
      FROM public.contractors c
      WHERE c.user_id = _user_id
        AND (auth.uid() IS NULL OR auth.uid() = _user_id OR public.has_role(auth.uid(), 'admin'))
        AND (public.annual_presence_status(c.id, false)->>'valid')::boolean
      LIMIT 1
    )
  )
$$;

-- 6) Garde atomique : jamais deux 350 $ couvrant la même période (même mode Stripe).
CREATE OR REPLACE FUNCTION public.guard_annual_presence_overlap()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.action <> 'entry_activation_350_paid' OR NEW.contractor_id IS NULL THEN
    RETURN NEW;
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('annual_presence:' || NEW.contractor_id::text, 0));
  IF EXISTS (
    SELECT 1 FROM public.contractor_activation_ledger l
    WHERE l.contractor_id = NEW.contractor_id
      AND l.action = 'entry_activation_350_paid'
      AND coalesce(l.metadata->>'livemode', '') = coalesce(NEW.metadata->>'livemode', '')
      AND l.metadata->>'stripe_session_id' IS DISTINCT FROM NEW.metadata->>'stripe_session_id'
      AND l.created_at + interval '12 months' > now()
      AND NOT EXISTS (
        SELECT 1 FROM public.contractor_activation_ledger r
        WHERE r.action = 'deactivated' AND r.source = 'stripe_webhook'
          AND r.metadata->>'stripe_session_id' = l.metadata->>'stripe_session_id'
      )
  ) THEN
    RAISE EXCEPTION 'annual_presence_still_valid' USING ERRCODE = 'unique_violation';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_guard_annual_presence_overlap ON public.contractor_activation_ledger;
CREATE TRIGGER trg_guard_annual_presence_overlap
  BEFORE INSERT ON public.contractor_activation_ledger
  FOR EACH ROW EXECUTE FUNCTION public.guard_annual_presence_overlap();

-- 7) Date d'inscription de l'ENTREPRISE sur UNPRO : premier lien à un compte propriétaire.
-- Jamais rétroactive (aucune date d'import, de migration ou de paiement), jamais modifiable par un client.
ALTER TABLE public.contractors ADD COLUMN IF NOT EXISTS unpro_registered_at timestamptz;

CREATE OR REPLACE FUNCTION public.set_contractor_unpro_registered_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.unpro_registered_at := CASE WHEN NEW.user_id IS NOT NULL THEN now() ELSE NULL END;
  ELSIF OLD.unpro_registered_at IS NOT NULL THEN
    NEW.unpro_registered_at := OLD.unpro_registered_at;
  ELSIF OLD.user_id IS NULL AND NEW.user_id IS NOT NULL THEN
    NEW.unpro_registered_at := now();
  ELSE
    NEW.unpro_registered_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_contractor_unpro_registered_at ON public.contractors;
CREATE TRIGGER trg_contractor_unpro_registered_at
  BEFORE INSERT OR UPDATE ON public.contractors
  FOR EACH ROW EXECUTE FUNCTION public.set_contractor_unpro_registered_at();