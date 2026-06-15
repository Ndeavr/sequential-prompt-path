
-- View: messages sent >10min ago without terminal callback
CREATE OR REPLACE VIEW public.v_sms_callback_gap
WITH (security_invoker = true) AS
SELECT
  id, twilio_sid, normalized_phone, from_number, status,
  sent_at, webhook_received_at,
  EXTRACT(EPOCH FROM (now() - sent_at))/60 AS minutes_since_send,
  message_type, template_key
FROM public.sms_events_v2
WHERE status IN ('sent','sending')
  AND sent_at < now() - interval '10 minutes'
  AND webhook_received_at IS NULL
ORDER BY sent_at DESC;

GRANT SELECT ON public.v_sms_callback_gap TO authenticated;
GRANT SELECT ON public.v_sms_callback_gap TO service_role;

-- View: sender / messaging service usage last 24h
CREATE OR REPLACE VIEW public.v_sms_sender_usage_24h
WITH (security_invoker = true) AS
SELECT
  COALESCE(from_number,'(messaging_service)') AS sender,
  message_type,
  count(*) AS total,
  count(*) FILTER (WHERE status='delivered') AS delivered,
  count(*) FILTER (WHERE status IN ('failed','undelivered','invalid_phone','blocked')) AS failed
FROM public.sms_events_v2
WHERE created_at > now() - interval '24 hours'
GROUP BY 1,2
ORDER BY total DESC;

GRANT SELECT ON public.v_sms_sender_usage_24h TO authenticated;
GRANT SELECT ON public.v_sms_sender_usage_24h TO service_role;
