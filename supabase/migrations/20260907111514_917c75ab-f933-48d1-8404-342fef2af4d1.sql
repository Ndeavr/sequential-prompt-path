CREATE OR REPLACE VIEW public.v_activation_step_funnel
WITH (security_invoker = true) AS
SELECT
  e.event_type AS step,
  count(DISTINCT coalesce(e.prospect_id::text, e.session_id::text)) AS unique_visitors,
  count(*) AS events,
  max(e.created_at AT TIME ZONE 'America/Toronto') AS last_seen_toronto
FROM public.contractor_funnel_events e
WHERE coalesce(e.is_test, false) = false
  AND e.event_type IN (
    'activation_link_opened','activation_page_rendered','activation_cta_clicked',
    'auth_started','otp_requested','otp_sent','otp_verified','account_created',
    'contractor_account_created','contractor_profile_created','profile_claimed',
    'onboarding_started','onboarding_completed','profile_activated'
  )
GROUP BY e.event_type;

CREATE OR REPLACE VIEW public.v_activation_errors
WITH (security_invoker = true) AS
SELECT
  coalesce(e.metadata ->> 'step_failed', e.step, 'unknown') AS failed_step,
  coalesce(e.metadata ->> 'code', 'unknown') AS error_code,
  count(*) AS occurrences,
  max(e.created_at AT TIME ZONE 'America/Toronto') AS last_seen_toronto
FROM public.contractor_funnel_events e
WHERE e.event_type = 'activation_error'
  AND coalesce(e.is_test, false) = false
GROUP BY 1, 2;

GRANT SELECT ON public.v_activation_step_funnel TO authenticated;
GRANT SELECT ON public.v_activation_errors TO authenticated;