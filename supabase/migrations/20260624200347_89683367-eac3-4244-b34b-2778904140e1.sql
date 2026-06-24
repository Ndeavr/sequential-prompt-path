
-- Provider webhook freshness (read-only view, security invoker)
CREATE OR REPLACE VIEW public.v_outreach_provider_health
WITH (security_invoker = true) AS
WITH last_email AS (
  SELECT max(greatest(coalesce(delivered_at, 'epoch'::timestamptz),
                      coalesce(opened_at,    'epoch'::timestamptz),
                      coalesce(clicked_at,   'epoch'::timestamptz),
                      coalesce(bounced_at,   'epoch'::timestamptz))) AS last_at
  FROM public.outreach_email_events
),
last_sms AS (
  SELECT max(greatest(coalesce(delivered_at, 'epoch'::timestamptz),
                      coalesce(failed_at,    'epoch'::timestamptz),
                      coalesce(replied_at,   'epoch'::timestamptz))) AS last_at
  FROM public.outreach_sms_events
),
last_click AS (
  SELECT max(clicked_at) AS last_at FROM public.outreach_click_events
),
last_stripe AS (
  SELECT max(updated_at) AS last_at FROM public.checkout_sessions
)
SELECT * FROM (
  SELECT 'resend_email'::text     AS provider, (SELECT last_at FROM last_email)  AS last_event_at UNION ALL
  SELECT 'twilio_sms'::text       AS provider, (SELECT last_at FROM last_sms)    AS last_event_at UNION ALL
  SELECT 'r_redirect_clicks'::text AS provider, (SELECT last_at FROM last_click) AS last_event_at UNION ALL
  SELECT 'stripe_checkouts'::text AS provider, (SELECT last_at FROM last_stripe) AS last_event_at
) s;

GRANT SELECT ON public.v_outreach_provider_health TO authenticated;

-- 7-stage funnel: extends prior funnel with onboarding/activated/paid pulled
-- from acquisition_events + checkout_sessions.
DROP VIEW IF EXISTS public.v_outreach_funnel_full;
CREATE VIEW public.v_outreach_funnel_full
WITH (security_invoker = true) AS
WITH email AS (
  SELECT coalesce(campaign_id, 'unknown') AS campaign_id, 'email'::text AS channel,
    count(*) FILTER (WHERE sent_at IS NOT NULL)      AS sent,
    count(*) FILTER (WHERE delivered_at IS NOT NULL) AS delivered,
    count(*) FILTER (WHERE opened_at IS NOT NULL)    AS opened,
    count(*) FILTER (WHERE clicked_at IS NOT NULL)   AS clicked,
    count(*) FILTER (WHERE replied_at IS NOT NULL)   AS replied,
    count(*) FILTER (WHERE bounced_at IS NOT NULL)   AS bounced
  FROM public.outreach_email_events
  GROUP BY 1
),
sms AS (
  SELECT coalesce(campaign_id, 'unknown') AS campaign_id, 'sms'::text AS channel,
    count(*) FILTER (WHERE sent_at IS NOT NULL OR status IN ('sent','queued','sending'))      AS sent,
    count(*) FILTER (WHERE delivered_at IS NOT NULL) AS delivered,
    0::bigint AS opened,
    count(*) FILTER (WHERE clicked_at IS NOT NULL)   AS clicked,
    count(*) FILTER (WHERE replied_at IS NOT NULL)   AS replied,
    count(*) FILTER (WHERE failed_at IS NOT NULL)    AS bounced
  FROM public.outreach_sms_events
  GROUP BY 1
),
base AS (SELECT * FROM email UNION ALL SELECT * FROM sms),
onboard AS (
  SELECT coalesce((metadata->>'campaign_id'), 'unknown') AS campaign_id,
         coalesce(channel, 'email') AS channel,
         count(*) FILTER (WHERE event_type IN ('onboarding_started','profile_completed','checkout_opened')) AS onboarding_started,
         count(*) FILTER (WHERE event_type IN ('activated','plan_activated'))                                AS activated,
         count(*) FILTER (WHERE event_type IN ('checkout_succeeded','paid','payment_succeeded'))             AS paid
  FROM public.acquisition_events
  WHERE occurred_at > now() - interval '90 days'
  GROUP BY 1, 2
)
SELECT
  b.campaign_id, b.channel,
  b.sent, b.delivered, b.opened, b.clicked, b.replied, b.bounced,
  coalesce(o.onboarding_started, 0) AS onboarding_started,
  coalesce(o.activated, 0)          AS activated,
  coalesce(o.paid, 0)               AS paid
FROM base b
LEFT JOIN onboard o ON o.campaign_id = b.campaign_id AND o.channel = b.channel
ORDER BY b.sent DESC;

GRANT SELECT ON public.v_outreach_funnel_full TO authenticated;

-- Auto-gating: when any required webhook is stale > 30 min OR last selftest
-- older than 24h, close the autopilot gate so no broadcast goes out blind.
CREATE OR REPLACE FUNCTION public.evaluate_outreach_gate()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  last_email_at timestamptz;
  last_sms_at   timestamptz;
  last_click_at timestamptz;
  last_pass_at  timestamptz;
  cutoff        timestamptz := now() - interval '30 minutes';
  pass_cutoff   timestamptz := now() - interval '24 hours';
  reasons       text[]      := ARRAY[]::text[];
  should_gate   boolean     := false;
BEGIN
  SELECT max(greatest(coalesce(delivered_at,'epoch'::timestamptz),
                      coalesce(opened_at,'epoch'::timestamptz),
                      coalesce(clicked_at,'epoch'::timestamptz),
                      coalesce(bounced_at,'epoch'::timestamptz)))
  INTO last_email_at FROM public.outreach_email_events;

  SELECT max(greatest(coalesce(delivered_at,'epoch'::timestamptz),
                      coalesce(failed_at,'epoch'::timestamptz),
                      coalesce(replied_at,'epoch'::timestamptz)))
  INTO last_sms_at FROM public.outreach_sms_events;

  SELECT max(clicked_at) INTO last_click_at FROM public.outreach_click_events;

  SELECT g.last_pass_at INTO last_pass_at
  FROM public.outreach_autopilot_gate g WHERE g.id = 1;

  -- Only flag a provider stale if we have SENT something through it recently.
  IF EXISTS (SELECT 1 FROM public.outreach_email_events WHERE sent_at > now() - interval '24 hours')
     AND (last_email_at IS NULL OR last_email_at < cutoff) THEN
    reasons := array_append(reasons, 'resend_webhook_stale');
    should_gate := true;
  END IF;

  IF EXISTS (SELECT 1 FROM public.outreach_sms_events WHERE sent_at > now() - interval '24 hours')
     AND (last_sms_at IS NULL OR last_sms_at < cutoff) THEN
    reasons := array_append(reasons, 'twilio_webhook_stale');
    should_gate := true;
  END IF;

  IF last_pass_at IS NULL OR last_pass_at < pass_cutoff THEN
    reasons := array_append(reasons, 'no_recent_selftest');
    should_gate := true;
  END IF;

  UPDATE public.outreach_autopilot_gate
     SET gated      = should_gate,
         reason     = CASE WHEN should_gate THEN array_to_string(reasons, ',') ELSE 'all_clear' END,
         updated_at = now()
   WHERE id = 1;

  RETURN jsonb_build_object(
    'gated', should_gate,
    'reasons', to_jsonb(reasons),
    'last_email_at', last_email_at,
    'last_sms_at', last_sms_at,
    'last_click_at', last_click_at,
    'last_pass_at', last_pass_at
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.evaluate_outreach_gate() TO authenticated, service_role;

-- Schedule it every 5 minutes via pg_cron
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'evaluate-outreach-gate-5m';
    PERFORM cron.schedule(
      'evaluate-outreach-gate-5m',
      '*/5 * * * *',
      $cron$ SELECT public.evaluate_outreach_gate(); $cron$
    );
  END IF;
END $$;
