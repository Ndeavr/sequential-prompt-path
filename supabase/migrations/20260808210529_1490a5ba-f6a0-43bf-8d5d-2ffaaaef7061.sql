CREATE OR REPLACE VIEW public.v_activation_funnel
WITH (security_invoker = true) AS
WITH ev AS (
  SELECT
    date_trunc('day', occurred_at)::date AS day,
    event_type,
    channel,
    tracking_id,
    prospect_id,
    source_row_id
  FROM public.pipeline_engagement_events
  WHERE occurred_at > now() - interval '90 days'
    AND coalesce(tracking_id, '') NOT LIKE '\_\_e2e\_%'
    AND coalesce(source_row_id, '') NOT LIKE '\_\_e2e\_%'
)
SELECT
  day,
  count(*) FILTER (WHERE event_type = 'sent' AND channel = 'sms')            AS sms_sent,
  count(*) FILTER (WHERE event_type = 'delivered' AND channel = 'sms')       AS sms_delivered,
  count(*) FILTER (WHERE event_type = 'undelivered' AND channel = 'sms')     AS sms_undelivered,
  count(DISTINCT prospect_id) FILTER (WHERE event_type = 'clicked')          AS link_clicks,
  count(DISTINCT prospect_id) FILTER (WHERE event_type = 'landing_viewed')   AS landing_views,
  count(DISTINCT prospect_id) FILTER (WHERE event_type = 'checkout_cta_clicked') AS cta_clicks,
  count(DISTINCT source_row_id) FILTER (WHERE event_type = 'checkout_opened')    AS checkouts_opened,
  count(DISTINCT source_row_id) FILTER (WHERE event_type = 'paid')               AS payments
FROM ev
GROUP BY day
ORDER BY day DESC;

GRANT SELECT ON public.v_activation_funnel TO authenticated;
GRANT SELECT ON public.v_activation_funnel TO service_role;