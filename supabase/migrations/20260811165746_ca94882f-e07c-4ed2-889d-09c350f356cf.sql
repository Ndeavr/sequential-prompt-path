-- ============================================================
-- CRM « À contacter manuellement » — extension minimale
-- ============================================================

CREATE TABLE public.crm_manual_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id uuid NOT NULL REFERENCES public.verified_contractor_prospects(id) ON DELETE CASCADE,
  affiliate_id uuid REFERENCES public.affiliates(id) ON DELETE SET NULL,
  owner_user_id uuid,
  queue text NOT NULL DEFAULT 'manual_contact',
  status text NOT NULL DEFAULT 'assigned',
  priority integer NOT NULL DEFAULT 0,
  next_action text,
  due_at timestamptz,
  attempts integer NOT NULL DEFAULT 0,
  last_outcome text,
  last_outcome_at timestamptz,
  objection text,
  assigned_by uuid,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT crm_manual_assignments_status_chk
    CHECK (status IN ('assigned','in_progress','closed_won','closed_lost')),
  CONSTRAINT crm_manual_assignments_owner_chk
    CHECK (affiliate_id IS NOT NULL OR owner_user_id IS NOT NULL)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_manual_assignments TO authenticated;
GRANT ALL ON public.crm_manual_assignments TO service_role;

ALTER TABLE public.crm_manual_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cma_admin_all" ON public.crm_manual_assignments
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "cma_owner_read" ON public.crm_manual_assignments
  FOR SELECT TO authenticated
  USING (owner_user_id = auth.uid() OR public.is_affiliate_owner(affiliate_id));

CREATE POLICY "cma_owner_update" ON public.crm_manual_assignments
  FOR UPDATE TO authenticated
  USING (owner_user_id = auth.uid() OR public.is_affiliate_owner(affiliate_id))
  WITH CHECK (owner_user_id = auth.uid() OR public.is_affiliate_owner(affiliate_id));

-- Un seul assignement ACTIF par prospect → pas de double assignation simultanée.
CREATE UNIQUE INDEX crm_manual_assignments_active_uniq
  ON public.crm_manual_assignments (prospect_id)
  WHERE status IN ('assigned','in_progress');

CREATE INDEX idx_cma_affiliate ON public.crm_manual_assignments (affiliate_id, status);
CREATE INDEX idx_cma_owner ON public.crm_manual_assignments (owner_user_id, status);
CREATE INDEX idx_cma_due ON public.crm_manual_assignments (due_at) WHERE status IN ('assigned','in_progress');

CREATE TRIGGER trg_cma_updated BEFORE UPDATE ON public.crm_manual_assignments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- Résultats de contact structurés
-- ============================================================

CREATE TABLE public.crm_contact_outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid REFERENCES public.crm_manual_assignments(id) ON DELETE CASCADE,
  prospect_id uuid NOT NULL REFERENCES public.verified_contractor_prospects(id) ON DELETE CASCADE,
  actor_id uuid,
  affiliate_id uuid REFERENCES public.affiliates(id) ON DELETE SET NULL,
  channel text NOT NULL DEFAULT 'call',
  outcome text NOT NULL,
  objection text,
  note text,
  next_action text,
  due_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT crm_outcome_channel_chk
    CHECK (channel IN ('call','sms','email','other')),
  CONSTRAINT crm_outcome_value_chk
    CHECK (outcome IN (
      'interested','follow_up','not_now','no_value_understanding','no_trust',
      'price_objection','wants_guaranteed_appointments','buys_leads_elsewhere',
      'checkout_issue','activated','not_interested','invalid_contact')),
  -- Tout résultat non terminal exige exactement une prochaine action + échéance.
  CONSTRAINT crm_outcome_next_action_chk CHECK (
    outcome IN ('activated','not_interested','invalid_contact')
    OR (next_action IS NOT NULL AND due_at IS NOT NULL)
  )
);

GRANT SELECT, INSERT ON public.crm_contact_outcomes TO authenticated;
GRANT ALL ON public.crm_contact_outcomes TO service_role;

ALTER TABLE public.crm_contact_outcomes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cco_admin_all" ON public.crm_contact_outcomes
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "cco_owner_read" ON public.crm_contact_outcomes
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.crm_manual_assignments a
    WHERE a.id = crm_contact_outcomes.assignment_id
      AND (a.owner_user_id = auth.uid() OR public.is_affiliate_owner(a.affiliate_id))
  ));

CREATE POLICY "cco_owner_write" ON public.crm_contact_outcomes
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.crm_manual_assignments a
    WHERE a.id = crm_contact_outcomes.assignment_id
      AND (a.owner_user_id = auth.uid() OR public.is_affiliate_owner(a.affiliate_id))
  ));

CREATE INDEX idx_cco_prospect ON public.crm_contact_outcomes (prospect_id, created_at DESC);
CREATE INDEX idx_cco_assignment ON public.crm_contact_outcomes (assignment_id, created_at DESC);

-- ============================================================
-- Synchronisation assignement ← résultat + attribution affilié
-- ============================================================

CREATE OR REPLACE FUNCTION public.crm_apply_contact_outcome()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_terminal boolean := NEW.outcome IN ('activated','not_interested','invalid_contact');
  v_aff uuid;
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

  -- Attribution de l'activation 1 $ à l'affilié via les structures existantes.
  IF NEW.outcome = 'activated' AND v_aff IS NOT NULL THEN
    INSERT INTO public.affiliate_conversions (affiliate_id, conversion_type, value_cents, status, metadata)
    VALUES (v_aff, 'plan_activated', 100, 'pending',
            jsonb_build_object('prospect_id', NEW.prospect_id, 'source', 'crm_manual_queue',
                               'assignment_id', NEW.assignment_id));
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_crm_apply_contact_outcome
  AFTER INSERT ON public.crm_contact_outcomes
  FOR EACH ROW EXECUTE FUNCTION public.crm_apply_contact_outcome();

-- ============================================================
-- Vues
-- ============================================================

CREATE VIEW public.v_manual_contact_queue
WITH (security_invoker = true) AS
SELECT
  n.*,
  a.id                AS assignment_id,
  a.affiliate_id,
  a.owner_user_id,
  a.status            AS assignment_status,
  a.priority          AS assignment_priority,
  a.next_action       AS assignment_next_action,
  a.due_at,
  a.attempts,
  a.last_outcome,
  a.last_outcome_at,
  a.objection,
  a.assigned_at,
  af.name             AS affiliate_name,
  (a.id IS NOT NULL AND a.due_at IS NOT NULL AND a.due_at < now()) AS is_overdue,
  (a.id IS NULL) AS is_unassigned,
  CASE
    WHEN n.phone_e164 IS NOT NULL AND NOT COALESCE(n.opted_out, false) THEN true
    ELSE false
  END AS can_sms,
  CASE
    WHEN n.email IS NOT NULL AND NOT COALESCE(n.opted_out, false) THEN true
    ELSE false
  END AS can_email,
  t.token AS activation_token
FROM public.v_crm_next_action n
LEFT JOIN public.crm_manual_assignments a
  ON a.prospect_id = n.prospect_id AND a.status IN ('assigned','in_progress')
LEFT JOIN public.affiliates af ON af.id = a.affiliate_id
LEFT JOIN LATERAL (
  SELECT vt.token FROM public.verified_prospect_tokens vt
  WHERE vt.prospect_id = n.prospect_id
  ORDER BY vt.created_at DESC LIMIT 1
) t ON true;

GRANT SELECT ON public.v_manual_contact_queue TO authenticated;

CREATE VIEW public.v_affiliate_workload
WITH (security_invoker = true) AS
SELECT
  af.id AS affiliate_id,
  af.name,
  af.primary_city,
  af.daily_quota,
  COUNT(a.id) FILTER (WHERE a.status IN ('assigned','in_progress')) AS active_assignments,
  COUNT(a.id) FILTER (WHERE a.status = 'assigned') AS not_started,
  COUNT(a.id) FILTER (WHERE a.status IN ('assigned','in_progress') AND a.due_at < now()) AS overdue,
  COUNT(a.id) FILTER (WHERE a.attempts > 0) AS contacted,
  COUNT(a.id) FILTER (WHERE a.status = 'closed_won') AS activations,
  COALESCE(SUM(a.attempts), 0) AS total_attempts
FROM public.affiliates af
LEFT JOIN public.crm_manual_assignments a ON a.affiliate_id = af.id
GROUP BY af.id, af.name, af.primary_city, af.daily_quota;

GRANT SELECT ON public.v_affiliate_workload TO authenticated;

-- ============================================================
-- Accès affilié : uniquement ses prospects assignés
-- ============================================================

CREATE OR REPLACE FUNCTION public.manual_queue_for_me()
RETURNS TABLE (
  assignment_id uuid,
  prospect_id uuid,
  business_name text,
  city text,
  category text,
  phone_e164 text,
  email text,
  website_url text,
  current_stage text,
  priority_score integer,
  activation_probability integer,
  estimated_value_cents integer,
  blocked_reason text,
  assignment_status text,
  next_action text,
  due_at timestamptz,
  attempts integer,
  last_outcome text,
  objection text,
  assigned_at timestamptz,
  opted_out boolean,
  activation_token text,
  is_overdue boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    a.id, n.prospect_id, n.business_name, n.city, n.category, n.phone_e164, n.email,
    n.website_url, n.current_stage, n.priority_score, n.activation_probability,
    n.estimated_value_cents, n.blocked_reason, a.status, a.next_action, a.due_at,
    a.attempts, a.last_outcome, a.objection, a.assigned_at, COALESCE(n.opted_out, false),
    (SELECT vt.token FROM public.verified_prospect_tokens vt
      WHERE vt.prospect_id = n.prospect_id ORDER BY vt.created_at DESC LIMIT 1),
    (a.due_at IS NOT NULL AND a.due_at < now())
  FROM public.crm_manual_assignments a
  JOIN public.v_crm_next_action n ON n.prospect_id = a.prospect_id
  WHERE a.status IN ('assigned','in_progress')
    AND (a.owner_user_id = auth.uid() OR public.is_affiliate_owner(a.affiliate_id))
  ORDER BY (a.due_at IS NOT NULL AND a.due_at < now()) DESC, a.priority DESC, n.priority_score DESC;
$$;

GRANT EXECUTE ON FUNCTION public.manual_queue_for_me() TO authenticated;
