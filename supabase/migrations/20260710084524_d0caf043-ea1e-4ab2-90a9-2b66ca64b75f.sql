
ALTER TABLE public.contractor_funnel_events
  ADD COLUMN IF NOT EXISTS contractor_id uuid REFERENCES public.acq_contractors(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS event_source text,
  ADD COLUMN IF NOT EXISTS current_path text;

CREATE INDEX IF NOT EXISTS idx_cfe_contractor ON public.contractor_funnel_events(contractor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cfe_phone ON public.contractor_funnel_events(phone);
CREATE INDEX IF NOT EXISTS idx_cfe_email ON public.contractor_funnel_events(email);
CREATE INDEX IF NOT EXISTS idx_cfe_event_created ON public.contractor_funnel_events(event_type, created_at DESC);

DROP POLICY IF EXISTS "Admins read funnel events" ON public.contractor_funnel_events;
CREATE POLICY "Admins read funnel events"
  ON public.contractor_funnel_events
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR auth.uid() = user_id);

DROP VIEW IF EXISTS public.v_revenue_rescue_queue;
DROP VIEW IF EXISTS public.v_contractor_journey_latest;

CREATE VIEW public.v_contractor_journey_latest
WITH (security_invoker = true)
AS
WITH keyed AS (
  SELECT
    COALESCE(contractor_id::text, phone, email, user_id::text, session_id) AS journey_key,
    contractor_id,
    phone,
    email,
    event_type,
    current_path,
    metadata,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY COALESCE(contractor_id::text, phone, email, user_id::text, session_id)
      ORDER BY created_at DESC
    ) AS rn
  FROM public.contractor_funnel_events
  WHERE COALESCE(contractor_id::text, phone, email, user_id::text, session_id) IS NOT NULL
),
agg AS (
  SELECT
    COALESCE(contractor_id::text, phone, email, user_id::text, session_id) AS journey_key,
    MAX(contractor_id::text) FILTER (WHERE contractor_id IS NOT NULL)::uuid AS contractor_id,
    MAX(phone) FILTER (WHERE phone IS NOT NULL) AS phone,
    MAX(email) FILTER (WHERE email IS NOT NULL) AS email,
    MIN(created_at) AS first_activity_at,
    MAX(created_at) AS last_activity_at,
    BOOL_OR(event_type = 'sms_queued')                   AS has_sms_queued,
    BOOL_OR(event_type = 'sms_sent')                     AS has_sms_sent,
    BOOL_OR(event_type = 'sms_delivered')                AS has_sms_delivered,
    BOOL_OR(event_type = 'sms_failed')                   AS has_sms_failed,
    BOOL_OR(event_type = 'sms_clicked')                  AS has_clicked,
    BOOL_OR(event_type = 'landing_view')                 AS has_landing_view,
    BOOL_OR(event_type = 'registration_started')         AS has_registration_started,
    BOOL_OR(event_type = 'registration_step_company')    AS has_step_company,
    BOOL_OR(event_type = 'registration_step_services')   AS has_step_services,
    BOOL_OR(event_type = 'registration_step_territories') AS has_step_territories,
    BOOL_OR(event_type = 'registration_step_reviews')    AS has_step_reviews,
    BOOL_OR(event_type = 'registration_step_pricing')    AS has_step_pricing,
    BOOL_OR(event_type = 'registration_completed')       AS has_registration_completed,
    BOOL_OR(event_type = 'stripe_checkout_started')      AS has_checkout_started,
    BOOL_OR(event_type = 'stripe_checkout_opened')       AS has_checkout_opened,
    BOOL_OR(event_type = 'stripe_payment_success')       AS has_paid,
    BOOL_OR(event_type = 'stripe_payment_failed')        AS has_payment_failed,
    BOOL_OR(event_type = 'activation_started')           AS has_activation_started,
    BOOL_OR(event_type = 'activation_completed')         AS has_activated
  FROM public.contractor_funnel_events
  WHERE COALESCE(contractor_id::text, phone, email, user_id::text, session_id) IS NOT NULL
  GROUP BY 1
)
SELECT
  a.journey_key,
  a.contractor_id,
  c.company_name,
  a.phone,
  a.email,
  a.first_activity_at,
  a.last_activity_at,
  k.event_type       AS last_event_type,
  k.current_path     AS last_known_path,
  k.metadata         AS last_event_metadata,
  a.has_sms_queued, a.has_sms_sent, a.has_sms_delivered, a.has_sms_failed, a.has_clicked,
  a.has_landing_view, a.has_registration_started,
  a.has_step_company, a.has_step_services, a.has_step_territories,
  a.has_step_reviews, a.has_step_pricing, a.has_registration_completed,
  a.has_checkout_started, a.has_checkout_opened,
  a.has_paid, a.has_payment_failed,
  a.has_activation_started, a.has_activated,
  CASE
    WHEN a.has_activated                THEN 'activated'
    WHEN a.has_paid                     THEN 'paid_not_activated'
    WHEN a.has_checkout_opened          THEN 'checkout_opened'
    WHEN a.has_checkout_started         THEN 'checkout_started'
    WHEN a.has_registration_completed   THEN 'registration_completed'
    WHEN a.has_step_pricing             THEN 'step_pricing'
    WHEN a.has_step_territories         THEN 'step_territories'
    WHEN a.has_step_services            THEN 'step_services'
    WHEN a.has_step_company             THEN 'step_company'
    WHEN a.has_registration_started     THEN 'registration_started'
    WHEN a.has_landing_view             THEN 'landing_view'
    WHEN a.has_clicked                  THEN 'clicked'
    WHEN a.has_sms_delivered            THEN 'sms_delivered'
    WHEN a.has_sms_sent                 THEN 'sms_sent'
    WHEN a.has_sms_queued               THEN 'sms_queued'
    ELSE 'unknown'
  END AS current_stage,
  CASE
    WHEN a.has_clicked AND NOT a.has_registration_started THEN 'clicked_not_registered'
    WHEN a.has_registration_started AND NOT a.has_paid    THEN 'registered_not_paid'
    WHEN a.has_paid AND NOT a.has_activated               THEN 'paid_not_activated'
    ELSE NULL
  END AS rescue_bucket
FROM agg a
LEFT JOIN keyed k
  ON k.journey_key = a.journey_key AND k.rn = 1
LEFT JOIN public.acq_contractors c
  ON c.id = a.contractor_id;

CREATE VIEW public.v_revenue_rescue_queue
WITH (security_invoker = true)
AS
SELECT *
FROM public.v_contractor_journey_latest
WHERE rescue_bucket IS NOT NULL;

GRANT SELECT ON public.v_contractor_journey_latest TO authenticated;
GRANT SELECT ON public.v_revenue_rescue_queue      TO authenticated;
