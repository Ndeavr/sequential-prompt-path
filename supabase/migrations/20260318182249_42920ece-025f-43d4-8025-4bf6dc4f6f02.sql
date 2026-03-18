
-- =============================================
-- SEED: Trade Value Benchmarks (trade-level)
-- =============================================
INSERT INTO public.jve_trade_value_benchmarks (trade_id, min_value, median_value, max_value, emergency_value, premium_value, default_avg_value, confidence_score) VALUES
((SELECT id FROM public.jve_trades WHERE slug='isolation'),1500,4500,12000,6000,8000,4500,75),
((SELECT id FROM public.jve_trades WHERE slug='toiture'),5000,12000,35000,8000,20000,12000,80),
((SELECT id FROM public.jve_trades WHERE slug='plomberie'),300,2500,15000,1500,5000,2500,78),
((SELECT id FROM public.jve_trades WHERE slug='electricite'),400,3000,18000,1200,6000,3000,76),
((SELECT id FROM public.jve_trades WHERE slug='chauffage'),2000,5500,15000,4000,8000,5500,72),
((SELECT id FROM public.jve_trades WHERE slug='climatisation'),1500,4000,12000,3000,6000,4000,70),
((SELECT id FROM public.jve_trades WHERE slug='thermopompe'),3000,6000,18000,NULL,10000,6000,75),
((SELECT id FROM public.jve_trades WHERE slug='renovation-generale'),5000,25000,100000,NULL,50000,25000,65),
((SELECT id FROM public.jve_trades WHERE slug='renovation-cuisine'),8000,22000,65000,NULL,40000,22000,72),
((SELECT id FROM public.jve_trades WHERE slug='renovation-salle-de-bain'),5000,15000,45000,NULL,30000,15000,74),
((SELECT id FROM public.jve_trades WHERE slug='renovation-sous-sol'),8000,20000,60000,NULL,35000,20000,70),
((SELECT id FROM public.jve_trades WHERE slug='peinture'),800,3500,12000,2000,5000,3500,80),
((SELECT id FROM public.jve_trades WHERE slug='gypse'),1000,4000,15000,NULL,6000,4000,72),
((SELECT id FROM public.jve_trades WHERE slug='planchers'),2000,6000,20000,NULL,10000,6000,76),
((SELECT id FROM public.jve_trades WHERE slug='portes-fenetres'),3000,8000,30000,NULL,15000,8000,78),
((SELECT id FROM public.jve_trades WHERE slug='revetement-exterieur'),5000,12000,35000,NULL,20000,12000,72),
((SELECT id FROM public.jve_trades WHERE slug='excavation'),3000,10000,40000,8000,18000,10000,68),
((SELECT id FROM public.jve_trades WHERE slug='fondation'),4000,12000,45000,10000,25000,12000,70),
((SELECT id FROM public.jve_trades WHERE slug='drain-francais'),6000,14000,30000,12000,20000,14000,75),
((SELECT id FROM public.jve_trades WHERE slug='terrassement'),2000,6000,25000,NULL,10000,6000,65),
((SELECT id FROM public.jve_trades WHERE slug='pave-uni'),3000,8000,25000,NULL,12000,8000,70),
((SELECT id FROM public.jve_trades WHERE slug='paysagement'),1500,5000,20000,NULL,8000,5000,68),
((SELECT id FROM public.jve_trades WHERE slug='beton'),2000,7000,30000,NULL,12000,7000,70),
((SELECT id FROM public.jve_trades WHERE slug='maconnerie'),3000,10000,40000,NULL,18000,10000,68),
((SELECT id FROM public.jve_trades WHERE slug='demolition'),2000,8000,35000,5000,15000,8000,65),
((SELECT id FROM public.jve_trades WHERE slug='nettoyage-sinistre'),1500,5000,25000,8000,12000,5000,70),
((SELECT id FROM public.jve_trades WHERE slug='extermination'),200,600,3000,800,1500,600,82),
((SELECT id FROM public.jve_trades WHERE slug='inspection-batiment'),400,600,1200,NULL,900,600,88),
((SELECT id FROM public.jve_trades WHERE slug='architecte'),3000,8000,50000,NULL,20000,8000,65),
((SELECT id FROM public.jve_trades WHERE slug='technologue'),1500,4000,15000,NULL,8000,4000,68),
((SELECT id FROM public.jve_trades WHERE slug='ingenieur'),2000,6000,30000,NULL,15000,6000,65),
((SELECT id FROM public.jve_trades WHERE slug='notaire'),800,1500,5000,NULL,3000,1500,85),
((SELECT id FROM public.jve_trades WHERE slug='courtier-immobilier'),5000,12000,40000,NULL,20000,12000,72),
((SELECT id FROM public.jve_trades WHERE slug='evaluateur-agree'),400,700,1500,NULL,1000,700,85),
((SELECT id FROM public.jve_trades WHERE slug='avocat'),1000,3000,20000,NULL,8000,3000,65),
((SELECT id FROM public.jve_trades WHERE slug='arpenteur-geometre'),800,2000,6000,NULL,3500,2000,80),
((SELECT id FROM public.jve_trades WHERE slug='assurance-habitation'),800,1500,4000,NULL,2500,1500,75),
((SELECT id FROM public.jve_trades WHERE slug='gestion-copropriete'),2000,5000,15000,NULL,8000,5000,68),
((SELECT id FROM public.jve_trades WHERE slug='maintenance-immeuble'),500,2000,8000,1500,4000,2000,70),
((SELECT id FROM public.jve_trades WHERE slug='alarme-securite'),500,1500,5000,NULL,3000,1500,75),
((SELECT id FROM public.jve_trades WHERE slug='domotique'),1000,4000,15000,NULL,8000,4000,65),
((SELECT id FROM public.jve_trades WHERE slug='vitrerie'),300,1200,5000,1000,2500,1200,75),
((SELECT id FROM public.jve_trades WHERE slug='ramonage'),150,250,500,350,400,250,90),
((SELECT id FROM public.jve_trades WHERE slug='decontamination'),2000,6000,25000,8000,12000,6000,68),
((SELECT id FROM public.jve_trades WHERE slug='vermiculite'),2000,5000,12000,NULL,8000,5000,72),
((SELECT id FROM public.jve_trades WHERE slug='desamiantage'),3000,8000,30000,NULL,15000,8000,68),
((SELECT id FROM public.jve_trades WHERE slug='gouttieres'),500,1500,5000,1000,2500,1500,78),
((SELECT id FROM public.jve_trades WHERE slug='soffite-fascia'),1500,4000,12000,NULL,6000,4000,74),
((SELECT id FROM public.jve_trades WHERE slug='terrasse-balcon'),3000,8000,25000,NULL,12000,8000,72),
((SELECT id FROM public.jve_trades WHERE slug='pavage-asphalte'),2000,5000,20000,NULL,8000,5000,70),
((SELECT id FROM public.jve_trades WHERE slug='cloture'),1500,4000,12000,NULL,6000,4000,75),
((SELECT id FROM public.jve_trades WHERE slug='piscine'),5000,25000,80000,NULL,50000,25000,65),
((SELECT id FROM public.jve_trades WHERE slug='spa'),3000,8000,20000,NULL,12000,8000,70),
((SELECT id FROM public.jve_trades WHERE slug='toiture-plate'),4000,10000,25000,7000,15000,10000,76),
((SELECT id FROM public.jve_trades WHERE slug='membrane-elastomere'),3000,8000,20000,6000,12000,8000,76),
((SELECT id FROM public.jve_trades WHERE slug='calfeutrage'),300,800,3000,600,1500,800,82),
((SELECT id FROM public.jve_trades WHERE slug='restauration-degat-eau'),2000,8000,35000,12000,18000,8000,70),
((SELECT id FROM public.jve_trades WHERE slug='menuiserie'),1000,4000,15000,NULL,8000,4000,72),
((SELECT id FROM public.jve_trades WHERE slug='charpente'),3000,10000,40000,NULL,20000,10000,68),
((SELECT id FROM public.jve_trades WHERE slug='soudure'),500,2000,8000,1500,4000,2000,70),
((SELECT id FROM public.jve_trades WHERE slug='ferblanterie'),1000,3000,10000,2000,5000,3000,72);

-- =============================================
-- SEED: Trade Performance Defaults
-- =============================================
INSERT INTO public.jve_trade_performance_defaults (trade_id, default_closing_rate, low_closing_rate, high_closing_rate, default_profit_margin, low_profit_margin, high_profit_margin, default_monthly_capacity, low_monthly_capacity, high_monthly_capacity)
SELECT id,
  CASE
    WHEN slug IN ('ramonage','extermination','calfeutrage','inspection-batiment','evaluateur-agree') THEN 0.50
    WHEN slug IN ('plomberie','electricite','gouttieres','vitrerie','alarme-securite') THEN 0.35
    WHEN slug IN ('toiture','isolation','drain-francais','fondation','thermopompe') THEN 0.28
    WHEN slug IN ('renovation-generale','renovation-cuisine','renovation-salle-de-bain','renovation-sous-sol','piscine') THEN 0.22
    WHEN slug IN ('architecte','ingenieur','avocat','notaire') THEN 0.40
    ELSE 0.30
  END,
  CASE WHEN slug IN ('ramonage','extermination','calfeutrage') THEN 0.30 ELSE 0.12 END,
  CASE WHEN slug IN ('ramonage','extermination','calfeutrage') THEN 0.70 ELSE 0.55 END,
  CASE
    WHEN slug IN ('notaire','courtier-immobilier','evaluateur-agree','inspection-batiment') THEN 0.30
    WHEN slug IN ('peinture','nettoyage-sinistre','extermination','ramonage') THEN 0.25
    WHEN slug IN ('renovation-generale','renovation-cuisine','piscine') THEN 0.18
    ELSE 0.22
  END,
  0.10, 0.40,
  CASE
    WHEN slug IN ('ramonage','extermination','calfeutrage','inspection-batiment') THEN 25
    WHEN slug IN ('plomberie','electricite','vitrerie','gouttieres') THEN 15
    WHEN slug IN ('renovation-generale','renovation-cuisine','piscine','renovation-sous-sol') THEN 4
    WHEN slug IN ('toiture','fondation','drain-francais','excavation') THEN 6
    ELSE 10
  END,
  CASE WHEN slug IN ('renovation-generale','piscine') THEN 2 ELSE 3 END,
  CASE WHEN slug IN ('ramonage','extermination') THEN 60 ELSE 30 END
FROM public.jve_trades;

-- =============================================
-- RPC: get_avg_job_value
-- =============================================
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
  v_benchmark record;
  v_perf record;
  v_city record;
  v_factor record;
  v_city_mult numeric := 1.0;
  v_comp_mult numeric := 1.0;
  v_season_mult numeric := 1.0;
  v_urgency_mult numeric := 1.0;
  v_base_val numeric;
  v_final_val numeric;
  v_min_val numeric;
  v_med_val numeric;
  v_max_val numeric;
  v_confidence integer := 70;
  v_reasons jsonb := '[]'::jsonb;
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
    SELECT * INTO v_city FROM public.jve_cities WHERE slug = p_city_slug AND is_active = true;
    IF v_city.id IS NOT NULL THEN
      v_city_id := v_city.id;
      v_city_mult := COALESCE(v_city.cost_index, 1.0);
      v_comp_mult := COALESCE(v_city.competition_index, 1.0);
      v_season_mult := COALESCE(v_city.seasonality_index, 1.0);
    END IF;
  END IF;

  -- 1. Try specialty benchmark
  IF v_specialty_id IS NOT NULL THEN
    SELECT * INTO v_benchmark FROM public.jve_trade_value_benchmarks
      WHERE trade_id = v_trade_id AND specialty_id = v_specialty_id LIMIT 1;
    IF v_benchmark.id IS NOT NULL THEN
      v_reasons := v_reasons || '"Specialty-level benchmark used"'::jsonb;
    END IF;
  END IF;

  -- 2. Fallback to trade benchmark
  IF v_benchmark.id IS NULL THEN
    SELECT * INTO v_benchmark FROM public.jve_trade_value_benchmarks
      WHERE trade_id = v_trade_id AND specialty_id IS NULL LIMIT 1;
    v_reasons := v_reasons || '"Trade-level benchmark fallback"'::jsonb;
  END IF;

  IF v_benchmark.id IS NULL THEN
    RETURN jsonb_build_object('error', 'no_benchmark', 'trade_slug', p_trade_slug);
  END IF;

  v_base_val := v_benchmark.default_avg_value;
  v_min_val := v_benchmark.min_value;
  v_med_val := v_benchmark.median_value;
  v_max_val := v_benchmark.max_value;
  v_confidence := COALESCE(v_benchmark.confidence_score, 70);

  -- 3. City-specific factor override
  IF v_city_id IS NOT NULL THEN
    SELECT * INTO v_factor FROM public.jve_trade_city_factors
      WHERE trade_id = v_trade_id AND city_id = v_city_id
        AND (specialty_id IS NOT DISTINCT FROM v_specialty_id)
      LIMIT 1;

    IF v_factor.id IS NULL AND v_specialty_id IS NOT NULL THEN
      SELECT * INTO v_factor FROM public.jve_trade_city_factors
        WHERE trade_id = v_trade_id AND city_id = v_city_id AND specialty_id IS NULL
        LIMIT 1;
    END IF;

    IF v_factor.id IS NOT NULL THEN
      v_city_mult := COALESCE(v_factor.city_multiplier, v_city_mult);
      v_comp_mult := COALESCE(v_factor.competition_multiplier, v_comp_mult);
      v_season_mult := COALESCE(v_factor.seasonality_multiplier, v_season_mult);
      v_urgency_mult := COALESCE(v_factor.urgency_multiplier, 1.0);
      v_reasons := v_reasons || '"City-specific trade factor applied"'::jsonb;
    ELSE
      v_reasons := v_reasons || '"City base index applied"'::jsonb;
    END IF;
  END IF;

  -- 4. Emergency
  IF p_is_emergency AND v_benchmark.emergency_value IS NOT NULL THEN
    v_base_val := v_benchmark.emergency_value;
    v_urgency_mult := GREATEST(v_urgency_mult, 1.20);
    v_reasons := v_reasons || '"Emergency value + urgency multiplier"'::jsonb;
  END IF;

  -- 5. Premium
  IF p_is_premium AND v_benchmark.premium_value IS NOT NULL THEN
    v_base_val := GREATEST(v_base_val, v_benchmark.premium_value);
    v_reasons := v_reasons || '"Premium value tier applied"'::jsonb;
  END IF;

  -- Final calc
  v_final_val := ROUND(v_base_val * v_city_mult * v_comp_mult * v_season_mult * v_urgency_mult, 2);

  -- Performance defaults
  SELECT * INTO v_perf FROM public.jve_trade_performance_defaults
    WHERE trade_id = v_trade_id
      AND (specialty_id IS NOT DISTINCT FROM v_specialty_id)
    LIMIT 1;

  IF v_perf.id IS NULL THEN
    SELECT * INTO v_perf FROM public.jve_trade_performance_defaults
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
    'default_closing_rate', COALESCE(v_perf.default_closing_rate, 0.30),
    'default_profit_margin', COALESCE(v_perf.default_profit_margin, 0.22),
    'default_monthly_capacity', COALESCE(v_perf.default_monthly_capacity, 10),
    'confidence_score', v_confidence,
    'reasoning', v_reasons
  );
END;
$$;
