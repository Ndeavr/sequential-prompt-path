CREATE OR REPLACE VIEW public.v_pipeline_funnel_counts AS
SELECT
  (SELECT count(*) FROM contractor_prospects) AS scraped,
  (SELECT count(*) FROM contractor_prospects
     WHERE phone IS NOT NULL OR email IS NOT NULL) AS contactable,
  (SELECT count(*) FROM outreach_targets
     WHERE landing_status = ANY (ARRAY['prepared','ready','queued'])) AS outreach_queued,
  (SELECT count(*) FROM v_prospect_funnel WHERE sms_sent > 0) AS sent,
  (SELECT count(*) FROM v_prospect_funnel WHERE sms_delivered > 0) AS delivered,
  (SELECT count(*) FROM v_prospect_funnel WHERE clicked_at IS NOT NULL) AS clicked,
  (SELECT count(*) FROM v_prospect_funnel WHERE landing_at IS NOT NULL) AS onboarding_started,
  (SELECT count(*) FROM v_prospect_funnel WHERE registered_at IS NOT NULL) AS onboarding_completed,
  (SELECT count(*) FROM v_prospect_funnel WHERE checkout_at IS NOT NULL) AS payment_started,
  (SELECT count(*) FROM v_prospect_funnel WHERE paid_at IS NOT NULL) AS paid,
  (SELECT count(*) FROM v_prospect_funnel WHERE paid_at IS NOT NULL AND revenue_cents > 0) AS activated,
  (SELECT count(*) FROM contractor_matching_status WHERE is_eligible = true) AS recommendable;