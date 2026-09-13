-- 1. Fonction atomique de routage (service_role uniquement)
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
  v_found boolean := false;
  v_existing int;
BEGIN
  SELECT assigned_affiliate_id, true INTO v_current, v_found
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

-- 2. Configuration de règle enrichie (aucune constante cachée dans le code)
UPDATE public.optimization_rules
SET config_json = config_json
      || jsonb_build_object(
           'crm_eligible_stages', jsonb_build_array('checkout_opened', 'otp_verified', 'registered'),
           'crm_future_stages', jsonb_build_array('landing_viewed', 'clicked', 'invited', 'not_started')
         ),
    updated_at = now()
WHERE rule_key = 'affiliate_incomplete_onboarding_recovery';

-- 3. Tâche horaire : jeton interne lu à l'exécution, jamais en clair dans le code
SELECT cron.unschedule('affiliate-onboarding-recovery-hourly')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'affiliate-onboarding-recovery-hourly');

SELECT cron.schedule(
  'affiliate-onboarding-recovery-hourly',
  '17 * * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://clmaqdnphbndvmmqvpff.supabase.co/functions/v1/affiliate-onboarding-recovery',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-internal-token', (SELECT token FROM public.internal_job_tokens WHERE job_key = 'affiliate_onboarding_recovery')
    ),
    body := jsonb_build_object('dry_run', false, 'source', 'cron')
  );
  $cron$
);

-- 4. Ancienne auto-réparation : désactivée (écrivait dans affiliate_assignments, système parallèle obsolète)
SELECT cron.unschedule('onboarding-self-heal-tick')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'onboarding-self-heal-tick');

INSERT INTO public.optimization_rules (rule_key, rule_name, scope, is_active, config_json)
VALUES (
  'legacy_onboarding_self_heal_disabled',
  'Gouvernance — onboarding-self-heal désactivé',
  'global',
  true,
  jsonb_build_object(
    'disabled_at', now(),
    'reason', 'Écrivait dans affiliate_assignments (système d''assignation parallèle non lu par le Mode Action). Remplacé par affiliate-onboarding-recovery.',
    'reactivate_with', 'cron.schedule(''onboarding-self-heal-tick'', ''0 * * * *'', ...)'
  )
)
ON CONFLICT (rule_key) DO UPDATE
SET config_json = EXCLUDED.config_json, is_active = true, updated_at = now();