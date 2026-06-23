
-- Channel routing health view + ensure landline-or-unreachable column exists
ALTER TABLE public.contractor_leads
  ADD COLUMN IF NOT EXISTS phone_validation_checked_at timestamptz;

CREATE OR REPLACE VIEW public.v_channel_routing_health
WITH (security_invoker = on) AS
WITH lead_breakdown AS (
  SELECT
    COUNT(*) FILTER (WHERE phone_type = 'mobile')                              AS mobile,
    COUNT(*) FILTER (WHERE phone_type IN ('landline','fixedVoip','toll_free','landline_or_unreachable')) AS landline,
    COUNT(*) FILTER (WHERE phone_type = 'voip')                                AS voip,
    COUNT(*) FILTER (WHERE phone_type IS NULL OR phone_type = 'unknown')       AS unknown,
    COUNT(*) FILTER (WHERE sms_disabled IS TRUE)                               AS sms_disabled,
    COUNT(*) FILTER (WHERE email IS NOT NULL AND email <> '')                  AS with_email,
    COUNT(*)                                                                   AS total
  FROM public.contractor_leads
),
last7 AS (
  SELECT
    COUNT(*) FILTER (WHERE channel = 'sms'   AND status IN ('sent','queued','sending','delivered')) AS sms_sent,
    COUNT(*) FILTER (WHERE channel = 'sms'   AND status = 'delivered')                              AS sms_delivered,
    COUNT(*) FILTER (WHERE channel = 'sms'   AND error_code IS NOT NULL)                            AS sms_failed,
    COUNT(*) FILTER (WHERE channel = 'email' AND status IN ('sent','queued','delivered'))           AS email_sent,
    COUNT(*) FILTER (WHERE channel = 'email' AND status = 'delivered')                              AS email_delivered,
    COUNT(*) FILTER (WHERE error_code = '30006' OR error_message ILIKE '%30006%')                   AS landline_30006
  FROM public.contractor_outreach_logs
  WHERE created_at > now() - interval '7 days'
),
events7 AS (
  SELECT
    COUNT(*) FILTER (WHERE event_type='sent'   AND metadata->>'channel'='email' AND metadata->>'fallback_from'='sms') AS email_fallback,
    COUNT(*) FILTER (WHERE event_type='failed' AND metadata->>'reason'='needs_manual_contact')                       AS needs_manual
  FROM public.acquisition_events
  WHERE occurred_at > now() - interval '7 days'
)
SELECT
  l.mobile, l.landline, l.voip, l.unknown, l.sms_disabled, l.with_email, l.total,
  s.sms_sent, s.sms_delivered, s.sms_failed,
  s.email_sent, s.email_delivered, s.landline_30006,
  e.email_fallback, e.needs_manual,
  CASE WHEN s.sms_sent > 0 THEN ROUND(100.0 * s.sms_delivered / s.sms_sent, 1) ELSE 0 END AS sms_delivery_rate_mobile_pct
FROM lead_breakdown l, last7 s, events7 e;

GRANT SELECT ON public.v_channel_routing_health TO authenticated, service_role;
