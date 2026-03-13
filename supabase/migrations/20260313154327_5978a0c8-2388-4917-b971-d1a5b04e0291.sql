
-- Fix view to use security invoker instead of definer
DROP VIEW IF EXISTS public.v_contractor_full_public;
CREATE VIEW public.v_contractor_full_public
WITH (security_invoker = true)
AS
SELECT
  c.id,
  c.business_name,
  c.slug,
  c.specialty,
  c.description,
  c.city,
  c.province,
  c.logo_url,
  c.rating,
  c.review_count,
  c.years_experience,
  c.aipp_score,
  c.verification_status,
  pp.is_published,
  pp.seo_title,
  pp.seo_description,
  pp.faq,
  pp.slug AS page_slug,
  ai.summary_fr,
  ai.summary_en,
  ai.best_for,
  ai.not_ideal_for,
  ai.recommendation_reasons,
  ai.personality_tags
FROM public.contractors c
LEFT JOIN public.contractor_public_pages pp ON pp.contractor_id = c.id
LEFT JOIN public.contractor_ai_profiles ai ON ai.contractor_id = c.id AND ai.is_current = true
WHERE pp.is_published = true;
