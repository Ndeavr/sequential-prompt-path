
-- Drop legacy stale views (they read from an empty table)
DROP VIEW IF EXISTS public.v_revenue_rescue_queue CASCADE;
DROP VIEW IF EXISTS public.v_contractor_journey_latest CASCADE;

-- One row per lead — derived from real onboarding data
CREATE OR REPLACE VIEW public.v_contractor_forensic_state
WITH (security_invoker=on) AS
WITH lead_base AS (
  SELECT
    l.id::text                                     AS journey_key,
    l.id::text                                     AS contractor_id,
    COALESCE(NULLIF(l.company_name,''), NULLIF(l.full_name,'')) AS company_name,
    COALESCE(NULLIF(l.phone,''), NULLIF(l.mobile_phone,''))     AS phone,
    NULLIF(l.email,'')                             AS email,
    l.city                                         AS city,
    l.pipeline_status,
    l.activation_status,
    l.payment_status,
    l.last_sms_at,
    l.opened_at,
    l.clicked_at,
    l.onboarding_started_at,
    l.payment_started_at,
    l.paid_at,
    l.failure_code,
    l.created_at,
    l.updated_at
  FROM public.contractor_leads l
  WHERE l.last_sms_at IS NOT NULL
     OR l.clicked_at IS NOT NULL
     OR l.onboarding_started_at IS NOT NULL
     OR l.paid_at IS NOT NULL
),
outreach_agg AS (
  SELECT
    lead_id::text AS journey_key,
    bool_or(status = 'delivered')                       AS has_sms_delivered,
    bool_or(status = 'failed')                          AS has_sms_failed,
    bool_or(status IN ('sent','queued','delivered'))    AS has_sms_sent_log,
    bool_or(status = 'queued')                          AS has_sms_queued,
    max(clicked_at)                                     AS log_clicked_at,
    max(opened_at)                                      AS log_opened_at,
    max(sent_at)                                        AS last_log_sent_at
  FROM public.contractor_outreach_logs
  WHERE channel = 'sms'
  GROUP BY lead_id
)
SELECT
  b.journey_key,
  b.contractor_id,
  b.company_name,
  b.phone,
  b.email,
  b.city,
  LEAST(
    COALESCE(b.last_sms_at, b.created_at),
    COALESCE(b.clicked_at, b.created_at),
    COALESCE(b.onboarding_started_at, b.created_at),
    b.created_at
  ) AS first_activity_at,
  GREATEST(
    COALESCE(b.last_sms_at,        'epoch'::timestamptz),
    COALESCE(b.opened_at,          'epoch'::timestamptz),
    COALESCE(b.clicked_at,         'epoch'::timestamptz),
    COALESCE(b.onboarding_started_at,'epoch'::timestamptz),
    COALESCE(b.payment_started_at, 'epoch'::timestamptz),
    COALESCE(b.paid_at,            'epoch'::timestamptz),
    b.updated_at
  ) AS last_activity_at,
  CASE
    WHEN b.activation_status = 'active'      THEN 'activated'
    WHEN b.paid_at IS NOT NULL               THEN 'paid_not_activated'
    WHEN b.payment_started_at IS NOT NULL    THEN 'checkout_opened'
    WHEN b.pipeline_status IN ('onboarding_completed','payment_started') THEN 'registration_completed'
    WHEN b.onboarding_started_at IS NOT NULL THEN 'registration_started'
    WHEN b.clicked_at IS NOT NULL            THEN 'clicked'
    WHEN COALESCE(oa.has_sms_delivered,false) THEN 'sms_delivered'
    WHEN b.last_sms_at IS NOT NULL           THEN 'sms_sent'
    ELSE 'unknown'
  END AS current_stage,
  CASE
    WHEN b.paid_at IS NOT NULL AND b.activation_status <> 'active'          THEN 'paid_not_activated'
    WHEN b.onboarding_started_at IS NOT NULL AND b.paid_at IS NULL          THEN 'registered_not_paid'
    WHEN b.clicked_at IS NOT NULL AND b.onboarding_started_at IS NULL       THEN 'clicked_not_registered'
    ELSE NULL
  END AS rescue_bucket,
  CASE
    WHEN b.paid_at IS NOT NULL              THEN '/onboarding/payment-success'
    WHEN b.payment_started_at IS NOT NULL   THEN '/checkout'
    WHEN b.onboarding_started_at IS NOT NULL THEN '/entrepreneur/inscription'
    WHEN b.clicked_at IS NOT NULL           THEN '/entrepreneur/landing'
    ELSE NULL
  END AS last_known_path,
  COALESCE(oa.has_sms_queued, false) AS has_sms_queued,
  (b.last_sms_at IS NOT NULL OR COALESCE(oa.has_sms_sent_log,false)) AS has_sms_sent,
  COALESCE(oa.has_sms_delivered, false) AS has_sms_delivered,
  COALESCE(oa.has_sms_failed, false)    AS has_sms_failed,
  (b.clicked_at IS NOT NULL OR oa.log_clicked_at IS NOT NULL) AS has_clicked,
  (b.onboarding_started_at IS NOT NULL) AS has_landing_view,
  (b.onboarding_started_at IS NOT NULL) AS has_registration_started,
  (b.pipeline_status IN ('onboarding_step_company','onboarding_step_services','onboarding_step_territories','onboarding_step_pricing','onboarding_completed','payment_started','paid','profile_active')) AS has_step_company,
  (b.pipeline_status IN ('onboarding_step_services','onboarding_step_territories','onboarding_step_pricing','onboarding_completed','payment_started','paid','profile_active')) AS has_step_services,
  (b.pipeline_status IN ('onboarding_step_territories','onboarding_step_pricing','onboarding_completed','payment_started','paid','profile_active')) AS has_step_territories,
  false AS has_step_reviews,
  (b.pipeline_status IN ('onboarding_step_pricing','onboarding_completed','payment_started','paid','profile_active')) AS has_step_pricing,
  (b.pipeline_status IN ('onboarding_completed','payment_started','paid','profile_active') OR b.payment_started_at IS NOT NULL) AS has_registration_completed,
  (b.payment_started_at IS NOT NULL) AS has_checkout_started,
  (b.payment_started_at IS NOT NULL) AS has_checkout_opened,
  (b.paid_at IS NOT NULL) AS has_paid,
  (b.payment_status = 'failed' OR b.failure_code LIKE 'payment_%') AS has_payment_failed,
  (b.activation_status = 'in_progress') AS has_activation_started,
  (b.activation_status = 'active' OR b.pipeline_status = 'profile_active') AS has_activated,
  NULL::text AS last_event_type,
  NULL::jsonb AS last_event_metadata
FROM lead_base b
LEFT JOIN outreach_agg oa USING (journey_key);

GRANT SELECT ON public.v_contractor_forensic_state TO authenticated;
GRANT SELECT ON public.v_contractor_forensic_state TO service_role;

-- Rescue queue — filtered subset
CREATE OR REPLACE VIEW public.v_contractor_rescue_queue
WITH (security_invoker=on) AS
SELECT *
FROM public.v_contractor_forensic_state
WHERE rescue_bucket IS NOT NULL
ORDER BY
  CASE rescue_bucket
    WHEN 'registered_not_paid'    THEN 1
    WHEN 'paid_not_activated'     THEN 2
    WHEN 'clicked_not_registered' THEN 3
    ELSE 4
  END,
  last_activity_at DESC;

GRANT SELECT ON public.v_contractor_rescue_queue TO authenticated;
GRANT SELECT ON public.v_contractor_rescue_queue TO service_role;

-- Full timeline — derived events UNION real outreach logs UNION funnel events matched by phone/email
CREATE OR REPLACE VIEW public.v_contractor_forensic_journey
WITH (security_invoker=on) AS
-- Derived from lead timestamps
SELECT
  l.id::text                                  AS journey_key,
  ('lead-sms-'   || l.id::text)               AS id,
  'sms_sent'                                  AS event_type,
  'twilio'                                    AS event_source,
  'sms_sent'                                  AS step,
  NULL::text                                  AS current_path,
  jsonb_build_object('source','contractor_leads.last_sms_at') AS metadata,
  l.last_sms_at                               AS created_at,
  l.id::text                                  AS contractor_id,
  COALESCE(l.phone, l.mobile_phone)           AS phone,
  l.email                                     AS email,
  NULL::text                                  AS session_id,
  NULL::uuid                                  AS user_id
FROM public.contractor_leads l WHERE l.last_sms_at IS NOT NULL
UNION ALL
SELECT
  l.id::text, ('lead-open-'||l.id::text), 'sms_opened', 'twilio', 'sms_opened', NULL,
  jsonb_build_object('source','contractor_leads.opened_at'),
  l.opened_at, l.id::text, COALESCE(l.phone,l.mobile_phone), l.email, NULL, NULL
FROM public.contractor_leads l WHERE l.opened_at IS NOT NULL
UNION ALL
SELECT
  l.id::text, ('lead-click-'||l.id::text), 'sms_clicked', 'twilio', 'sms_clicked', NULL,
  jsonb_build_object('source','contractor_leads.clicked_at'),
  l.clicked_at, l.id::text, COALESCE(l.phone,l.mobile_phone), l.email, NULL, NULL
FROM public.contractor_leads l WHERE l.clicked_at IS NOT NULL
UNION ALL
SELECT
  l.id::text, ('lead-reg-'||l.id::text), 'registration_started', 'app', 'registration_started',
  '/entrepreneur/inscription',
  jsonb_build_object('source','contractor_leads.onboarding_started_at','pipeline_status',l.pipeline_status),
  l.onboarding_started_at, l.id::text, COALESCE(l.phone,l.mobile_phone), l.email, NULL, NULL
FROM public.contractor_leads l WHERE l.onboarding_started_at IS NOT NULL
UNION ALL
SELECT
  l.id::text, ('lead-checkout-'||l.id::text), 'stripe_checkout_started', 'stripe', 'stripe_checkout_started',
  '/checkout',
  jsonb_build_object('source','contractor_leads.payment_started_at'),
  l.payment_started_at, l.id::text, COALESCE(l.phone,l.mobile_phone), l.email, NULL, NULL
FROM public.contractor_leads l WHERE l.payment_started_at IS NOT NULL
UNION ALL
SELECT
  l.id::text, ('lead-paid-'||l.id::text), 'stripe_payment_success', 'stripe', 'stripe_payment_success',
  '/onboarding/payment-success',
  jsonb_build_object('source','contractor_leads.paid_at'),
  l.paid_at, l.id::text, COALESCE(l.phone,l.mobile_phone), l.email, NULL, NULL
FROM public.contractor_leads l WHERE l.paid_at IS NOT NULL
UNION ALL
-- Real outreach logs (SMS/email with delivery+error data)
SELECT
  ol.lead_id::text,
  ('log-'||ol.id::text),
  ('sms_' || ol.status),
  COALESCE(ol.channel,'twilio'),
  ('sms_' || ol.status),
  NULL,
  jsonb_build_object(
    'channel',ol.channel,
    'template_key',ol.template_key,
    'error_code',ol.error_code,
    'error_message',ol.error_message,
    'to_address',ol.to_address
  ),
  COALESCE(ol.sent_at, ol.created_at),
  ol.lead_id::text,
  ol.to_address,
  NULL,
  NULL,
  NULL
FROM public.contractor_outreach_logs ol
WHERE ol.lead_id IS NOT NULL;

GRANT SELECT ON public.v_contractor_forensic_journey TO authenticated;
GRANT SELECT ON public.v_contractor_forensic_journey TO service_role;
