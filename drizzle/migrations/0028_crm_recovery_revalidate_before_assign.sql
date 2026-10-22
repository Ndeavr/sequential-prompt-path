CREATE OR REPLACE FUNCTION public.route_crm_recovery_assignment(p_prospect_id uuid, p_affiliate_id uuid, p_priority integer DEFAULT 0, p_next_action text DEFAULT 'Vérifier la conformité avant tout contact'::text, p_due_at timestamp with time zone DEFAULT (now() + '24:00:00'::interval), p_idempotency_key text DEFAULT NULL::text, p_payload jsonb DEFAULT '{}'::jsonb, p_reason text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_assignment_id uuid;
  v_existing uuid;
  v_payload jsonb := COALESCE(p_payload, '{}'::jsonb);
  v_research_only boolean;
  v_next_action text;
BEGIN
  IF p_prospect_id IS NULL OR p_affiliate_id IS NULL THEN
    RETURN jsonb_build_object('status', 'invalid_input');
  END IF;

  v_research_only := COALESCE((v_payload -> 'contact_permissions' ->> 'research_only')::boolean, false);
  v_next_action := COALESCE(NULLIF(btrim(p_next_action), ''), 'Vérifier la conformité avant tout contact');
  IF v_research_only THEN
    v_next_action := 'Vérifier la conformité avant tout contact';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_prospect_id::text, 0));

  IF p_idempotency_key IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.crm_action_log WHERE idempotency_key = p_idempotency_key
  ) THEN
    RETURN jsonb_build_object('status', 'already_routed');
  END IF;

  -- Revalidation juste avant l'insertion : affilié actif, paiement, opt-out, ancien propriétaire.
  IF NOT EXISTS (
    SELECT 1 FROM public.affiliates a
    WHERE a.id = p_affiliate_id AND a.status = 'active' AND a.suspended_at IS NULL AND a.archived_at IS NULL
  ) THEN
    RETURN jsonb_build_object('status', 'affiliate_not_active');
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.unpro_payment_activation_audit pa
    WHERE pa.prospect_id = p_prospect_id AND pa.result = 'success'
  ) OR EXISTS (
    SELECT 1 FROM public.contractor_leads l
    WHERE l.source_prospect_id = p_prospect_id AND l.paid_at IS NOT NULL
  ) THEN
    RETURN jsonb_build_object('status', 'already_paid');
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.v_manual_contact_queue q
    WHERE q.prospect_id = p_prospect_id AND q.opted_out IS TRUE
  ) OR EXISTS (
    SELECT 1 FROM public.contractor_leads l
    WHERE l.source_prospect_id = p_prospect_id
      AND (l.do_not_contact IS TRUE OR l.unsubscribed_at IS NOT NULL)
  ) THEN
    RETURN jsonb_build_object('status', 'opted_out');
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.crm_manual_assignments m
    WHERE m.prospect_id = p_prospect_id AND m.affiliate_id IS NOT NULL AND m.affiliate_id <> p_affiliate_id
  ) OR EXISTS (
    SELECT 1 FROM public.contractor_leads l
    WHERE l.source_prospect_id = p_prospect_id
      AND COALESCE(l.assigned_affiliate_id, l.created_by_affiliate_id) IS NOT NULL
      AND COALESCE(l.assigned_affiliate_id, l.created_by_affiliate_id) <> p_affiliate_id
  ) THEN
    RETURN jsonb_build_object('status', 'prior_owner_exists');
  END IF;

  SELECT id INTO v_existing
  FROM public.crm_manual_assignments
  WHERE prospect_id = p_prospect_id
    AND status IN ('assigned', 'in_progress')
  LIMIT 1;

  IF v_existing IS NOT NULL THEN
    RETURN jsonb_build_object('status', 'already_assigned', 'assignment_id', v_existing);
  END IF;

  INSERT INTO public.crm_manual_assignments
    (prospect_id, affiliate_id, queue, status, priority, next_action, due_at)
  VALUES
    (p_prospect_id, p_affiliate_id, 'onboarding_recovery', 'assigned',
     COALESCE(p_priority, 0), v_next_action, p_due_at)
  RETURNING id INTO v_assignment_id;

  INSERT INTO public.crm_action_log
    (prospect_id, action, source, reason, result, status, idempotency_key, payload)
  VALUES
    (p_prospect_id, 'auto_recovery_assigned', 'automation',
     p_reason, 'assigned', 'done', p_idempotency_key,
     v_payload || jsonb_build_object(
       'assignment_id', v_assignment_id,
       'next_action', v_next_action,
       'research_only', v_research_only,
       'routing_score', (v_payload ->> 'routing_score'),
       'gate_evidence', COALESCE(v_payload -> 'evidence', '{}'::jsonb)
     ));

  RETURN jsonb_build_object('status', 'routed', 'assignment_id', v_assignment_id, 'next_action', v_next_action);
END;
$function$;