
-- 1) Attribution CRM atomique (assignation + journal) sous verrou
CREATE OR REPLACE FUNCTION public.route_crm_recovery_assignment(
  p_prospect_id uuid,
  p_affiliate_id uuid,
  p_priority integer DEFAULT 0,
  p_next_action text DEFAULT 'Appeler',
  p_due_at timestamptz DEFAULT (now() + interval '24 hours'),
  p_idempotency_key text DEFAULT NULL,
  p_payload jsonb DEFAULT '{}'::jsonb,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_assignment_id uuid;
  v_existing uuid;
BEGIN
  IF p_prospect_id IS NULL OR p_affiliate_id IS NULL THEN
    RETURN jsonb_build_object('status', 'invalid_input');
  END IF;

  -- Verrou logique par prospect : deux exécutions concurrentes s'excluent.
  PERFORM pg_advisory_xact_lock(hashtextextended(p_prospect_id::text, 0));

  IF p_idempotency_key IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.crm_action_log WHERE idempotency_key = p_idempotency_key
  ) THEN
    RETURN jsonb_build_object('status', 'already_routed');
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
     COALESCE(p_priority, 0), p_next_action, p_due_at)
  RETURNING id INTO v_assignment_id;

  INSERT INTO public.crm_action_log
    (prospect_id, action, source, reason, result, status, idempotency_key, payload)
  VALUES
    (p_prospect_id, 'auto_recovery_assigned', 'verified_contractor_prospects',
     p_reason, 'assigned', 'done', p_idempotency_key,
     COALESCE(p_payload, '{}'::jsonb) || jsonb_build_object('assignment_id', v_assignment_id));

  RETURN jsonb_build_object('status', 'routed', 'assignment_id', v_assignment_id);
END;
$$;

REVOKE ALL ON FUNCTION public.route_crm_recovery_assignment(uuid, uuid, integer, text, timestamptz, text, jsonb, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.route_crm_recovery_assignment(uuid, uuid, integer, text, timestamptz, text, jsonb, text) TO service_role;

-- 2) Un dossier créé par un autre affilié n'est jamais réattribué automatiquement
CREATE OR REPLACE FUNCTION public.route_onboarding_recovery(
  p_lead_id uuid,
  p_affiliate_id uuid,
  p_payload jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_current uuid;
  v_creator uuid;
  v_found boolean := false;
  v_existing int;
BEGIN
  SELECT assigned_affiliate_id, created_by_affiliate_id, true
    INTO v_current, v_creator, v_found
  FROM public.contractor_leads
  WHERE id = p_lead_id
  FOR UPDATE;

  IF NOT COALESCE(v_found, false) THEN
    RETURN jsonb_build_object('status', 'not_found');
  END IF;

  SELECT count(*) INTO v_existing
  FROM public.affiliate_lead_events
  WHERE lead_id = p_lead_id AND event_type = 'onboarding_recovery_routed';

  IF v_existing > 0 THEN
    RETURN jsonb_build_object('status', 'already_routed');
  END IF;

  IF v_current IS NOT NULL THEN
    RETURN jsonb_build_object('status', 'already_owned', 'affiliate_id', v_current);
  END IF;

  IF v_creator IS NOT NULL AND v_creator <> p_affiliate_id THEN
    RETURN jsonb_build_object('status', 'owned_by_creator', 'affiliate_id', v_creator);
  END IF;

  UPDATE public.contractor_leads
  SET assigned_affiliate_id = p_affiliate_id
  WHERE id = p_lead_id;

  INSERT INTO public.affiliate_lead_events (affiliate_id, lead_id, event_type, payload)
  VALUES (p_affiliate_id, p_lead_id, 'onboarding_recovery_routed', COALESCE(p_payload, '{}'::jsonb));

  RETURN jsonb_build_object('status', 'routed', 'affiliate_id', p_affiliate_id);
END;
$$;

REVOKE ALL ON FUNCTION public.route_onboarding_recovery(uuid, uuid, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.route_onboarding_recovery(uuid, uuid, jsonb) TO service_role;
