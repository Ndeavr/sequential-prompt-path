
DELETE FROM public.platform_operation_outcomes WHERE created_at < now() - interval '30 days';
DELETE FROM public.launch_pipeline_events WHERE created_at < now() - interval '30 days';
DELETE FROM public.outbound_health_checks WHERE created_at < now() - interval '7 days';
DELETE FROM public.outreach_delivery_logs WHERE created_at < now() - interval '30 days';
DELETE FROM public.outreach_health_checks WHERE created_at < now() - interval '7 days';
DELETE FROM public.agent_runs WHERE created_at < now() - interval '30 days';
DELETE FROM public.automation_runs WHERE created_at < now() - interval '30 days';
DELETE FROM public.omega_loop_runs WHERE created_at < now() - interval '30 days';
DELETE FROM public.broken_link_events WHERE created_at < now() - interval '30 days';

DROP INDEX IF EXISTS public.idx_poo_operation_created;
DROP INDEX IF EXISTS public.idx_outbound_health_checks_mailbox;
DROP INDEX IF EXISTS public.idx_aom_lead;
DROP INDEX IF EXISTS public.idx_launch_events_lead;
DROP INDEX IF EXISTS public.idx_agent_runs_agent_started;

CREATE OR REPLACE FUNCTION public.nightly_log_retention()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM cron.job_run_details WHERE start_time < now() - interval '7 days';
  DELETE FROM public.platform_operation_outcomes WHERE created_at < now() - interval '30 days';
  DELETE FROM public.launch_pipeline_events WHERE created_at < now() - interval '30 days';
  DELETE FROM public.outbound_health_checks WHERE created_at < now() - interval '7 days';
  DELETE FROM public.outreach_delivery_logs WHERE created_at < now() - interval '30 days';
  DELETE FROM public.outreach_health_checks WHERE created_at < now() - interval '7 days';
  DELETE FROM public.agent_runs WHERE created_at < now() - interval '30 days';
  DELETE FROM public.automation_runs WHERE created_at < now() - interval '30 days';
  DELETE FROM public.omega_loop_runs WHERE created_at < now() - interval '30 days';
  DELETE FROM public.broken_link_events WHERE created_at < now() - interval '30 days';
END;
$$;

DO $$
BEGIN
  PERFORM cron.unschedule('nightly-log-retention');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule('nightly-log-retention','15 3 * * *',$$SELECT public.nightly_log_retention();$$);
