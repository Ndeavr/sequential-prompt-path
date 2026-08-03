ALTER TABLE public.verified_prospect_tokens
  ADD COLUMN IF NOT EXISTS campaign_id uuid,
  ADD COLUMN IF NOT EXISTS sms_log_id uuid;

CREATE INDEX IF NOT EXISTS idx_vpt_campaign ON public.verified_prospect_tokens (campaign_id);
CREATE INDEX IF NOT EXISTS idx_vpt_prospect ON public.verified_prospect_tokens (prospect_id);
CREATE INDEX IF NOT EXISTS idx_acq_sms_logs_campaign ON public.acq_sms_logs (campaign_id);
CREATE INDEX IF NOT EXISTS idx_acq_sms_logs_prospect_created ON public.acq_sms_logs (prospect_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_acq_sms_logs_provider_msg ON public.acq_sms_logs (provider_message_id);
CREATE INDEX IF NOT EXISTS idx_acq_sms_logs_created ON public.acq_sms_logs (created_at DESC);

CREATE OR REPLACE VIEW public.v_prospect_funnel
WITH (security_invoker = on) AS
WITH sms AS (
  SELECT
    l.prospect_id,
    count(*) FILTER (WHERE l.provider_message_id IS NOT NULL)                                   AS sms_sent,
    count(*) FILTER (WHERE l.status = 'delivered')                                              AS sms_delivered,
    count(*) FILTER (WHERE l.status = 'undelivered')                                            AS sms_undelivered,
    count(*) FILTER (WHERE l.status = 'failed')                                                 AS sms_failed,
    count(*) FILTER (WHERE l.provider_message_id IS NOT NULL
                       AND l.status NOT IN ('delivered','undelivered','failed','canceled'))     AS sms_no_callback,
    min(l.sent_at)                                                                              AS first_sent_at,
    max(l.sent_at)                                                                              AS last_sent_at,
    (array_agg(l.campaign_id ORDER BY l.created_at DESC)
       FILTER (WHERE l.campaign_id IS NOT NULL))[1]                                             AS campaign_id,
    (array_agg(l.provider_message_id ORDER BY l.created_at DESC)
       FILTER (WHERE l.provider_message_id IS NOT NULL))[1]                                     AS last_sid,
    (array_agg(l.status ORDER BY l.created_at DESC))[1]                                         AS last_status,
    (array_agg(l.error ORDER BY l.created_at DESC) FILTER (WHERE l.error IS NOT NULL))[1]       AS last_error
  FROM public.acq_sms_logs l
  WHERE l.prospect_id IS NOT NULL
  GROUP BY l.prospect_id
),
ev AS (
  SELECT
    e.prospect_id,
    min(e.occurred_at) FILTER (WHERE e.event_type = 'landing_viewed')       AS landing_at,
    min(e.occurred_at) FILTER (WHERE e.event_type = 'registration_started') AS registered_at,
    min(e.occurred_at) FILTER (WHERE e.event_type = 'otp_requested')        AS otp_requested_at,
    min(e.occurred_at) FILTER (WHERE e.event_type = 'otp_verified')         AS otp_verified_at,
    min(e.occurred_at) FILTER (WHERE e.event_type = 'checkout_opened')      AS checkout_at,
    min(e.occurred_at) FILTER (WHERE e.event_type = 'payment_succeeded')    AS payment_event_at,
    min(e.occurred_at) FILTER (WHERE e.event_type = 'alex_started')         AS alex_started_at,
    max(e.occurred_at)                                                      AS last_event_at
  FROM public.pipeline_engagement_events e
  WHERE e.prospect_id IS NOT NULL
  GROUP BY e.prospect_id
),
pay AS (
  SELECT
    a.prospect_id,
    min(a.created_at)                                        AS paid_at,
    sum(COALESCE(a.amount_cents, 0))                         AS revenue_cents
  FROM public.unpro_payment_activation_audit a
  WHERE a.prospect_id IS NOT NULL AND a.result = 'success'
  GROUP BY a.prospect_id
),
tok AS (
  SELECT t.prospect_id,
         min(t.clicked_at)        AS clicked_at,
         sum(COALESCE(t.click_count, 0)) AS click_count,
         (array_agg(t.campaign_id) FILTER (WHERE t.campaign_id IS NOT NULL))[1] AS campaign_id
  FROM public.verified_prospect_tokens t
  GROUP BY t.prospect_id
)
SELECT
  p.id                                                        AS prospect_id,
  p.business_name,
  p.city,
  p.category,
  p.phone_e164,
  p.email,
  COALESCE(sms.campaign_id, tok.campaign_id)                  AS campaign_id,
  p.created_at                                                AS scraped_at,
  p.verified_at                                               AS validated_at,
  p.phone_validation_status,
  p.phone_line_type,
  p.sms_eligibility_tier,
  p.outreach_status,
  COALESCE(sms.sms_sent, 0)                                   AS sms_sent,
  COALESCE(sms.sms_delivered, 0)                              AS sms_delivered,
  COALESCE(sms.sms_undelivered, 0)                            AS sms_undelivered,
  COALESCE(sms.sms_failed, 0)                                 AS sms_failed,
  COALESCE(sms.sms_no_callback, 0)                            AS sms_no_callback,
  COALESCE(sms.first_sent_at, p.outreach_sent_at)             AS sent_at,
  sms.last_sent_at,
  sms.last_sid,
  sms.last_status,
  sms.last_error,
  p.outreach_delivered_at                                     AS delivered_at,
  COALESCE(tok.clicked_at, p.outreach_clicked_at)             AS clicked_at,
  COALESCE(tok.click_count, 0)                                AS click_count,
  ev.landing_at,
  ev.registered_at,
  ev.otp_requested_at,
  ev.otp_verified_at,
  ev.checkout_at,
  COALESCE(pay.paid_at, ev.payment_event_at)                  AS paid_at,
  COALESCE(pay.revenue_cents, 0)                              AS revenue_cents,
  ev.alex_started_at,
  GREATEST(
    COALESCE(ev.last_event_at, p.created_at),
    COALESCE(p.last_action_at, p.created_at),
    COALESCE(sms.last_sent_at, p.created_at)
  )                                                           AS last_activity_at,
  CASE
    WHEN COALESCE(pay.paid_at, ev.payment_event_at) IS NOT NULL THEN 'paid'
    WHEN ev.checkout_at        IS NOT NULL THEN 'checkout_opened'
    WHEN ev.otp_verified_at    IS NOT NULL THEN 'otp_verified'
    WHEN ev.registered_at      IS NOT NULL THEN 'registered'
    WHEN ev.landing_at         IS NOT NULL THEN 'landing_viewed'
    WHEN COALESCE(tok.clicked_at, p.outreach_clicked_at) IS NOT NULL THEN 'clicked'
    WHEN COALESCE(sms.sms_delivered, 0) > 0 OR p.outreach_delivered_at IS NOT NULL THEN 'delivered'
    WHEN COALESCE(sms.sms_undelivered, 0) > 0 THEN 'undelivered'
    WHEN COALESCE(sms.sms_failed, 0) > 0 THEN 'send_failed'
    WHEN COALESCE(sms.sms_sent, 0) > 0 THEN 'sent'
    WHEN p.verified_at IS NOT NULL THEN 'validated'
    ELSE 'scraped'
  END                                                         AS current_stage
FROM public.verified_contractor_prospects p
LEFT JOIN sms ON sms.prospect_id = p.id
LEFT JOIN ev  ON ev.prospect_id  = p.id
LEFT JOIN pay ON pay.prospect_id = p.id
LEFT JOIN tok ON tok.prospect_id = p.id;

GRANT SELECT ON public.v_prospect_funnel TO authenticated;
GRANT SELECT ON public.v_prospect_funnel TO service_role;

CREATE OR REPLACE VIEW public.v_campaign_funnel
WITH (security_invoker = on) AS
SELECT
  f.campaign_id,
  COALESCE(c.name, CASE WHEN f.campaign_id IS NULL THEN 'Sans campagne' ELSE 'Campagne ' || left(f.campaign_id::text, 8) END) AS campaign_name,
  count(*)                                                                  AS prospects,
  count(*) FILTER (WHERE f.sms_sent > 0)                                    AS sent,
  count(*) FILTER (WHERE f.sms_delivered > 0)                               AS delivered,
  count(*) FILTER (WHERE f.sms_undelivered > 0)                             AS undelivered,
  count(*) FILTER (WHERE f.sms_failed > 0)                                  AS failed,
  count(*) FILTER (WHERE f.sms_no_callback > 0)                             AS no_callback,
  count(*) FILTER (WHERE f.clicked_at IS NOT NULL)                          AS clicked,
  count(*) FILTER (WHERE f.landing_at IS NOT NULL)                          AS landing,
  count(*) FILTER (WHERE f.registered_at IS NOT NULL)                       AS registered,
  count(*) FILTER (WHERE f.otp_verified_at IS NOT NULL)                     AS otp_verified,
  count(*) FILTER (WHERE f.checkout_at IS NOT NULL)                         AS checkout_opened,
  count(*) FILTER (WHERE f.paid_at IS NOT NULL)                             AS paid,
  COALESCE(sum(f.revenue_cents), 0)                                         AS revenue_cents,
  min(f.sent_at)                                                            AS first_sent_at,
  max(f.last_activity_at)                                                   AS last_activity_at
FROM public.v_prospect_funnel f
LEFT JOIN public.contractor_recruitment_campaigns c ON c.id = f.campaign_id
GROUP BY f.campaign_id, c.name;

GRANT SELECT ON public.v_campaign_funnel TO authenticated;
GRANT SELECT ON public.v_campaign_funnel TO service_role;