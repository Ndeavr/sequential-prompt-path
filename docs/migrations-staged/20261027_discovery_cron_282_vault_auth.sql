-- STAGED ONLY. Do not execute from GitHub or while production gates are OFF.
-- Repairs EXISTING job 282, does not schedule another job and never stores
-- the secret value in cron.job.command, GitHub, logs or a literal SQL string.
-- Validate the Vault credential is truly for THIS backend before release.
DO $migration$
DECLARE
  old_job record;
BEGIN
  SELECT jobid, jobname, username, active
    INTO old_job FROM cron.job WHERE jobid = 282;
  IF NOT FOUND OR old_job.jobname IS DISTINCT FROM 'unpro-acquisition-discovery-6h'
     OR old_job.active IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'discovery_cron_mismatch';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM vault.secrets WHERE name = 'email_queue_service_role_key'
  ) THEN RAISE EXCEPTION 'discovery_service_secret_missing'; END IF;

  -- Alter only the existing command. The cron worker resolves the secure
  -- service key from Vault AT EXECUTION, never in this persisted SQL.
  -- Query has a double OFF switch: no network/provider request is queued
  -- until discovery and recruitment locks are independently enabled.
  PERFORM cron.alter_job(
    job_id => 282,
    command => $cmd$
      SELECT net.http_post(
        url := 'https://clmaqdnphbndvmmqvpff.supabase.co/functions/v1/acquisition-discovery-cycle',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'apikey', (SELECT decrypted_secret FROM vault.decrypted_secrets
                     WHERE name = 'email_queue_service_role_key'),
          'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets
                     WHERE name = 'email_queue_service_role_key')
        ),
        body := '{"trigger_source":"cron","dry_run":false,"max_searches":3}'::jsonb
      )
      WHERE (SELECT value FROM public.system_flags WHERE key = 'DISCOVERY_ENABLED') IS TRUE
        AND EXISTS (
          SELECT 1 FROM public.recruitment_controls
          WHERE global_enabled IS TRUE AND autonomous_enqueue_enabled IS TRUE
        );
    $cmd$
  );
END
$migration$;

-- Acceptance check after controlled release (read-only, NO secret values):
-- SELECT jobid,jobname,active,
--        position('vault.decrypted_secrets' in command::text)>0 as uses_vault,
--        position('Authorization' in command::text)>0 as has_bearer_header,
--        position('Bearer ' in command::text)>0 as bearer_prefix,
--        position('eyJ' in command::text)>0 as contains_literal_jwt
-- FROM cron.job WHERE jobid=282;
--
-- cron.job_run_details.succeeded means pg_net *enqueued* a request.
-- HTTP 401/403/5xx must be checked separately in net._http_response (with
-- independently correlated request IDs), never counted as provider success.
-- DO NOT flip global_enabled, autonomous_enqueue_enabled, DISCOVERY_ENABLED,
-- OUTREACH_ENABLED or run a live discovery request in this SQL.
