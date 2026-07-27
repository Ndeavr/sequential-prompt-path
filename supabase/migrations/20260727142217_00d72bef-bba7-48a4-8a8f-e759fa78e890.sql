
DROP VIEW IF EXISTS public.v_first_dollar_tracker;

CREATE VIEW public.v_first_dollar_tracker
WITH (security_invoker = true)
AS
WITH active AS (
  SELECT id, phone_e164, business_name, outreach_twilio_sid,
         outreach_sent_at, outreach_delivered_at, outreach_clicked_at
  FROM public.verified_contractor_prospects
  WHERE outreach_sent_at IS NOT NULL
    AND outreach_twilio_sid IS NOT NULL
  ORDER BY outreach_sent_at DESC
  LIMIT 1
),
linked_lead AS (
  SELECT cl.*
  FROM public.contractor_leads cl, active a
  WHERE cl.source_prospect_id = a.id
     OR (cl.phone_e164 IS NOT NULL AND cl.phone_e164 = a.phone_e164)
  ORDER BY (CASE WHEN cl.source_prospect_id = a.id THEN 0 ELSE 1 END),
           cl.created_at ASC
  LIMIT 1
),
tokens AS (
  SELECT DISTINCT (ape.metadata->>'token') AS token
  FROM public.acquisition_pipeline_events ape, active a
  WHERE ape.prospect_id = a.id
    AND ape.metadata ? 'token'
    AND (ape.metadata->>'token') IS NOT NULL
),
click_from_prospect AS (
  SELECT outreach_clicked_at AS at FROM active
),
click_from_short_links AS (
  SELECT min(slc.clicked_at) AS at
  FROM public.short_link_clicks slc
  WHERE slc.slug IN (SELECT token FROM tokens WHERE token IS NOT NULL)
),
click_from_tracking_links AS (
  SELECT min(atl.first_click_at) AS at
  FROM public.acquisition_tracking_links atl, active a
  WHERE atl.prospect_id = a.id
    AND atl.first_click_at IS NOT NULL
),
click_from_events AS (
  SELECT min(ce.occurred_at) AS at
  FROM public.click_events ce, active a
  WHERE ce.provider_message_id = a.outreach_twilio_sid
     OR ce.tracking_id IN (SELECT token FROM tokens WHERE token IS NOT NULL)
     OR (ce.source_table = 'verified_contractor_prospects' AND ce.source_row_id = a.id::text)
     OR (ce.source_table = 'contractor_leads'
         AND ce.source_row_id = (SELECT id::text FROM linked_lead))
),
click_first AS (
  SELECT NULLIF(LEAST(
    COALESCE((SELECT at FROM click_from_prospect),        'infinity'::timestamptz),
    COALESCE((SELECT at FROM click_from_short_links),     'infinity'::timestamptz),
    COALESCE((SELECT at FROM click_from_tracking_links),  'infinity'::timestamptz),
    COALESCE((SELECT at FROM click_from_events),          'infinity'::timestamptz)
  ), 'infinity'::timestamptz) AS at
),
registration_first AS (
  SELECT onboarding_started_at AS at FROM linked_lead
),
paid_from_lead AS (
  SELECT paid_at AS at FROM linked_lead
),
paid_from_recruitment AS (
  SELECT min(crp.paid_at) AS at
  FROM public.contractor_recruitment_payments crp, active a
  WHERE crp.prospect_id = a.id
    AND crp.paid_at IS NOT NULL
    AND (crp.payment_status = ANY (ARRAY['paid','succeeded','completed'])
         OR crp.paid_at IS NOT NULL)
),
paid_from_events AS (
  SELECT min(pe.created_at) AS at
  FROM public.acq_payment_events pe, linked_lead ll
  WHERE ll.contractor_id IS NOT NULL
    AND pe.contractor_id = ll.contractor_id
    AND pe.event_type = ANY (ARRAY['payment_succeeded','payment_success','activation_paid','charge.succeeded'])
),
paid_first AS (
  SELECT NULLIF(LEAST(
    COALESCE((SELECT at FROM paid_from_lead),        'infinity'::timestamptz),
    COALESCE((SELECT at FROM paid_from_recruitment), 'infinity'::timestamptz),
    COALESCE((SELECT at FROM paid_from_events),      'infinity'::timestamptz)
  ), 'infinity'::timestamptz) AS at
),
activation_from_pipeline AS (
  SELECT min(created_at) AS at
  FROM public.acquisition_pipeline_events ape, active a
  WHERE ape.prospect_id = a.id
    AND ape.stage = 'activated'
),
activation_from_lead AS (
  SELECT
    CASE
      WHEN activation_status = ANY (ARRAY['activated','completed','live'])
      THEN COALESCE(paid_at, updated_at)
      ELSE NULL
    END AS at
  FROM linked_lead
),
activation_first AS (
  SELECT NULLIF(LEAST(
    COALESCE((SELECT at FROM activation_from_pipeline), 'infinity'::timestamptz),
    COALESCE((SELECT at FROM activation_from_lead),     'infinity'::timestamptz)
  ), 'infinity'::timestamptz) AS at
),
appointment_first AS (
  SELECT min(ap.created_at) AS at
  FROM public.appointments ap, linked_lead ll
  WHERE ll.contractor_id IS NOT NULL
    AND ap.contractor_id = ll.contractor_id
    AND ap.status::text = ANY (ARRAY['requested','scheduled','confirmed','completed'])
)
SELECT
  (SELECT id                    FROM active)      AS active_prospect_id,
  (SELECT business_name         FROM active)      AS active_business_name,
  (SELECT outreach_twilio_sid   FROM active)      AS active_provider_message_id,
  (SELECT id                    FROM linked_lead) AS active_contractor_lead_id,
  (SELECT outreach_sent_at      FROM active)      AS run_started_at,

  (SELECT outreach_sent_at      FROM active)      AS first_sms_sent_at,
  (SELECT outreach_delivered_at FROM active)      AS first_delivery_at,
  (SELECT at                    FROM click_first) AS first_click_at,
  (SELECT at            FROM registration_first)  AS first_activation_at,   -- registration
  (SELECT at                    FROM paid_first)  AS first_paid_at,
  (SELECT at              FROM activation_first)  AS first_contractor_activation_at,
  (SELECT at             FROM appointment_first)  AS first_appointment_at,

  CASE
    WHEN (SELECT id FROM active) IS NULL                                              THEN 'First SMS Sent'
    WHEN (SELECT at FROM click_first) IS NULL                                         THEN 'First Click'
    WHEN (SELECT at FROM registration_first) IS NULL                                  THEN 'First Registration'
    WHEN (SELECT at FROM paid_first) IS NULL                                          THEN 'First $1 Payment'
    WHEN (SELECT at FROM activation_first) IS NULL                                    THEN 'First Activation'
    WHEN (SELECT at FROM appointment_first) IS NULL                                   THEN 'First Appointment'
    ELSE 'Scale'
  END                                                                                  AS next_missing_milestone,

  CASE
    WHEN (SELECT id FROM linked_lead) IS NULL AND (SELECT id FROM active) IS NOT NULL THEN 'attribution_lead_missing'
    ELSE NULL
  END                                                                                  AS attribution_warning,

  CASE
    WHEN (SELECT id FROM active) IS NOT NULL
     AND (SELECT outreach_delivered_at FROM active) IS NULL                            THEN 'delivery_callback_missing'
    ELSE NULL
  END                                                                                  AS telemetry_warning;

GRANT SELECT ON public.v_first_dollar_tracker TO authenticated, service_role;
