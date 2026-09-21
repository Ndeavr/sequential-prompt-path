CREATE OR REPLACE VIEW public.v_outreach_funnel_kpis
WITH (security_invoker = true) AS
WITH real_prospects AS (
  SELECT p.*
  FROM public.verified_contractor_prospects p
  WHERE lower(coalesce(p.source, '')) NOT IN ('test', 'synthetic', 'e2e')
    AND lower(coalesce(p.business_name, '')) NOT LIKE 'e2e %'
    AND lower(coalesce(p.business_name, '')) NOT LIKE 'test %'
),
real_events AS (
  SELECT e.*
  FROM public.v_contractor_funnel_real e
  WHERE e.prospect_id IS NOT NULL
)
SELECT
  (SELECT count(*) FROM real_prospects) AS scraped,
  (SELECT count(*) FROM real_prospects p
    WHERE p.verification_status = 'verified'
      AND p.sms_eligible = true
      AND p.sms_eligibility_tier IN ('A','B','C')
      AND coalesce(p.outreach_status, 'none') = 'none') AS ready_to_contact,
  (SELECT count(*) FROM real_prospects p WHERE p.outreach_status = 'queued') AS sms_queued,
  (SELECT count(*) FROM real_prospects p
    WHERE p.outreach_sent_at IS NOT NULL OR p.outreach_status IN ('sent','delivered','clicked','activated')) AS sms_sent,
  (SELECT count(*) FROM real_prospects p
    WHERE p.outreach_delivered_at IS NOT NULL OR p.outreach_status IN ('delivered','clicked','activated')) AS sms_delivered,
  (SELECT count(*) FROM real_prospects p WHERE p.outreach_status = 'failed') AS sms_failed,
  (SELECT count(*) FROM real_prospects p
    WHERE p.outreach_clicked_at IS NOT NULL OR p.outreach_status IN ('clicked','activated')) AS sms_clicked,
  (SELECT count(DISTINCT e.prospect_id) FROM real_events e
    WHERE e.event_type IN ('landing_view','activation_link_opened','activation_page_rendered')) AS landing_viewed,
  (SELECT count(DISTINCT e.prospect_id) FROM real_events e
    WHERE e.event_type IN ('auth_started','otp_requested','otp_sent','otp_verified','account_created')) AS signup_started,
  (SELECT count(DISTINCT e.prospect_id) FROM real_events e
    WHERE e.event_type IN ('profile_started','contractor_profile_created','profile_claimed','onboarding_started')) AS profile_started,
  (SELECT count(DISTINCT e.prospect_id) FROM real_events e
    WHERE e.event_type IN ('checkout_started','payment_started')) AS checkout_started,
  (SELECT count(DISTINCT e.prospect_id) FROM real_events e
    WHERE e.event_type IN ('payment_completed','stripe_payment_succeeded')) AS paid_1_dollar,
  (SELECT count(DISTINCT e.prospect_id) FROM real_events e
    WHERE e.event_type IN ('profile_activated','onboarding_completed')) AS activated,
  (SELECT count(*) FROM real_prospects p WHERE p.outreach_status = 'activated') AS recommendable;

GRANT SELECT ON public.v_outreach_funnel_kpis TO authenticated;
GRANT SELECT ON public.v_outreach_funnel_kpis TO service_role;