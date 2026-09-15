-- 1) Busy periods cache (no event titles, ever)
CREATE TABLE IF NOT EXISTS public.calendar_busy_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  calendar_connection_id uuid NOT NULL REFERENCES public.calendar_connections(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  provider text NOT NULL,
  external_event_id text,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  is_all_day boolean NOT NULL DEFAULT false,
  synced_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.calendar_busy_periods TO authenticated;
GRANT ALL ON public.calendar_busy_periods TO service_role;
ALTER TABLE public.calendar_busy_periods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "calendar_busy_periods_owner_read"
  ON public.calendar_busy_periods FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_calendar_busy_periods_conn_window
  ON public.calendar_busy_periods (calendar_connection_id, starts_at, ends_at);
CREATE INDEX IF NOT EXISTS idx_calendar_busy_periods_user_window
  ON public.calendar_busy_periods (user_id, starts_at, ends_at);
CREATE UNIQUE INDEX IF NOT EXISTS uq_calendar_busy_periods_event
  ON public.calendar_busy_periods (calendar_connection_id, external_event_id)
  WHERE external_event_id IS NOT NULL;

CREATE TRIGGER trg_calendar_busy_periods_updated_at
  BEFORE UPDATE ON public.calendar_busy_periods
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) Optional Apple/ICS share link for busy import
ALTER TABLE public.calendar_connections
  ADD COLUMN IF NOT EXISTS external_ics_url text;

-- 3) Atomic, lock-protected booking confirmation
CREATE OR REPLACE FUNCTION public.confirm_smart_booking_slot(
  p_contractor_id uuid,
  p_appointment_type_id uuid,
  p_start timestamptz,
  p_end timestamptz,
  p_client jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_buffer_before int := 0;
  v_buffer_after int := 15;
  v_travel int := 0;
  v_block_start timestamptz;
  v_block_end timestamptz;
  v_owner uuid;
  v_booking_id uuid;
BEGIN
  IF p_contractor_id IS NULL OR p_start IS NULL OR p_end IS NULL OR p_end <= p_start THEN
    RAISE EXCEPTION 'invalid_slot_window' USING ERRCODE = '22023';
  END IF;

  -- Serialize every confirmation attempt for this contractor.
  PERFORM pg_advisory_xact_lock(hashtextextended(p_contractor_id::text, 42));

  SELECT buffer_before_minutes, buffer_after_minutes, travel_padding_minutes
    INTO v_buffer_before, v_buffer_after, v_travel
  FROM public.booking_appointment_types
  WHERE id = p_appointment_type_id AND contractor_id = p_contractor_id;

  v_buffer_before := COALESCE(v_buffer_before, 0);
  v_buffer_after := COALESCE(v_buffer_after, 15);
  v_travel := COALESCE(v_travel, 0);

  v_block_start := p_start - make_interval(mins => v_buffer_before + v_travel);
  v_block_end := p_end + make_interval(mins => v_buffer_after);

  -- Conflict with an existing UNPRO appointment
  IF EXISTS (
    SELECT 1 FROM public.smart_bookings b
    WHERE b.contractor_id = p_contractor_id
      AND b.status IN ('pending', 'confirmed', 'en_route')
      AND v_block_start < (b.scheduled_end + make_interval(mins => COALESCE(b.buffer_after_minutes, 0)))
      AND v_block_end > (b.scheduled_start - make_interval(mins => COALESCE(b.buffer_before_minutes, 0) + COALESCE(b.travel_minutes_before, 0)))
  ) THEN
    RAISE EXCEPTION 'slot_unavailable' USING ERRCODE = '23505';
  END IF;

  -- Conflict with a real busy period from the connected calendar
  SELECT user_id INTO v_owner FROM public.contractors WHERE id = p_contractor_id;
  IF v_owner IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.calendar_busy_periods p
    WHERE p.user_id = v_owner
      AND v_block_start < p.ends_at
      AND v_block_end > p.starts_at
  ) THEN
    RAISE EXCEPTION 'slot_unavailable' USING ERRCODE = '23505';
  END IF;

  -- Conflict with a declared blackout
  IF EXISTS (
    SELECT 1 FROM public.booking_blackouts bl
    WHERE bl.contractor_id = p_contractor_id
      AND v_block_start < bl.end_at
      AND v_block_end > bl.start_at
  ) THEN
    RAISE EXCEPTION 'slot_unavailable' USING ERRCODE = '23505';
  END IF;

  INSERT INTO public.smart_bookings (
    contractor_id, appointment_type_id, source, source_detail,
    client_name, client_email, client_phone,
    address_line1, city, province, postal_code,
    urgency_level, requested_notes,
    status, scheduled_start, scheduled_end,
    buffer_before_minutes, buffer_after_minutes, travel_minutes_before
  ) VALUES (
    p_contractor_id, p_appointment_type_id,
    COALESCE(p_client->>'source', 'unpro'),
    p_client->>'source_detail',
    COALESCE(NULLIF(p_client->>'client_name', ''), 'Client UNPRO'),
    NULLIF(p_client->>'client_email', ''),
    NULLIF(p_client->>'client_phone', ''),
    NULLIF(p_client->>'address_line1', ''),
    NULLIF(p_client->>'city', ''),
    COALESCE(NULLIF(p_client->>'province', ''), 'QC'),
    NULLIF(p_client->>'postal_code', ''),
    COALESCE(NULLIF(p_client->>'urgency_level', ''), 'normal'),
    NULLIF(p_client->>'requested_notes', ''),
    'confirmed', p_start, p_end,
    v_buffer_before, v_buffer_after, v_travel
  )
  RETURNING id INTO v_booking_id;

  RETURN v_booking_id;
END;
$$;

REVOKE ALL ON FUNCTION public.confirm_smart_booking_slot(uuid, uuid, timestamptz, timestamptz, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.confirm_smart_booking_slot(uuid, uuid, timestamptz, timestamptz, jsonb) TO service_role;