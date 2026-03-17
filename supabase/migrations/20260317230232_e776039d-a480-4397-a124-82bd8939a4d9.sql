
-- =========================================================
-- VIEW - computed availability
-- =========================================================
CREATE OR REPLACE VIEW public.v_territories AS
SELECT
  t.*,
  greatest(t.slots_signature - t.occupied_signature, 0) as available_signature,
  greatest(t.slots_elite - t.occupied_elite, 0) as available_elite,
  greatest(t.slots_premium - t.occupied_premium, 0) as available_premium,
  greatest(t.slots_pro - t.occupied_pro, 0) as available_pro,
  greatest(t.slots_recrue - t.occupied_recrue, 0) as available_recrue,
  (t.occupied_signature + t.occupied_elite + t.occupied_premium + t.occupied_pro + t.occupied_recrue) as occupied_total,
  greatest(
    (t.slots_signature + t.slots_elite + t.slots_premium + t.slots_pro + t.slots_recrue)
    - (t.occupied_signature + t.occupied_elite + t.occupied_premium + t.occupied_pro + t.occupied_recrue),
    0
  ) as available_total,
  CASE
    WHEN t.occupied_signature > t.slots_signature
      OR t.occupied_elite > t.slots_elite
      OR t.occupied_premium > t.slots_premium
      OR t.occupied_pro > t.slots_pro
      OR t.occupied_recrue > t.slots_recrue
      THEN true
    ELSE false
  END as is_overbooked
FROM public.territories t;

-- =========================================================
-- FUNCTION - get_territory_capacity
-- =========================================================
CREATE OR REPLACE FUNCTION public.get_territory_capacity(
  p_category_slug text,
  p_market_tier text,
  p_allow_signature_in_micro boolean default false
)
RETURNS TABLE (
  max_entrepreneurs integer,
  slots_signature integer,
  slots_elite integer,
  slots_premium integer,
  slots_pro integer,
  slots_recrue integer
)
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  base_max integer;
  base_signature integer;
  base_elite integer;
  base_premium integer;
  base_pro integer;
  base_recrue integer;
  coeff numeric := 1.0;
BEGIN
  IF p_category_slug IN (
    'toiture','isolation','drain-francais','fondation','excavation',
    'fenetres','portes-fenetres','electricien','plombier','thermopompe','hvac'
  ) THEN
    base_max := 12; base_signature := 1; base_elite := 2; base_premium := 3; base_pro := 3; base_recrue := 3;
  ELSIF p_category_slug IN (
    'peinture','plancher','cuisine','salle-de-bain','menuiserie',
    'renovation-generale','gypse','calfeutrage','paysagement'
  ) THEN
    base_max := 10; base_signature := 1; base_elite := 2; base_premium := 2; base_pro := 2; base_recrue := 3;
  ELSE
    base_max := 6; base_signature := 1; base_elite := 1; base_premium := 1; base_pro := 1; base_recrue := 2;
  END IF;

  coeff := CASE p_market_tier
    WHEN 'mega' THEN 1.8
    WHEN 'large' THEN 1.4
    WHEN 'medium' THEN 1.0
    WHEN 'small' THEN 0.7
    WHEN 'micro' THEN 0.5
    ELSE 1.0
  END;

  max_entrepreneurs := greatest(round(base_max * coeff), 2);
  slots_signature := greatest(round(base_signature * coeff), 0);
  slots_elite := greatest(round(base_elite * coeff), 0);
  slots_premium := greatest(round(base_premium * coeff), 0);
  slots_pro := greatest(round(base_pro * coeff), 0);
  slots_recrue := greatest(round(base_recrue * coeff), 1);

  IF p_market_tier = 'micro' AND NOT p_allow_signature_in_micro THEN
    slots_signature := 0;
  END IF;

  IF p_market_tier IN ('mega','large') AND slots_signature < 1 THEN
    slots_signature := 1;
  END IF;

  IF (slots_signature + slots_elite + slots_premium + slots_pro + slots_recrue) > max_entrepreneurs THEN
    max_entrepreneurs := slots_signature + slots_elite + slots_premium + slots_pro + slots_recrue;
  END IF;

  RETURN NEXT;
END;
$$;

-- =========================================================
-- FUNCTION - generate_territories
-- =========================================================
CREATE OR REPLACE FUNCTION public.generate_territories(
  p_city_slugs text[] default null,
  p_category_slugs text[] default null,
  p_mode text default 'create_missing',
  p_overwrite_existing_capacities boolean default false,
  p_generation_source text default 'admin_bulk_generator',
  p_executed_by uuid default null
)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  v_city record;
  v_category record;
  v_exists uuid;
  v_created integer := 0;
  v_updated integer := 0;
  v_skipped integer := 0;
  v_errors integer := 0;
  v_total integer := 0;
  v_payload jsonb;
  v_allow_signature_in_micro boolean := false;
  c_max integer; c_signature integer; c_elite integer;
  c_premium integer; c_pro integer; c_recrue integer;
BEGIN
  IF p_mode NOT IN ('dry_run','create_missing','upsert_all') THEN
    RAISE EXCEPTION 'Invalid p_mode: %', p_mode;
  END IF;

  SELECT coalesce((value->>'allow_signature_in_micro_markets')::boolean, false)
  INTO v_allow_signature_in_micro
  FROM public.system_settings WHERE key = 'territories';

  FOR v_city IN
    SELECT * FROM public.service_areas
    WHERE is_active = true AND (p_city_slugs IS NULL OR city_slug = ANY(p_city_slugs))
    ORDER BY city_name
  LOOP
    FOR v_category IN
      SELECT * FROM public.categories
      WHERE is_active = true AND (p_category_slugs IS NULL OR slug = ANY(p_category_slugs))
      ORDER BY priority ASC, name ASC
    LOOP
      v_total := v_total + 1;

      SELECT gt.max_entrepreneurs, gt.slots_signature, gt.slots_elite, gt.slots_premium, gt.slots_pro, gt.slots_recrue
      INTO c_max, c_signature, c_elite, c_premium, c_pro, c_recrue
      FROM public.get_territory_capacity(v_category.slug, v_city.market_tier, v_allow_signature_in_micro) gt;

      SELECT id INTO v_exists FROM public.territories
      WHERE city_slug = v_city.city_slug AND category_slug = v_category.slug LIMIT 1;

      IF p_mode = 'dry_run' THEN
        IF v_exists IS NULL THEN v_created := v_created + 1;
        ELSIF p_overwrite_existing_capacities THEN v_updated := v_updated + 1;
        ELSE v_skipped := v_skipped + 1;
        END IF;

      ELSIF v_exists IS NULL THEN
        INSERT INTO public.territories (
          city_slug, city_name, category_slug, category_name,
          province_code, region_name, market_tier,
          max_entrepreneurs, slots_signature, slots_elite, slots_premium, slots_pro, slots_recrue,
          generation_source, status, is_active
        ) VALUES (
          v_city.city_slug, v_city.city_name, v_category.slug, v_category.name,
          v_city.province_code, v_city.region_name, v_city.market_tier,
          c_max, c_signature, c_elite, c_premium, c_pro, c_recrue,
          p_generation_source, 'active', true
        );
        v_created := v_created + 1;

      ELSIF p_mode = 'upsert_all' THEN
        IF p_overwrite_existing_capacities THEN
          UPDATE public.territories SET
            city_name = v_city.city_name, category_name = v_category.name,
            province_code = v_city.province_code, region_name = v_city.region_name,
            market_tier = v_city.market_tier,
            max_entrepreneurs = c_max, slots_signature = c_signature, slots_elite = c_elite,
            slots_premium = c_premium, slots_pro = c_pro, slots_recrue = c_recrue,
            generation_source = p_generation_source
          WHERE id = v_exists;
        ELSE
          UPDATE public.territories SET
            city_name = v_city.city_name, category_name = v_category.name,
            province_code = v_city.province_code, region_name = v_city.region_name,
            market_tier = v_city.market_tier, generation_source = p_generation_source
          WHERE id = v_exists;
        END IF;
        v_updated := v_updated + 1;

      ELSE
        v_skipped := v_skipped + 1;
      END IF;
    END LOOP;
  END LOOP;

  v_payload := jsonb_build_object(
    'mode', p_mode, 'city_slugs', p_city_slugs, 'category_slugs', p_category_slugs,
    'overwrite_existing_capacities', p_overwrite_existing_capacities,
    'generation_source', p_generation_source
  );

  INSERT INTO public.territory_generation_logs (
    executed_by, cities_count, categories_count, total_combinations,
    created_count, updated_count, skipped_count, error_count, mode, payload
  ) VALUES (
    p_executed_by,
    coalesce(array_length(p_city_slugs, 1), (SELECT count(*) FROM public.service_areas WHERE is_active = true)::int),
    coalesce(array_length(p_category_slugs, 1), (SELECT count(*) FROM public.categories WHERE is_active = true)::int),
    v_total, v_created, v_updated, v_skipped, v_errors, p_mode, v_payload
  );

  RETURN jsonb_build_object(
    'success', true, 'mode', p_mode,
    'total_combinations', v_total, 'created_count', v_created,
    'updated_count', v_updated, 'skipped_count', v_skipped, 'error_count', v_errors
  );
END;
$$;
