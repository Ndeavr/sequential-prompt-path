DELETE FROM public.internal_job_tokens
WHERE job_key = 'affiliate-onboarding-recovery'
  AND EXISTS (SELECT 1 FROM public.internal_job_tokens WHERE job_key = 'affiliate_onboarding_recovery');

INSERT INTO public.internal_job_tokens (job_key, token)
SELECT 'affiliate_onboarding_recovery', encode(gen_random_bytes(32), 'hex')
WHERE NOT EXISTS (
  SELECT 1 FROM public.internal_job_tokens WHERE job_key = 'affiliate_onboarding_recovery'
);

DO $cron$
DECLARE
  v_token text;
  v_job text;
BEGIN
  IF to_regclass('cron.job') IS NULL THEN RETURN; END IF;

  FOR v_job IN
    SELECT jobname FROM cron.job WHERE jobname IN (
      'affiliate-onboarding-recovery-hourly',
      'onboarding-self-heal', 'onboarding-self-heal-hourly', 'affiliate-onboarding-self-heal'
    )
  LOOP
    PERFORM cron.unschedule(v_job);
  END LOOP;

  SELECT token INTO v_token FROM public.internal_job_tokens
  WHERE job_key = 'affiliate_onboarding_recovery';
  IF v_token IS NULL THEN RETURN; END IF;

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

UPDATE public.optimization_rules SET is_active = false
WHERE rule_key = 'affiliate_incomplete_onboarding_recovery';