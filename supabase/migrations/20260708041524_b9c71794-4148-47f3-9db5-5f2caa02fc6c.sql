-- Fix #4: recommendation view joins on plan UUID, not code
DROP VIEW IF EXISTS public.v_contractor_recommendation_score;
CREATE VIEW public.v_contractor_recommendation_score
WITH (security_invoker=on) AS
SELECT
  c.id AS contractor_id,
  COALESCE(p.code, 'recrue'::text) AS plan_code,
  COALESCE(p.visibility_multiplier, 1.0) AS visibility_multiplier,
  COALESCE(p.recommendation_multiplier, 1.0) AS recommendation_multiplier,
  COALESCE(p.ai_index_priority, 50) AS ai_index_priority,
  round(
    COALESCE(c.rating, 0::numeric) * 20::numeric * 0.25
    + COALESCE((
        SELECT count(*) FROM public.profile_ai_citation_history ach
        WHERE ach.contractor_id = c.id AND ach.cited_at > (now() - '90 days'::interval)
      ), 0::bigint)::numeric * 0.20
    + LEAST(COALESCE(c.review_count, 0), 100)::numeric * 0.15
    + 50::numeric * 0.10
    + COALESCE(p.recommendation_multiplier, 1.0) * 20::numeric * 0.30,
    2
  ) AS recommendation_score
FROM public.contractors c
LEFT JOIN public.contractor_subscriptions cs
  ON cs.contractor_id = c.id AND cs.status = 'active'
LEFT JOIN public.plans p
  ON (p.code = cs.plan_id OR p.id::text = cs.plan_id);

-- Fix #2 + Fix #1 backfill for the recently activated contractor
UPDATE public.contractors
SET
  booking_enabled = true,
  booking_page_published = true,
  slug = COALESCE(NULLIF(slug, ''), 'pro-' || substring(id::text, 1, 8)),
  updated_at = now()
WHERE id = '72bc8179-d836-497d-8114-e0fcd773281b';