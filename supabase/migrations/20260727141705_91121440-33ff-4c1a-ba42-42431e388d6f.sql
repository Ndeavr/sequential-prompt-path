
DROP VIEW IF EXISTS public.v_first_dollar_tracker;

CREATE VIEW public.v_first_dollar_tracker
WITH (security_invoker = true)
AS
WITH sms_from_prospects AS (
  SELECT min(outreach_sent_at) AS min_at
  FROM public.verified_contractor_prospects
  WHERE outreach_sent_at IS NOT NULL
    AND outreach_twilio_sid IS NOT NULL
),
sms_from_logs AS (
  SELECT min(created_at) AS min_at
  FROM public.acq_sms_logs
  WHERE COALESCE(is_simulation, false) = false
    AND status = ANY (ARRAY['sent','queued','delivered'])
    AND provider_message_id IS NOT NULL
),
sms_first AS (
  SELECT LEAST(
    COALESCE((SELECT min_at FROM sms_from_prospects), 'infinity'::timestamptz),
    COALESCE((SELECT min_at FROM sms_from_logs),      'infinity'::timestamptz)
  ) AS at
),
run AS (
  SELECT NULLIF((SELECT at FROM sms_first), 'infinity'::timestamptz) AS started_at
),
delivery_first AS (
  SELECT min(outreach_delivered_at) AS at
  FROM public.verified_contractor_prospects, run
  WHERE outreach_delivered_at IS NOT NULL
    AND (run.started_at IS NULL OR outreach_delivered_at >= run.started_at)
),
click_first AS (
  SELECT LEAST(
    COALESCE((SELECT min(outreach_clicked_at)
              FROM public.verified_contractor_prospects, run
              WHERE outreach_clicked_at IS NOT NULL
                AND (run.started_at IS NULL OR outreach_clicked_at >= run.started_at)),
             'infinity'::timestamptz),
    COALESCE((SELECT min(ce.created_at)
              FROM public.click_events ce, run
              WHERE run.started_at IS NOT NULL
                AND ce.created_at >= run.started_at),
             'infinity'::timestamptz)
  ) AS at_raw
),
click_first_clean AS (
  SELECT NULLIF((SELECT at_raw FROM click_first), 'infinity'::timestamptz) AS at
),
activation_first AS (
  SELECT min(cl.created_at) AS at
  FROM public.contractor_leads cl, run
  WHERE cl.onboarding_started_at IS NOT NULL
    AND run.started_at IS NOT NULL
    AND cl.onboarding_started_at >= run.started_at
),
paid_first AS (
  SELECT LEAST(
    COALESCE((SELECT min(created_at) FROM public.acq_payment_events pe, run
              WHERE run.started_at IS NOT NULL AND pe.created_at >= run.started_at),
             'infinity'::timestamptz),
    COALESCE((SELECT min(paid_at) FROM public.contractor_leads cl, run
              WHERE cl.paid_at IS NOT NULL
                AND run.started_at IS NOT NULL AND cl.paid_at >= run.started_at),
             'infinity'::timestamptz),
    COALESCE((SELECT min(paid_at) FROM public.contractor_recruitment_payments crp, run
              WHERE (crp.payment_status = ANY (ARRAY['paid','succeeded','completed'])
                     OR crp.paid_at IS NOT NULL)
                AND run.started_at IS NOT NULL AND crp.paid_at >= run.started_at),
             'infinity'::timestamptz)
  ) AS at_raw
),
paid_first_clean AS (
  SELECT NULLIF((SELECT at_raw FROM paid_first), 'infinity'::timestamptz) AS at
),
appointment_first AS (
  SELECT min(a.created_at) AS at
  FROM public.appointments a, run
  WHERE a.status::text = ANY (ARRAY['scheduled','confirmed','completed'])
    AND run.started_at IS NOT NULL
    AND a.created_at >= run.started_at
)
SELECT
  (SELECT started_at FROM run)                          AS run_started_at,
  (SELECT started_at FROM run)                          AS first_sms_sent_at,
  (SELECT at FROM delivery_first)                       AS first_delivery_at,
  (SELECT at FROM click_first_clean)                    AS first_click_at,
  (SELECT at FROM activation_first)                     AS first_activation_at,
  (SELECT at FROM paid_first_clean)                     AS first_paid_at,
  (SELECT at FROM appointment_first)                    AS first_appointment_at,
  CASE
    WHEN (SELECT started_at FROM run) IS NULL                   THEN 'First SMS Sent'
    WHEN (SELECT at FROM click_first_clean) IS NULL             THEN 'First Click'
    WHEN (SELECT at FROM activation_first) IS NULL              THEN 'First Activation'
    WHEN (SELECT at FROM paid_first_clean) IS NULL              THEN 'First $1 Payment'
    WHEN (SELECT at FROM appointment_first) IS NULL             THEN 'First Appointment'
    ELSE 'Scale'
  END                                                   AS next_missing_milestone,
  CASE
    WHEN (SELECT started_at FROM run) IS NOT NULL
     AND (SELECT at FROM delivery_first) IS NULL        THEN 'delivery_callback_missing'
    ELSE NULL
  END                                                   AS telemetry_warning;

GRANT SELECT ON public.v_first_dollar_tracker TO authenticated, service_role;
