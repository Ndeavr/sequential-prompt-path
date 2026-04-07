
-- Add rbq_required to categories if not exists
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS rbq_required boolean NOT NULL DEFAULT false;

-- Update known RBQ-required categories
UPDATE public.categories SET rbq_required = true WHERE slug IN ('electricien', 'plombier', 'hvac', 'thermopompe', 'ventilation');

-- Create availability_cache table
CREATE TABLE IF NOT EXISTS public.availability_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_slug text NOT NULL,
  city_slug text NOT NULL,
  status text NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'limited', 'locked')),
  pressure_score integer NOT NULL DEFAULT 0 CHECK (pressure_score >= 0 AND pressure_score <= 100),
  suggestions jsonb DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(category_slug, city_slug)
);

ALTER TABLE public.availability_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read availability cache"
  ON public.availability_cache FOR SELECT
  USING (true);

CREATE POLICY "Only admins can modify availability cache"
  ON public.availability_cache FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Add unique index on territories_locked to prevent duplicate locks
CREATE UNIQUE INDEX IF NOT EXISTS idx_territories_locked_cat_city_plan
  ON public.territories_locked (category, city, plan_level);

-- Create function to check territory availability
CREATE OR REPLACE FUNCTION public.check_territory_availability(
  p_category_slugs text[],
  p_city_slugs text[]
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result jsonb := '[]'::jsonb;
  v_cat text;
  v_city text;
  v_status text;
  v_pressure integer;
  v_sig_count integer;
  v_elite_count integer;
  v_suggestions jsonb;
  v_city_record record;
BEGIN
  FOREACH v_cat IN ARRAY p_category_slugs LOOP
    FOREACH v_city IN ARRAY p_city_slugs LOOP
      -- Check existing locks
      SELECT count(*) INTO v_sig_count
      FROM public.territories_locked
      WHERE category = v_cat AND city = v_city AND plan_level = 'signature';

      SELECT count(*) INTO v_elite_count
      FROM public.territories_locked
      WHERE category = v_cat AND city = v_city AND plan_level = 'elite';

      -- Determine status
      IF v_sig_count > 0 THEN
        v_status := 'locked';
      ELSIF v_elite_count > 0 THEN
        v_status := 'limited';
      ELSE
        v_status := 'available';
      END IF;

      -- Calculate pressure score (simulated based on city population + lock count)
      SELECT LEAST(100, GREATEST(0,
        COALESCE((SELECT population FROM public.cities WHERE slug = v_city), 50000)::numeric / 20000 +
        (v_sig_count + v_elite_count) * 30 +
        (random() * 15)::integer
      ))::integer INTO v_pressure;

      -- Get nearby city suggestions if locked
      v_suggestions := '[]'::jsonb;
      IF v_status = 'locked' THEN
        SELECT COALESCE(jsonb_agg(jsonb_build_object('name', c.name, 'slug', c.slug, 'population', c.population)), '[]'::jsonb)
        INTO v_suggestions
        FROM (
          SELECT name, slug, population
          FROM public.cities
          WHERE slug != v_city AND is_active = true
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
        'city_name', (SELECT name FROM public.cities WHERE slug = v_city),
        'status', v_status,
        'pressure_score', v_pressure,
        'suggestions', v_suggestions
      ));
    END LOOP;
  END LOOP;

  RETURN result;
END;
$$;
