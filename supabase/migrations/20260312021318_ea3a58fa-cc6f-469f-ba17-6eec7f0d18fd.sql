
-- Fix security definer views by making them security invoker
DROP VIEW IF EXISTS public.v_contractor_public_profile;
DROP VIEW IF EXISTS public.v_match_results_safe;

CREATE VIEW public.v_contractor_public_profile WITH (security_invoker = on) AS
SELECT
  c.id, c.business_name, c.specialty, c.city, c.province, c.rating, c.review_count,
  c.verification_status, c.logo_url, c.years_experience, c.portfolio_urls, c.description,
  cps.unpro_score, cps.aipp_score, cps.trust_score, cps.visibility_score, cps.profile_completeness_score,
  ri.overall_sentiment_score AS review_sentiment, ri.confidence_level AS review_confidence,
  ri.top_positive_themes, ri.top_negative_themes, ri.summary_fr AS review_summary_fr, ri.summary_en AS review_summary_en
FROM public.contractors c
LEFT JOIN public.contractor_public_scores cps ON cps.contractor_id = c.id
LEFT JOIN public.review_insights ri ON ri.contractor_id = c.id
WHERE c.verification_status = 'verified';

CREATE VIEW public.v_match_results_safe WITH (security_invoker = on) AS
SELECT
  me.id, me.user_id, me.project_id, me.property_id, me.contractor_id,
  me.recommendation_score, me.success_probability, me.conflict_risk_score,
  me.ccai_score, me.dna_fit_score, me.project_fit_score, me.property_fit_score,
  me.budget_fit_score, me.availability_score, me.unpro_score_snapshot, me.aipp_score_snapshot,
  me.explanations, me.created_at,
  c.business_name, c.specialty, c.city, c.province, c.logo_url, c.rating, c.review_count,
  c.verification_status, c.years_experience
FROM public.match_evaluations me
JOIN public.contractors c ON c.id = me.contractor_id;
