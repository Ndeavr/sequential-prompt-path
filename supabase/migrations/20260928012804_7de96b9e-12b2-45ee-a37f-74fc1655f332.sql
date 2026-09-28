-- 1) Empêche tout doublon de notification de rapprochement (relances incluses)
DELETE FROM public.notifications a
USING public.notifications b
WHERE a.type = 'demand_matched'
  AND b.type = 'demand_matched'
  AND a.profile_id IS NOT DISTINCT FROM b.profile_id
  AND a.entity_id IS NOT DISTINCT FROM b.entity_id
  AND a.ctid > b.ctid;

CREATE UNIQUE INDEX IF NOT EXISTS notifications_demand_matched_unique
  ON public.notifications (profile_id, entity_id)
  WHERE type = 'demand_matched';

-- 2) Résultat conforme à l'état réellement enregistré
DROP FUNCTION IF EXISTS public.fn_match_waiting_demand(uuid);

CREATE FUNCTION public.fn_match_waiting_demand(_contractor_id uuid)
RETURNS TABLE(
  matched_count int,
  newly_matched_count int,
  newly_matched_ids uuid[],
  segments jsonb
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_total int := 0;
  v_new_ids uuid[] := ARRAY[]::uuid[];
  v_seg_ids uuid[];
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
    SELECT COALESCE(array_agg(id), ARRAY[]::uuid[]) INTO v_seg_ids FROM upd;

    v_new_ids := v_new_ids || v_seg_ids;

    v_segments := v_segments || jsonb_build_object(
      'city', r.city,
      'category', r.category,
      'count', COALESCE(array_length(v_seg_ids, 1), 0)
    );
  END LOOP;

  SELECT COUNT(*) INTO v_total
  FROM public.demand_signals
  WHERE matched_contractor_id = _contractor_id AND status = 'matched';

  RETURN QUERY SELECT
    v_total,
    COALESCE(array_length(v_new_ids, 1), 0),
    v_new_ids,
    v_segments;
END; $$;

GRANT EXECUTE ON FUNCTION public.fn_match_waiting_demand(uuid) TO service_role;