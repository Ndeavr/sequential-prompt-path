ALTER TABLE public.verified_contractor_prospects
  ADD COLUMN IF NOT EXISTS region text;

UPDATE public.verified_contractor_prospects v
SET region = r.region,
    city = COALESCE(v.city, r.municipality, r.city)
FROM public.official_source_records r
WHERE r.prospect_id = v.id
  AND r.region IS NOT NULL
  AND (v.region IS DISTINCT FROM r.region OR v.city IS NULL);

CREATE INDEX IF NOT EXISTS idx_vcp_region_category
  ON public.verified_contractor_prospects (region, category)
  WHERE outreach_status = 'none';

DROP VIEW IF EXISTS public.v_recruitment_coverage_gaps;
CREATE VIEW public.v_recruitment_coverage_gaps
WITH (security_invoker = true) AS
WITH demand AS (
  SELECT
    md.city,
    NULL::text AS region,
    'city'::text AS geo_kind,
    'demand'::text AS basis,
    md.category,
    md.homeowner_count::bigint AS homeowner_count,
    md.total_projects::bigint AS total_projects,
    md.estimated_revenue::numeric AS estimated_revenue,
    md.avg_urgency::numeric AS avg_urgency,
    md.supply_count::bigint AS supply_count,
    md.gap_score::numeric AS gap_score,
    md.pressure_score::numeric AS pressure_score,
    md.last_signal_at,
    crt.waiting_count::bigint AS waiting_count,
    crt.priority_score::numeric AS target_priority_score,
    0::bigint AS ready_prospects,
    round(
      COALESCE(md.gap_score, 0::numeric) * 0.35
      + LEAST(COALESCE(md.homeowner_count, 0), 100)::numeric * 0.25
      + GREATEST(0, 20 - COALESCE(md.supply_count, 0))::numeric * 1.5
      + LEAST(COALESCE(md.estimated_revenue, 0::numeric) / 10000.0, 20::numeric) * 0.5
      + COALESCE(md.avg_urgency, 0::numeric) * 2.0, 2) AS opportunity_score,
    jsonb_build_object(
      'basis', 'demand',
      'gap_score', md.gap_score,
      'homeowner_demand', md.homeowner_count,
      'supply_shortage', GREATEST(0, 20 - COALESCE(md.supply_count, 0)),
      'revenue_value', md.estimated_revenue,
      'urgency', md.avg_urgency,
      'waiting_count', crt.waiting_count) AS score_reasons
  FROM public.market_demand md
  LEFT JOIN public.contractor_recruitment_targets crt
    ON lower(crt.city) = lower(md.city) AND lower(crt.category) = lower(md.category)
),
inventory AS (
  SELECT
    COALESCE(v.city, v.region) AS city,
    v.region,
    CASE WHEN v.city IS NOT NULL THEN 'city' ELSE 'region' END AS geo_kind,
    v.category,
    count(*)::bigint AS ready_prospects
  FROM public.verified_contractor_prospects v
  WHERE v.outreach_status = 'none'
    AND v.verification_status = 'verified'
    AND COALESCE(v.data_quality_score, 0) >= 80
    AND v.category IS NOT NULL
    AND COALESCE(v.city, v.region) IS NOT NULL
    AND (v.website_url IS NOT NULL OR v.google_business_url IS NOT NULL
         OR v.google_place_id IS NOT NULL OR v.phone_source_url IS NOT NULL)
    AND (v.sms_eligibility_tier IN ('A','B','C') OR v.email IS NOT NULL)
  GROUP BY 1, 2, 3, 4
),
inventory_scored AS (
  SELECT
    i.city,
    i.region,
    i.geo_kind,
    'recruitment_ready_inventory'::text AS basis,
    i.category,
    0::bigint AS homeowner_count,
    0::bigint AS total_projects,
    0::numeric AS estimated_revenue,
    0::numeric AS avg_urgency,
    COALESCE(s.supply_count, 0)::bigint AS supply_count,
    0::numeric AS gap_score,
    0::numeric AS pressure_score,
    NULL::timestamptz AS last_signal_at,
    NULL::bigint AS waiting_count,
    NULL::numeric AS target_priority_score,
    i.ready_prospects,
    round(
      LEAST(i.ready_prospects, 50)::numeric * 0.6
      + GREATEST(0, 10 - COALESCE(s.supply_count, 0))::numeric * 1.2, 2) AS opportunity_score,
    jsonb_build_object(
      'basis', 'recruitment_ready_inventory',
      'ready_prospects', i.ready_prospects,
      'unpro_supply', COALESCE(s.supply_count, 0),
      'geo_kind', i.geo_kind) AS score_reasons
  FROM inventory i
  LEFT JOIN LATERAL (
    SELECT count(*)::bigint AS supply_count
    FROM public.contractors c
    WHERE lower(COALESCE(c.city, '')) = lower(i.city)
  ) s ON true
  WHERE COALESCE(s.supply_count, 0) < 10
)
SELECT * FROM demand
UNION ALL
SELECT * FROM inventory_scored;

GRANT SELECT ON public.v_recruitment_coverage_gaps TO authenticated;
GRANT SELECT ON public.v_recruitment_coverage_gaps TO service_role;