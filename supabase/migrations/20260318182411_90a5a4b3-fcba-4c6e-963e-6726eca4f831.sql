
CREATE OR REPLACE FUNCTION public.get_avg_job_value(
  p_trade_slug text,
  p_specialty_slug text DEFAULT NULL,
  p_city_slug text DEFAULT NULL,
  p_is_emergency boolean DEFAULT false,
  p_is_premium boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trade_id uuid;
  v_specialty_id uuid;
  v_city_id uuid;
  v_bench_id uuid;
  v_base_val numeric;
  v_min_val numeric;
  v_med_val numeric;
  v_max_val numeric;
  v_emergency_val numeric;
  v_premium_val numeric;
  v_confidence integer := 70;
  v_city_mult numeric := 1.0;
  v_comp_mult numeric := 1.0;
  v_season_mult numeric := 1.0;
  v_urgency_mult numeric := 1.0;
  v_final_val numeric;
  v_closing numeric := 0.30;
  v_margin numeric := 0.22;
  v_capacity integer := 10;
  v_reasons jsonb := '[]'::jsonb;
  v_factor_id uuid;
  v_factor_city numeric;
  v_factor_comp numeric;
  v_factor_season numeric;
  v_factor_urg numeric;
BEGIN
  -- Resolve trade
  SELECT id INTO v_trade_id FROM public.jve_trades WHERE slug = p_trade_slug AND is_active = true;
  IF v_trade_id IS NULL THEN
    RETURN jsonb_build_object('error', 'trade_not_found', 'trade_slug', p_trade_slug);
  END IF;

  -- Resolve specialty
  IF p_specialty_slug IS NOT NULL THEN
    SELECT id INTO v_specialty_id FROM public.jve_trade_specialties
      WHERE slug = p_specialty_slug AND trade_id = v_trade_id AND is_active = true;
  END IF;

  -- Resolve city
  IF p_city_slug IS NOT NULL THEN
    SELECT id, cost_index, competition_index, seasonality_index
    INTO v_city_id, v_city_mult, v_comp_mult, v_season_mult
    FROM public.jve_cities WHERE slug = p_city_slug AND is_active = true;
    v_city_mult := COALESCE(v_city_mult, 1.0);
    v_comp_mult := COALESCE(v_comp_mult, 1.0);
    v_season_mult := COALESCE(v_season_mult, 1.0);
  END IF;

  -- 1. Try specialty benchmark
  IF v_specialty_id IS NOT NULL THEN
    SELECT id, default_avg_value, min_value, median_value, max_value, emergency_value, premium_value, confidence_score
    INTO v_bench_id, v_base_val, v_min_val, v_med_val, v_max_val, v_emergency_val, v_premium_val, v_confidence
    FROM public.jve_trade_value_benchmarks
    WHERE trade_id = v_trade_id AND specialty_id = v_specialty_id LIMIT 1;
    IF v_bench_id IS NOT NULL THEN
      v_reasons := v_reasons || '"Specialty-level benchmark used"'::jsonb;
    END IF;
  END IF;

  -- 2. Fallback to trade benchmark
  IF v_bench_id IS NULL THEN
    SELECT id, default_avg_value, min_value, median_value, max_value, emergency_value, premium_value, confidence_score
    INTO v_bench_id, v_base_val, v_min_val, v_med_val, v_max_val, v_emergency_val, v_premium_val, v_confidence
    FROM public.jve_trade_value_benchmarks
    WHERE trade_id = v_trade_id AND specialty_id IS NULL LIMIT 1;
    v_reasons := v_reasons || '"Trade-level benchmark fallback"'::jsonb;
  END IF;

  IF v_bench_id IS NULL THEN
    RETURN jsonb_build_object('error', 'no_benchmark', 'trade_slug', p_trade_slug);
  END IF;

  -- 3. City-specific factor override
  IF v_city_id IS NOT NULL THEN
    SELECT id, city_multiplier, competition_multiplier, seasonality_multiplier, urgency_multiplier
    INTO v_factor_id, v_factor_city, v_factor_comp, v_factor_season, v_factor_urg
    FROM public.jve_trade_city_factors
    WHERE trade_id = v_trade_id AND city_id = v_city_id
      AND (specialty_id IS NOT DISTINCT FROM v_specialty_id)
    LIMIT 1;

    IF v_factor_id IS NULL AND v_specialty_id IS NOT NULL THEN
      SELECT id, city_multiplier, competition_multiplier, seasonality_multiplier, urgency_multiplier
      INTO v_factor_id, v_factor_city, v_factor_comp, v_factor_season, v_factor_urg
      FROM public.jve_trade_city_factors
      WHERE trade_id = v_trade_id AND city_id = v_city_id AND specialty_id IS NULL
      LIMIT 1;
    END IF;

    IF v_factor_id IS NOT NULL THEN
      v_city_mult := COALESCE(v_factor_city, v_city_mult);
      v_comp_mult := COALESCE(v_factor_comp, v_comp_mult);
      v_season_mult := COALESCE(v_factor_season, v_season_mult);
      v_urgency_mult := COALESCE(v_factor_urg, 1.0);
      v_reasons := v_reasons || '"City-specific trade factor applied"'::jsonb;
    ELSE
      v_reasons := v_reasons || '"City base index applied"'::jsonb;
    END IF;
  END IF;

  -- 4. Emergency
  IF p_is_emergency AND v_emergency_val IS NOT NULL THEN
    v_base_val := v_emergency_val;
    v_urgency_mult := GREATEST(v_urgency_mult, 1.20);
    v_reasons := v_reasons || '"Emergency value + urgency multiplier"'::jsonb;
  END IF;

  -- 5. Premium
  IF p_is_premium AND v_premium_val IS NOT NULL THEN
    v_base_val := GREATEST(v_base_val, v_premium_val);
    v_reasons := v_reasons || '"Premium value tier applied"'::jsonb;
  END IF;

  v_final_val := ROUND(v_base_val * v_city_mult * v_comp_mult * v_season_mult * v_urgency_mult, 2);

  -- Performance defaults
  SELECT default_closing_rate, default_profit_margin, default_monthly_capacity
  INTO v_closing, v_margin, v_capacity
  FROM public.jve_trade_performance_defaults
  WHERE trade_id = v_trade_id AND (specialty_id IS NOT DISTINCT FROM v_specialty_id)
  LIMIT 1;

  IF v_closing IS NULL THEN
    SELECT default_closing_rate, default_profit_margin, default_monthly_capacity
    INTO v_closing, v_margin, v_capacity
    FROM public.jve_trade_performance_defaults
    WHERE trade_id = v_trade_id AND specialty_id IS NULL LIMIT 1;
  END IF;

  RETURN jsonb_build_object(
    'trade_slug', p_trade_slug,
    'specialty_slug', p_specialty_slug,
    'city_slug', p_city_slug,
    'base_avg_value', v_base_val,
    'city_multiplier', v_city_mult,
    'competition_multiplier', v_comp_mult,
    'seasonality_multiplier', v_season_mult,
    'urgency_multiplier', v_urgency_mult,
    'final_avg_value', v_final_val,
    'min_value', v_min_val,
    'median_value', v_med_val,
    'max_value', v_max_val,
    'default_closing_rate', COALESCE(v_closing, 0.30),
    'default_profit_margin', COALESCE(v_margin, 0.22),
    'default_monthly_capacity', COALESCE(v_capacity, 10),
    'confidence_score', COALESCE(v_confidence, 70),
    'reasoning', v_reasons
  );
END;
$$;
