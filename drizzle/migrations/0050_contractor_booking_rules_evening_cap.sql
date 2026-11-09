-- Minimal per-contractor booking rules (declared by the contractor) + server evening cap.
CREATE TABLE IF NOT EXISTS public.contractor_booking_rules (
  contractor_id uuid PRIMARY KEY REFERENCES public.contractors(id) ON DELETE CASCADE,
  evening_after time NOT NULL DEFAULT '19:00',
  max_evenings_per_week integer CHECK (max_evenings_per_week IS NULL OR max_evenings_per_week BETWEEN 0 AND 7),
  visit_capacity integer NOT NULL DEFAULT 1 CHECK (visit_capacity = 1),
  declared_representatives integer CHECK (declared_representatives IS NULL OR declared_representatives BETWEEN 1 AND 50),
  representatives_note text CHECK (representatives_note IS NULL OR length(representatives_note) <= 1000),
  prefer_compact_schedule boolean NOT NULL DEFAULT false,
  preference_text text CHECK (preference_text IS NULL OR length(preference_text) <= 2000),
  preference_summary text CHECK (preference_summary IS NULL OR length(preference_summary) <= 2000),
  preference_status text NOT NULL DEFAULT 'declared' CHECK (preference_status IN ('declared')),
  declared_by uuid,
  declared_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.contractor_booking_rules IS 'Contractor-declared booking preferences (never verified). visit_capacity stays 1 until per-representative calendars exist.';

GRANT SELECT, INSERT, UPDATE ON public.contractor_booking_rules TO authenticated;
GRANT ALL ON public.contractor_booking_rules TO service_role;

ALTER TABLE public.contractor_booking_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Contractors read own booking rules" ON public.contractor_booking_rules
  FOR SELECT TO authenticated
  USING (contractor_id IN (SELECT c.id FROM public.contractors c WHERE c.user_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Contractors insert own booking rules" ON public.contractor_booking_rules
  FOR INSERT TO authenticated
  WITH CHECK (contractor_id IN (SELECT c.id FROM public.contractors c WHERE c.user_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Contractors update own booking rules" ON public.contractor_booking_rules
  FOR UPDATE TO authenticated
  USING (contractor_id IN (SELECT c.id FROM public.contractors c WHERE c.user_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (contractor_id IN (SELECT c.id FROM public.contractors c WHERE c.user_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.contractor_booking_rules_touch()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END; $$;
CREATE TRIGGER contractor_booking_rules_touch BEFORE UPDATE ON public.contractor_booking_rules
  FOR EACH ROW EXECUTE FUNCTION public.contractor_booking_rules_touch();

-- Times-only view of what blocks a contractor's schedule: rules + held bookings (no client data).
CREATE OR REPLACE FUNCTION public.contractor_booking_constraints(p_contractor_id uuid, p_from timestamptz, p_to timestamptz)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'evening_after', to_char(COALESCE(r.evening_after, '19:00'::time), 'HH24:MI'),
    'max_evenings_per_week', r.max_evenings_per_week,
    'visit_capacity', 1,
    'prefer_compact_schedule', COALESCE(r.prefer_compact_schedule, false),
    'bookings', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'scheduled_start', b.scheduled_start, 'scheduled_end', b.scheduled_end,
        'buffer_before_minutes', COALESCE(b.buffer_before_minutes, 0),
        'buffer_after_minutes', COALESCE(b.buffer_after_minutes, 0),
        'travel_minutes_before', COALESCE(b.travel_minutes_before, 0)) ORDER BY b.scheduled_start)
      FROM public.smart_bookings b
      WHERE b.contractor_id = p_contractor_id
        AND b.status IN ('pending', 'confirmed', 'en_route')
        AND b.scheduled_end > COALESCE(p_from, now()) - interval '7 days'
        AND b.scheduled_start < LEAST(COALESCE(p_to, now() + interval '60 days'), COALESCE(p_from, now()) + interval '120 days') + interval '7 days'
    ), '[]'::jsonb)
  )
  FROM (SELECT 1) one
  LEFT JOIN public.contractor_booking_rules r ON r.contractor_id = p_contractor_id;
$$;
REVOKE ALL ON FUNCTION public.contractor_booking_constraints(uuid, timestamptz, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.contractor_booking_constraints(uuid, timestamptz, timestamptz) TO anon, authenticated, service_role;

-- Server rule: at most N distinct evening dates per local week (Mon–Sun, America/Toronto).
-- An evening date = a local date with at least one held visit ending after evening_after.
CREATE OR REPLACE FUNCTION public.enforce_contractor_evening_cap()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_max int; v_after time; v_local_end timestamp; v_day date; v_week date; v_count int;
BEGIN
  IF NEW.status NOT IN ('pending', 'confirmed', 'en_route') OR NEW.scheduled_end IS NULL THEN
    RETURN NEW;
  END IF;
  SELECT max_evenings_per_week, evening_after INTO v_max, v_after
  FROM public.contractor_booking_rules WHERE contractor_id = NEW.contractor_id;
  IF v_max IS NULL THEN RETURN NEW; END IF;

  v_local_end := NEW.scheduled_end AT TIME ZONE 'America/Toronto';
  IF v_local_end::time <= v_after AND v_local_end::date = (NEW.scheduled_start AT TIME ZONE 'America/Toronto')::date THEN
    RETURN NEW;
  END IF;

  -- Same lock key as confirm_smart_booking_slot: concurrent writers for one contractor serialize.
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.contractor_id::text, 42));

  v_day := (NEW.scheduled_start AT TIME ZONE 'America/Toronto')::date;
  v_week := date_trunc('week', v_day::timestamp)::date;

  SELECT count(DISTINCT (b.scheduled_start AT TIME ZONE 'America/Toronto')::date) INTO v_count
  FROM public.smart_bookings b
  WHERE b.contractor_id = NEW.contractor_id
    AND b.id IS DISTINCT FROM NEW.id
    AND b.status IN ('pending', 'confirmed', 'en_route')
    AND (b.scheduled_start AT TIME ZONE 'America/Toronto')::date >= v_week
    AND (b.scheduled_start AT TIME ZONE 'America/Toronto')::date < v_week + 7
    AND (b.scheduled_end AT TIME ZONE 'America/Toronto')::time > v_after;

  IF EXISTS (
    SELECT 1 FROM public.smart_bookings b
    WHERE b.contractor_id = NEW.contractor_id AND b.id IS DISTINCT FROM NEW.id
      AND b.status IN ('pending', 'confirmed', 'en_route')
      AND (b.scheduled_start AT TIME ZONE 'America/Toronto')::date = v_day
      AND (b.scheduled_end AT TIME ZONE 'America/Toronto')::time > v_after
  ) THEN
    RETURN NEW; -- this evening is already counted
  END IF;

  IF v_count >= v_max THEN
    RAISE EXCEPTION 'evening_cap_reached' USING ERRCODE = '23514',
      DETAIL = format('max %s evenings per week', v_max);
  END IF;
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.enforce_contractor_evening_cap() FROM PUBLIC;

CREATE TRIGGER smart_bookings_evening_cap
  BEFORE INSERT OR UPDATE OF scheduled_start, scheduled_end, status, contractor_id ON public.smart_bookings
  FOR EACH ROW EXECUTE FUNCTION public.enforce_contractor_evening_cap();
