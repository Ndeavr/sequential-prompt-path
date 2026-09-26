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
END; $$;

CREATE OR REPLACE FUNCTION public.fn_match_waiting_demand(_contractor_id uuid)
RETURNS TABLE(matched_count int, segments jsonb)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_count int := 0;
  v_segments jsonb := '[]'::jsonb;
  r record;
BEGIN
  FOR r IN
    SELECT DISTINCT d.city, d.category
    FROM public.demand_signals d
    WHERE d.status = 'waiting'
      AND EXISTS (
        SELECT 1 FROM public.contractor_service_areas csa
        WHERE csa.contractor_id = _contractor_id AND csa.city_name ILIKE d.city
      )
      AND EXISTS (
        SELECT 1 FROM public.contractor_services cs
        WHERE cs.contractor_id = _contractor_id AND cs.category ILIKE d.category
      )
  LOOP
    WITH upd AS (
      UPDATE public.demand_signals
      SET status = 'matched',
          matched_contractor_id = _contractor_id,
          updated_at = now()
      WHERE status = 'waiting'
        AND city = r.city
        AND category = r.category
      RETURNING id
    )
    SELECT COUNT(*) INTO v_count FROM upd;

    v_segments := v_segments || jsonb_build_object('city', r.city, 'category', r.category, 'count', v_count);
  END LOOP;

  SELECT COUNT(*) INTO v_count
  FROM public.demand_signals
  WHERE matched_contractor_id = _contractor_id AND status = 'matched';

  RETURN QUERY SELECT v_count, v_segments;
END; $$;

GRANT EXECUTE ON FUNCTION public.fn_match_waiting_demand(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.fn_refresh_market_demand(text, text) TO service_role;