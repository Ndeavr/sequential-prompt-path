-- Read model only: reconstruct historic visits without changing attribution or commissions.
CREATE OR REPLACE FUNCTION public.get_affiliate_visit_stats(p_affiliate_id uuid DEFAULT NULL)
RETURNS TABLE(affiliate_id uuid, total_sessions bigint, internal_sessions bigint, attributed_sessions bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH codes AS (
    SELECT lower(btrim(code)) AS code, min(id::text)::uuid AS affiliate_id
    FROM public.affiliates a
    CROSS JOIN LATERAL unnest(ARRAY[a.referral_code, a.slug]) AS code
    WHERE nullif(btrim(code), '') IS NOT NULL
    GROUP BY lower(btrim(code))
    HAVING count(DISTINCT id) = 1
  ), allowed AS (
    SELECT a.id, a.user_id FROM public.affiliates a
    WHERE auth.uid() IS NOT NULL
      AND (a.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
      AND (p_affiliate_id IS NULL OR a.id = p_affiliate_id)
  ), visits AS (
    SELECT visit.session_id, min(c.affiliate_id::text)::uuid AS affiliate_id
    FROM codes c JOIN public.contractor_funnel_events visit
      ON lower(btrim(visit.affiliate_code)) = c.code
    WHERE visit.event_type IN ('landing_view', 'landing_viewed', 'ai_audit_viewed')
      AND nullif(btrim(visit.session_id), '') IS NOT NULL
    GROUP BY visit.session_id HAVING count(DISTINCT c.affiliate_id) = 1
  ), sessions AS (
    SELECT a.id, f.session_id,
      bool_or(coalesce(f.is_test, false) OR nullif(btrim(f.internal_reason), '') IS NOT NULL
        OR coalesce(f.user_id = a.user_id, false)
        OR EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = f.user_id AND r.role = 'admin')
        OR EXISTS (SELECT 1 FROM public.funnel_internal_actors i WHERE i.user_id = f.user_id AND i.is_active)) AS internal
    FROM allowed a
    JOIN visits visit ON visit.affiliate_id = a.id
    -- Inspect the whole session: identity/test flags may arrive after the landing event.
    JOIN public.contractor_funnel_events f ON f.session_id = visit.session_id
    GROUP BY a.id, f.session_id
  )
  SELECT a.id, count(s.session_id), count(s.session_id) FILTER (WHERE s.internal),
    count(s.session_id) FILTER (WHERE NOT s.internal)
  FROM allowed a LEFT JOIN sessions s ON s.id = a.id GROUP BY a.id;
$$;
REVOKE ALL ON FUNCTION public.get_affiliate_visit_stats(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_affiliate_visit_stats(uuid) TO authenticated;
COMMENT ON FUNCTION public.get_affiliate_visit_stats(uuid) IS
  'All-time attributed browser sessions; paired landing/audit events deduplicated. Internal identifiable sessions separate. Own affiliate or admin only. No conversion/payment inference.';
