-- Commitments: capacity actually sold per service x city
CREATE TABLE IF NOT EXISTS public.market_capacity_commitments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid NOT NULL,
  subscription_id uuid,
  quote_id uuid,
  plan_code text NOT NULL,
  service_slug text NOT NULL,
  city_slug text NOT NULL,
  appointments_committed integer NOT NULL DEFAULT 0,
  exclusive boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'active',
  released_at timestamptz,
  release_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT market_capacity_commitments_status_chk CHECK (status IN ('active','released'))
);
CREATE INDEX IF NOT EXISTS mcc_market_idx ON public.market_capacity_commitments (service_slug, city_slug, status);
CREATE INDEX IF NOT EXISTS mcc_contractor_idx ON public.market_capacity_commitments (contractor_id, status);
-- One active exclusivity per service x city (inventory-backed exclusivity)
CREATE UNIQUE INDEX IF NOT EXISTS mcc_exclusive_uidx
  ON public.market_capacity_commitments (service_slug, city_slug)
  WHERE exclusive AND status = 'active';
-- One active commitment per contractor x market
CREATE UNIQUE INDEX IF NOT EXISTS mcc_contractor_market_uidx
  ON public.market_capacity_commitments (contractor_id, service_slug, city_slug)
  WHERE status = 'active';

GRANT SELECT ON public.market_capacity_commitments TO authenticated;
GRANT ALL ON public.market_capacity_commitments TO service_role;
ALTER TABLE public.market_capacity_commitments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "mcc_owner_or_admin_read" ON public.market_capacity_commitments;
CREATE POLICY "mcc_owner_or_admin_read" ON public.market_capacity_commitments
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR contractor_id = public.current_contractor_id());
DROP POLICY IF EXISTS "mcc_admin_write" ON public.market_capacity_commitments
;
CREATE POLICY "mcc_admin_write" ON public.market_capacity_commitments
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Refresh market capacity from real configuration + real commitments
CREATE OR REPLACE FUNCTION public.refresh_market_capacity()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected integer := 0;
BEGIN
  INSERT INTO public.market_capacity AS mc (
    city, specialty, city_slug, service_slug, max_slots, max_contractors,
    active_contractors, committed_appointments, estimated_monthly_demand,
    remaining_positions, capacity_score, capacity_status, capacity_explanation, market_open, updated_at
  )
  SELECT
    t.city_name,
    t.category_name,
    t.city_slug,
    t.category_slug,
    t.max_entrepreneurs,
    t.max_entrepreneurs,
    COALESCE(c.contractors, 0),
    COALESCE(c.appointments, 0),
    COALESCE(t.demand_score, 0)::int,
    GREATEST(t.max_entrepreneurs - COALESCE(c.contractors, 0), 0),
    CASE WHEN t.max_entrepreneurs > 0
         THEN ROUND(COALESCE(c.contractors, 0)::numeric / t.max_entrepreneurs, 4)
         ELSE 1 END,
    CASE
      WHEN t.status <> 'active' OR t.max_entrepreneurs = 0 THEN 'CLOSED'
      WHEN COALESCE(c.contractors, 0) >= t.max_entrepreneurs THEN 'OVER_SUPPLIED'
      WHEN COALESCE(c.contractors, 0)::numeric / t.max_entrepreneurs < 0.6 THEN 'UNDER_SUPPLIED'
      ELSE 'BALANCED'
    END,
    jsonb_build_object(
      'source', 'territories+commitments',
      'max_contractors', t.max_entrepreneurs,
      'active_contractors', COALESCE(c.contractors, 0),
      'committed_appointments', COALESCE(c.appointments, 0),
      'demand_score_available', t.demand_score IS NOT NULL,
      'computed_at', now()
    ),
    t.status = 'active' AND t.max_entrepreneurs > 0,
    now()
  FROM public.territories t
  LEFT JOIN (
    SELECT service_slug, city_slug,
           COUNT(*)::int AS contractors,
           COALESCE(SUM(appointments_committed), 0)::int AS appointments
      FROM public.market_capacity_commitments
     WHERE status = 'active'
     GROUP BY service_slug, city_slug
  ) c ON c.service_slug = t.category_slug AND c.city_slug = t.city_slug
  WHERE t.city_slug IS NOT NULL AND t.category_slug IS NOT NULL
  ON CONFLICT (service_slug, city_slug) DO UPDATE SET
    city = EXCLUDED.city,
    specialty = EXCLUDED.specialty,
    max_slots = EXCLUDED.max_slots,
    max_contractors = EXCLUDED.max_contractors,
    active_contractors = EXCLUDED.active_contractors,
    committed_appointments = EXCLUDED.committed_appointments,
    estimated_monthly_demand = EXCLUDED.estimated_monthly_demand,
    remaining_positions = EXCLUDED.remaining_positions,
    capacity_score = EXCLUDED.capacity_score,
    capacity_status = EXCLUDED.capacity_status,
    capacity_explanation = EXCLUDED.capacity_explanation,
    market_open = EXCLUDED.market_open,
    updated_at = now();

  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$;

REVOKE ALL ON FUNCTION public.refresh_market_capacity() FROM public;
GRANT EXECUTE ON FUNCTION public.refresh_market_capacity() TO service_role;