CREATE INDEX IF NOT EXISTS idx_pee_type_time ON public.pipeline_engagement_events (event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pee_prospect ON public.pipeline_engagement_events (prospect_id, created_at DESC);

CREATE OR REPLACE VIEW public.v_conversion_lab
WITH (security_invoker = true) AS
WITH base AS (
  SELECT p.id AS prospect_id, p.city, p.category AS trade,
    COALESCE(vm.variant,'default') AS message_variant,
    COALESCE(vl.variant,'default') AS landing_variant,
    COALESCE(vp.variant,'default') AS profile_variant,
    p.outreach_status, p.outreach_sent_at, p.outreach_delivered_at, p.outreach_clicked_at
  FROM public.verified_contractor_prospects p
  LEFT JOIN public.conversion_variant_assignments vm ON vm.prospect_id = p.id AND vm.surface='message'
  LEFT JOIN public.conversion_variant_assignments vl ON vl.prospect_id = p.id AND vl.surface='landing'
  LEFT JOIN public.conversion_variant_assignments vp ON vp.prospect_id = p.id AND vp.surface='profile'
), ev AS (
  SELECT prospect_id,
    count(*) FILTER (WHERE event_type='landing_viewed')       AS landing_viewed,
    count(*) FILTER (WHERE event_type='landing_engaged')      AS landing_engaged,
    count(*) FILTER (WHERE event_type='profile_viewed')       AS profile_viewed,
    count(*) FILTER (WHERE event_type='checkout_cta_clicked') AS cta_clicked,
    count(*) FILTER (WHERE event_type IN ('checkout_created','checkout_opened')) AS checkout_created,
    count(*) FILTER (WHERE event_type IN ('payment_succeeded','paid')) AS paid,
    count(*) FILTER (WHERE event_type='goals_completed')      AS goals_completed,
    count(*) FILTER (WHERE event_type='plan_accepted')        AS plan_accepted
  FROM public.pipeline_engagement_events WHERE prospect_id IS NOT NULL GROUP BY 1
)
SELECT b.message_variant, b.landing_variant, b.profile_variant, b.trade, b.city,
  count(*) AS cohort_size,
  count(*) FILTER (WHERE b.outreach_sent_at IS NOT NULL) AS sent,
  count(*) FILTER (WHERE b.outreach_delivered_at IS NOT NULL OR b.outreach_status IN ('delivered','sent_email')) AS delivered,
  count(*) FILTER (WHERE b.outreach_clicked_at IS NOT NULL) AS clicked,
  COALESCE(sum(CASE WHEN ev.landing_viewed>0 THEN 1 ELSE 0 END),0) AS landing_viewed,
  COALESCE(sum(CASE WHEN ev.landing_engaged>0 THEN 1 ELSE 0 END),0) AS landing_engaged,
  COALESCE(sum(CASE WHEN ev.profile_viewed>0 THEN 1 ELSE 0 END),0) AS profile_viewed,
  COALESCE(sum(CASE WHEN ev.cta_clicked>0 THEN 1 ELSE 0 END),0) AS cta_clicked,
  COALESCE(sum(CASE WHEN ev.checkout_created>0 THEN 1 ELSE 0 END),0) AS checkout_created,
  COALESCE(sum(CASE WHEN ev.paid>0 THEN 1 ELSE 0 END),0) AS paid,
  COALESCE(sum(CASE WHEN ev.goals_completed>0 THEN 1 ELSE 0 END),0) AS goals_completed,
  COALESCE(sum(CASE WHEN ev.plan_accepted>0 THEN 1 ELSE 0 END),0) AS plan_accepted
FROM base b LEFT JOIN ev ON ev.prospect_id = b.prospect_id
GROUP BY 1,2,3,4,5;

CREATE OR REPLACE VIEW public.v_activation_bottleneck
WITH (security_invoker = true) AS
WITH t AS (
  SELECT
    count(*) FILTER (WHERE outreach_sent_at IS NOT NULL OR outreach_status IN ('sent','delivered','sent_email')) AS sent,
    count(*) FILTER (WHERE outreach_delivered_at IS NOT NULL OR outreach_status IN ('delivered','sent_email')) AS delivered,
    count(*) FILTER (WHERE outreach_clicked_at IS NOT NULL) AS clicked
  FROM public.verified_contractor_prospects
), e AS (
  SELECT
    count(DISTINCT prospect_id) FILTER (WHERE event_type='landing_viewed') AS landing_viewed,
    count(DISTINCT prospect_id) FILTER (WHERE event_type='profile_viewed') AS profile_viewed,
    count(DISTINCT prospect_id) FILTER (WHERE event_type='checkout_cta_clicked') AS cta_clicked,
    count(DISTINCT prospect_id) FILTER (WHERE event_type IN ('checkout_created','checkout_opened')) AS checkout_created,
    count(DISTINCT prospect_id) FILTER (WHERE event_type IN ('payment_succeeded','paid')) AS paid,
    count(DISTINCT prospect_id) FILTER (WHERE event_type='goals_completed') AS goals_completed
  FROM public.pipeline_engagement_events
)
SELECT * FROM (
  SELECT 1 AS step_order,'sent→delivered' AS transition, t.sent AS from_count, t.delivered AS to_count,
         CASE WHEN t.sent>0 THEN round(100.0*t.delivered/t.sent,1) ELSE NULL END AS rate_pct FROM t
  UNION ALL SELECT 2,'delivered→clicked', t.delivered, t.clicked,
         CASE WHEN t.delivered>0 THEN round(100.0*t.clicked/t.delivered,1) END FROM t
  UNION ALL SELECT 3,'clicked→landing', t.clicked, e.landing_viewed,
         CASE WHEN t.clicked>0 THEN round(100.0*e.landing_viewed/t.clicked,1) END FROM t,e
  UNION ALL SELECT 4,'landing→profile', e.landing_viewed, e.profile_viewed,
         CASE WHEN e.landing_viewed>0 THEN round(100.0*e.profile_viewed/e.landing_viewed,1) END FROM e
  UNION ALL SELECT 5,'profile→cta', e.profile_viewed, e.cta_clicked,
         CASE WHEN e.profile_viewed>0 THEN round(100.0*e.cta_clicked/e.profile_viewed,1) END FROM e
  UNION ALL SELECT 6,'cta→checkout', e.cta_clicked, e.checkout_created,
         CASE WHEN e.cta_clicked>0 THEN round(100.0*e.checkout_created/e.cta_clicked,1) END FROM e
  UNION ALL SELECT 7,'checkout→paid', e.checkout_created, e.paid,
         CASE WHEN e.checkout_created>0 THEN round(100.0*e.paid/e.checkout_created,1) END FROM e
  UNION ALL SELECT 8,'paid→goals', e.paid, e.goals_completed,
         CASE WHEN e.paid>0 THEN round(100.0*e.goals_completed/e.paid,1) END FROM e
) s ORDER BY step_order;