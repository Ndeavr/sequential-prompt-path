-- 1) Real, conservative market capacity configuration (no fake contractors/demand)
INSERT INTO public.acq_territory_slots (city, trade, max_slots, used_slots, lock_status)
VALUES ('Laval', 'plomberie', 6, 0, 'open'),
       ('Montréal', 'plomberie', 8, 0, 'open')
ON CONFLICT (city, trade) DO UPDATE
  SET max_slots = EXCLUDED.max_slots,
      updated_at = now();

-- 2) Occupancy comes ONLY from real paid contractors
CREATE OR REPLACE FUNCTION public.territory_paid_occupancy(_trade text, _city text)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT count(*)::int
  FROM public.contractors c
  JOIN public.contractor_subscriptions s ON s.contractor_id = c.id
  WHERE lower(btrim(coalesce(c.city, ''))) = lower(btrim(_city))
    AND lower(coalesce(c.specialty, '')) LIKE '%' || lower(btrim(_trade)) || '%'
    AND s.status IN ('active', 'trialing')
    AND (s.payment_status = 'paid' OR s.amount_paid_cents > 0)
$$;

GRANT EXECUTE ON FUNCTION public.territory_paid_occupancy(text, text) TO authenticated, anon, service_role;

-- 3) Availability + scarcity, backed strictly by production data
CREATE OR REPLACE FUNCTION public.territory_availability(_trade text, _city text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  slot_row public.acq_territory_slots%ROWTYPE;
  paid_pros integer := 0;
  reserved integer := 0;
  occupied integer;
  remaining integer;
  fill numeric := 0;
  level text;
  mult numeric;
BEGIN
  IF _trade IS NULL OR _city IS NULL OR btrim(_trade) = '' OR btrim(_city) = '' THEN
    RETURN jsonb_build_object('status', 'unknown', 'reason', 'missing_input');
  END IF;

  SELECT * INTO slot_row
  FROM public.acq_territory_slots
  WHERE lower(btrim(city)) = lower(btrim(_city))
    AND lower(btrim(trade)) = lower(btrim(_trade))
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'status', 'unknown',
      'reason', 'no_configured_capacity',
      'city', _city,
      'trade', _trade
    );
  END IF;

  paid_pros := public.territory_paid_occupancy(_trade, _city);
  reserved := GREATEST(coalesce(slot_row.used_slots, 0), 0);
  occupied := LEAST(paid_pros + reserved, slot_row.max_slots);
  remaining := GREATEST(slot_row.max_slots - occupied, 0);

  IF slot_row.max_slots > 0 THEN
    fill := round(occupied::numeric / slot_row.max_slots::numeric, 4);
  END IF;

  IF remaining <= 0 OR slot_row.lock_status = 'manual' THEN
    level := 'full';       mult := 1.35;
  ELSIF fill >= 0.80 THEN
    level := 'critical';   mult := 1.25;
  ELSIF fill >= 0.50 THEN
    level := 'high';       mult := 1.15;
  ELSIF fill >= 0.25 THEN
    level := 'moderate';   mult := 1.05;
  ELSE
    level := 'open';       mult := 1.00;
  END IF;

  RETURN jsonb_build_object(
    'status', 'verified',
    'city', slot_row.city,
    'trade', slot_row.trade,
    'max_slots', slot_row.max_slots,
    'occupied_slots', occupied,
    'remaining_slots', remaining,
    'lock_status', slot_row.lock_status,
    'saturation_percent', round(fill * 100, 2),
    'scarcity_level', level,
    'scarcity_multiplier', mult,
    'public_message', CASE
      WHEN remaining <= 0 THEN 'Aucune place disponible'
      WHEN remaining = 1 THEN '1 place restante'
      ELSE remaining || ' places restantes'
    END,
    'sources', jsonb_build_object(
      'configured_slots', slot_row.max_slots,
      'admin_reserved_slots', reserved,
      'paid_active_contractors', paid_pros,
      'occupancy_basis', 'contractor_subscriptions.status in (active,trialing) AND paid',
      'computed_at', now()
    )
  );
END;
$function$;

-- 4) Admin cockpit view
CREATE OR REPLACE VIEW public.v_territory_capacity_admin
WITH (security_invoker = true) AS
SELECT
  t.id,
  t.city,
  t.trade,
  t.max_slots AS total_capacity,
  LEAST(public.territory_paid_occupancy(t.trade, t.city) + GREATEST(t.used_slots, 0), t.max_slots) AS occupied,
  GREATEST(t.max_slots - LEAST(public.territory_paid_occupancy(t.trade, t.city) + GREATEST(t.used_slots, 0), t.max_slots), 0) AS available,
  public.territory_paid_occupancy(t.trade, t.city) AS paid_contractors,
  GREATEST(t.used_slots, 0) AS admin_reserved,
  t.lock_status,
  (public.territory_availability(t.trade, t.city) ->> 'scarcity_level') AS scarcity_level,
  ((public.territory_availability(t.trade, t.city) ->> 'scarcity_multiplier'))::numeric AS pricing_multiplier,
  t.updated_at
FROM public.acq_territory_slots t;

GRANT SELECT ON public.v_territory_capacity_admin TO authenticated, service_role;