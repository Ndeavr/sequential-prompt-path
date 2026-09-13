CREATE OR REPLACE FUNCTION public.route_crm_recovery_assignment(
  p_prospect_id uuid,
  p_affiliate_id uuid,
  p_priority integer DEFAULT 0,
  p_next_action text DEFAULT 'Vérifier la conformité avant tout contact',
  p_due_at timestamptz DEFAULT (now() + interval '24 hours'),
  p_idempotency_key text DEFAULT NULL,
  p_payload jsonb DEFAULT '{}'::jsonb,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
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
$fn$;

REVOKE ALL ON FUNCTION public.route_crm_recovery_assignment(uuid, uuid, integer, text, timestamptz, text, jsonb, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.route_crm_recovery_assignment(uuid, uuid, integer, text, timestamptz, text, jsonb, text) TO service_role;

INSERT INTO public.optimization_rules (rule_key, rule_name, scope, is_active, config_json)
VALUES (
  'affiliate_incomplete_onboarding_recovery',
  'Reprise d''onboarding incomplet vers Mode Action affilié',
  'routing',
  false,
  jsonb_build_object(
    'version', 'v1',
    'inactivity_hours', 24,
    'fit_score_min', 70,
    'priority_score_min', 70,
    'max_candidates', 200,
    'learning', jsonb_build_object('min_sample', 30, 'min_terminal', 10, 'max_boost', 10),
    'crm_eligible_stages', jsonb_build_array('checkout_opened', 'otp_verified', 'registered'),
    'crm_future_stages', jsonb_build_array('landing_viewed', 'clicked', 'invited', 'not_started')
  )
)
ON CONFLICT (rule_key) DO UPDATE
SET rule_name = EXCLUDED.rule_name,
    scope = EXCLUDED.scope,
    config_json = public.optimization_rules.config_json || EXCLUDED.config_json,
    updated_at = now();

UPDATE public.optimization_rules
SET is_active = false
WHERE rule_key = 'affiliate_incomplete_onboarding_recovery';

INSERT INTO public.internal_job_tokens (job_key, token)
SELECT 'affiliate-onboarding-recovery', encode(gen_random_bytes(32), 'hex')
WHERE NOT EXISTS (
  SELECT 1 FROM public.internal_job_tokens WHERE job_key = 'affiliate-onboarding-recovery'
);

DO $cron$
DECLARE
  v_token text;
  v_job text;
BEGIN
  IF to_regclass('cron.job') IS NULL THEN
    RETURN;
  END IF;

  FOR v_job IN
    SELECT jobname FROM cron.job
    WHERE jobname IN (
      'affiliate-onboarding-recovery-hourly',
      'onboarding-self-heal',
      'onboarding-self-heal-hourly',
      'affiliate-onboarding-self-heal'
    )
  LOOP
    PERFORM cron.unschedule(v_job);
  END LOOP;

  SELECT token INTO v_token FROM public.internal_job_tokens
  WHERE job_key = 'affiliate-onboarding-recovery';

  IF v_token IS NULL THEN
    RETURN;
  END IF;

  PERFORM cron.schedule(
    'affiliate-onboarding-recovery-hourly',
    '17 * * * *',
    format($job$
      SELECT net.http_post(
        url := 'https://clmaqdnphbndvmmqvpff.supabase.co/functions/v1/affiliate-onboarding-recovery',
        headers := jsonb_build_object('Content-Type', 'application/json', 'x-internal-token', %L),
        body := jsonb_build_object('dry_run', false)
      );
    $job$, v_token)
  );
END;
$cron$;