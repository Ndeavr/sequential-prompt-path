CREATE OR REPLACE FUNCTION public.check_territory_availability(p_category_slugs text[], p_city_slugs text[])
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb := '[]'::jsonb;
  v_cat text;
  v_city text;
  v_status text;
  v_pressure integer;
  v_sig_count integer;
  v_elite_count integer;
  v_suggestions jsonb;
  v_city_name text;
  v_avail jsonb;
  v_remaining integer;
  v_data_status text;
BEGIN
  FOREACH v_cat IN ARRAY p_category_slugs LOOP
    FOREACH v_city IN ARRAY p_city_slugs LOOP
      SELECT name INTO v_city_name FROM public.cities WHERE slug = v_city;

      SELECT count(*) INTO v_sig_count
      FROM public.territories_locked
      WHERE category = v_cat AND city = v_city AND plan_level = 'signature';

      SELECT count(*) INTO v_elite_count
      FROM public.territories_locked
      WHERE category = v_cat AND city = v_city AND plan_level = 'elite';

      -- Real capacity, keyed by human city name (acq_territory_slots stores names)
      v_avail := public.territory_availability(v_cat, COALESCE(v_city_name, v_city));
      v_data_status := COALESCE(v_avail ->> 'status', 'unknown');

      IF v_data_status = 'verified' THEN
        v_remaining := (v_avail ->> 'remaining_slots')::int;
        v_pressure := COALESCE((v_avail ->> 'saturation_percent')::numeric, 0)::int;
      ELSE
        v_remaining := NULL;
        v_pressure := NULL;
      END IF;

      IF v_sig_count > 0 OR (v_remaining IS NOT NULL AND v_remaining <= 0) THEN
        v_status := 'locked';
      ELSIF v_elite_count > 0 OR (v_remaining IS NOT NULL AND v_pressure >= 50) THEN
        v_status := 'limited';
      ELSE
        v_status := 'available';
      END IF;

      v_suggestions := '[]'::jsonb;
      IF v_status = 'locked' THEN
        SELECT COALESCE(jsonb_agg(jsonb_build_object('name', c.name, 'slug', c.slug, 'population', c.population)), '[]'::jsonb)
        INTO v_suggestions
        FROM (
          SELECT name, slug, population
          FROM public.cities
          WHERE slug <> v_city AND is_active = true
            AND NOT EXISTS (
              SELECT 1 FROM public.territories_locked tl
              WHERE tl.category = v_cat AND tl.city = cities.slug AND tl.plan_level = 'signature'
            )
          ORDER BY population DESC
          LIMIT 3
        ) c;
      END IF;

      result := result || jsonb_build_array(jsonb_build_object(
        'category_slug', v_cat,
        'city_slug', v_city,
        'category_name', (SELECT name FROM public.categories WHERE slug = v_cat),
        'city_name', COALESCE(v_city_name, v_city),
        'status', v_status,
        'pressure_score', COALESCE(v_pressure, 0),
        'data_status', CASE WHEN v_data_status = 'verified' THEN 'verified' ELSE 'insufficient_data' END,
        'total_slots', (v_avail ->> 'max_slots'),
        'occupied_slots', (v_avail ->> 'occupied_slots'),
        'remaining_slots', v_remaining,
        'scarcity_level', (v_avail ->> 'scarcity_level'),
        'public_message', CASE WHEN v_data_status = 'verified' THEN (v_avail ->> 'public_message') ELSE NULL END,
        'suggestions', v_suggestions
      ));
    END LOOP;
  END LOOP;

  RETURN result;
END;
$function$;