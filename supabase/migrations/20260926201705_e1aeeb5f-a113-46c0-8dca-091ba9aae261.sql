CREATE OR REPLACE FUNCTION public.fn_refresh_market_demand(_city text, _category text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_homeowner_count int;
  v_total_projects int;
  v_est_revenue numeric;
  v_est_ltv numeric;
  v_avg_urgency numeric;
  v_avg_days numeric;
  v_last timestamptz;
  v_supply int;
  v_pressure numeric;
  v_gap numeric;
  v_slug text;
BEGIN
  SELECT
    COUNT(DISTINCT homeowner_id) FILTER (WHERE status = 'waiting'),
    COUNT(*) FILTER (WHERE status = 'waiting'),
    COALESCE(SUM(estimated_project_value) FILTER (WHERE status = 'waiting'), 0),
    COALESCE(SUM(estimated_ltv) FILTER (WHERE status = 'waiting'), 0),
    COALESCE(AVG(urgency_score) FILTER (WHERE status = 'waiting'), 0),
    COALESCE(AVG(EXTRACT(EPOCH FROM (now() - created_at))/86400.0) FILTER (WHERE status = 'waiting'), 0),
    MAX(created_at)
  INTO v_homeowner_count, v_total_projects, v_est_revenue, v_est_ltv, v_avg_urgency, v_avg_days, v_last
  FROM public.demand_signals
  WHERE city = _city AND category = _category;

  v_supply := 0;
  BEGIN
    SELECT COUNT(DISTINCT c.id) INTO v_supply
    FROM public.contractors c
    WHERE EXISTS (
      SELECT 1 FROM public.contractor_service_areas csa
      WHERE csa.contractor_id = c.id AND csa.city_name ILIKE _city
    )
    AND EXISTS (
      SELECT 1 FROM public.contractor_services cs
      WHERE cs.contractor_id = c.id AND cs.category ILIKE _category
    );
  EXCEPTION WHEN OTHERS THEN v_supply := 0;
  END;

  v_gap := GREATEST(0, v_homeowner_count - v_supply);
  v_pressure := v_homeowner_count
                * GREATEST(v_avg_urgency, 1)
                * GREATEST(v_est_revenue / NULLIF(v_total_projects,0), 1)
                * GREATEST(v_avg_days, 1);

  INSERT INTO public.market_demand (
    city, category, homeowner_count, total_projects, estimated_revenue,
    estimated_ltv, avg_urgency, supply_count, gap_score, pressure_score, last_signal_at, updated_at
  ) VALUES (
    _city, _category, v_homeowner_count, v_total_projects, v_est_revenue,
    v_est_ltv, v_avg_urgency, v_supply, v_gap, COALESCE(v_pressure,0), v_last, now()
  )
  ON CONFLICT (city, category) DO UPDATE SET
    homeowner_count = EXCLUDED.homeowner_count,
    total_projects = EXCLUDED.total_projects,
    estimated_revenue = EXCLUDED.estimated_revenue,
    estimated_ltv = EXCLUDED.estimated_ltv,
    avg_urgency = EXCLUDED.avg_urgency,
    supply_count = EXCLUDED.supply_count,
    gap_score = EXCLUDED.gap_score,
    pressure_score = EXCLUDED.pressure_score,
    last_signal_at = EXCLUDED.last_signal_at,
    updated_at = now();

  -- Recruitment target upsert
  v_slug := lower(regexp_replace(_category || '-' || _city, '[^a-z0-9]+', '-', 'g'));

  INSERT INTO public.contractor_recruitment_targets (
    city, category, waiting_count, estimated_revenue, estimated_ltv,
    pressure_score, priority_score, landing_slug, status
  ) VALUES (
    _city, _category, v_homeowner_count, v_est_revenue, v_est_ltv,
    COALESCE(v_pressure,0), COALESCE(v_pressure,0), v_slug,
    CASE
      WHEN v_homeowner_count = 0 THEN 'archived'
      WHEN v_supply = 0 THEN 'active'
      WHEN v_gap > 0 THEN 'recruiting'
      ELSE 'covered'
    END
  )
  ON CONFLICT (city, category) DO UPDATE SET
    waiting_count = EXCLUDED.waiting_count,
    estimated_revenue = EXCLUDED.estimated_revenue,
    estimated_ltv = EXCLUDED.estimated_ltv,
    pressure_score = EXCLUDED.pressure_score,
    priority_score = EXCLUDED.priority_score,
    status = EXCLUDED.status,
    updated_at = now();

  -- Reassign queue positions for waiting signals in this segment
  WITH ranked AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) AS pos
    FROM public.demand_signals
    WHERE city = _city AND category = _category AND status = 'waiting'
  )
  UPDATE public.demand_signals d
  SET position_in_queue = r.pos
  FROM ranked r WHERE d.id = r.id AND COALESCE(d.position_in_queue,-1) <> r.pos;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_refresh_market_demand(text, text) TO service_role;