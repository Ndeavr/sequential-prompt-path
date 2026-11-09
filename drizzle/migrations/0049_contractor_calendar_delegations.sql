CREATE TABLE public.contractor_calendar_delegations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
  calendar_connection_id uuid NOT NULL REFERENCES public.calendar_connections(id) ON DELETE CASCADE,
  selected_calendar_id text NOT NULL,
  delegated_by uuid NOT NULL,
  reason text NOT NULL CHECK (length(reason) >= 20),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','revoked')),
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  revoked_by uuid
);
GRANT SELECT ON public.contractor_calendar_delegations TO authenticated;
GRANT ALL ON public.contractor_calendar_delegations TO service_role;
ALTER TABLE public.contractor_calendar_delegations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "calendar_delegations_admin_read" ON public.contractor_calendar_delegations
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE UNIQUE INDEX contractor_calendar_delegations_one_active
  ON public.contractor_calendar_delegations (contractor_id) WHERE status = 'active';

-- Creation: the delegating person must own the connection AND be admin; calendar must be the one selected.
-- Updates: only revocation; identity columns are immutable.
CREATE OR REPLACE FUNCTION public.guard_contractor_calendar_delegation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_conn record;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT user_id, provider, metadata INTO v_conn FROM public.calendar_connections WHERE id = NEW.calendar_connection_id;
    IF v_conn.user_id IS NULL OR v_conn.user_id <> NEW.delegated_by THEN RAISE EXCEPTION 'delegation_owner_mismatch'; END IF;
    IF v_conn.provider <> 'google' THEN RAISE EXCEPTION 'delegation_provider_unsupported'; END IF;
    IF NOT public.has_role(NEW.delegated_by, 'admin') THEN RAISE EXCEPTION 'delegation_requires_admin_owner'; END IF;
    IF COALESCE(v_conn.metadata->>'selected_calendar_id','') <> NEW.selected_calendar_id THEN RAISE EXCEPTION 'delegation_calendar_not_selected'; END IF;
    NEW.status := 'active'; NEW.revoked_at := NULL; NEW.revoked_by := NULL;
    RETURN NEW;
  END IF;
  IF NEW.contractor_id <> OLD.contractor_id OR NEW.calendar_connection_id <> OLD.calendar_connection_id
     OR NEW.selected_calendar_id <> OLD.selected_calendar_id OR NEW.delegated_by <> OLD.delegated_by
     OR NEW.created_at <> OLD.created_at OR NEW.reason <> OLD.reason THEN
    RAISE EXCEPTION 'delegation_immutable';
  END IF;
  IF OLD.status = 'revoked' THEN RAISE EXCEPTION 'delegation_already_revoked'; END IF;
  IF NEW.status = 'revoked' THEN NEW.revoked_at := COALESCE(NEW.revoked_at, now()); END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_guard_contractor_calendar_delegation
  BEFORE INSERT OR UPDATE ON public.contractor_calendar_delegations
  FOR EACH ROW EXECUTE FUNCTION public.guard_contractor_calendar_delegation();
CREATE TRIGGER trg_no_delete_contractor_calendar_delegation
  BEFORE DELETE ON public.contractor_calendar_delegations
  FOR EACH ROW EXECUTE FUNCTION public.casl_evidence_append_only();

-- Valid delegated connection: active, still connected, same calendar still selected.
CREATE OR REPLACE FUNCTION public.contractor_delegated_calendar_connection(p_contractor_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT d.calendar_connection_id
  FROM public.contractor_calendar_delegations d
  JOIN public.calendar_connections cc ON cc.id = d.calendar_connection_id
  WHERE d.contractor_id = p_contractor_id AND d.status = 'active'
    AND cc.connection_status = 'connected'
    AND cc.metadata->>'selected_calendar_id' = d.selected_calendar_id
  LIMIT 1
$$;
REVOKE ALL ON FUNCTION public.contractor_delegated_calendar_connection(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.contractor_delegated_calendar_connection(uuid) TO service_role;

-- Busy windows (times only) follow the delegated calendar when one exists.
CREATE OR REPLACE FUNCTION public.contractor_busy_windows(p_contractor_id uuid, p_from timestamptz, p_to timestamptz)
RETURNS TABLE (starts_at timestamptz, ends_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH d AS (SELECT public.contractor_delegated_calendar_connection(p_contractor_id) AS conn)
  SELECT p.starts_at, p.ends_at
  FROM public.calendar_busy_periods p, d
  WHERE (
      (d.conn IS NOT NULL AND p.calendar_connection_id = d.conn)
      OR (d.conn IS NULL AND p.user_id = (SELECT c.user_id FROM public.contractors c WHERE c.id = p_contractor_id))
    )
    AND p.ends_at > COALESCE(p_from, now())
    AND p.starts_at < COALESCE(p_to, now() + interval '90 days')
  ORDER BY p.starts_at
  LIMIT 2000;
$$;
REVOKE ALL ON FUNCTION public.contractor_busy_windows(uuid, timestamptz, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.contractor_busy_windows(uuid, timestamptz, timestamptz) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.confirm_smart_booking_slot(p_contractor_id uuid, p_appointment_type_id uuid, p_start timestamp with time zone, p_end timestamp with time zone, p_client jsonb DEFAULT '{}'::jsonb)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_buffer_before int := 0; v_buffer_after int := 15; v_travel int := 0;
  v_block_start timestamptz; v_block_end timestamptz; v_booking_id uuid;
BEGIN
  IF p_contractor_id IS NULL OR p_start IS NULL OR p_end IS NULL OR p_end <= p_start THEN
    RAISE EXCEPTION 'invalid_slot_window' USING ERRCODE = '22023';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_contractor_id::text, 42));
  SELECT buffer_before_minutes, buffer_after_minutes, travel_padding_minutes
    INTO v_buffer_before, v_buffer_after, v_travel
  FROM public.booking_appointment_types WHERE id = p_appointment_type_id AND contractor_id = p_contractor_id;
  v_buffer_before := COALESCE(v_buffer_before, 0); v_buffer_after := COALESCE(v_buffer_after, 15); v_travel := COALESCE(v_travel, 0);
  v_block_start := p_start - make_interval(mins => v_buffer_before + v_travel);
  v_block_end := p_end + make_interval(mins => v_buffer_after);

  IF EXISTS (
    SELECT 1 FROM public.smart_bookings b
    WHERE b.contractor_id = p_contractor_id AND b.status IN ('pending', 'confirmed', 'en_route')
      AND v_block_start < (b.scheduled_end + make_interval(mins => COALESCE(b.buffer_after_minutes, 0)))
      AND v_block_end > (b.scheduled_start - make_interval(mins => COALESCE(b.buffer_before_minutes, 0) + COALESCE(b.travel_minutes_before, 0)))
  ) THEN RAISE EXCEPTION 'slot_unavailable' USING ERRCODE = '23505'; END IF;

  -- Real busy periods: delegated calendar if any, else the contractor's own calendars.
  IF EXISTS (
    SELECT 1 FROM public.contractor_busy_windows(p_contractor_id, v_block_start - interval '1 day', v_block_end + interval '1 day') w
    WHERE v_block_start < w.ends_at AND v_block_end > w.starts_at
  ) THEN RAISE EXCEPTION 'slot_unavailable' USING ERRCODE = '23505'; END IF;

  IF EXISTS (
    SELECT 1 FROM public.booking_blackouts bl
    WHERE bl.contractor_id = p_contractor_id AND v_block_start < bl.end_at AND v_block_end > bl.start_at
  ) THEN RAISE EXCEPTION 'slot_unavailable' USING ERRCODE = '23505'; END IF;

  INSERT INTO public.smart_bookings (
    contractor_id, appointment_type_id, source, source_detail, client_name, client_email, client_phone,
    address_line1, city, province, postal_code, urgency_level, requested_notes,
    status, scheduled_start, scheduled_end, buffer_before_minutes, buffer_after_minutes, travel_minutes_before
  ) VALUES (
    p_contractor_id, p_appointment_type_id, COALESCE(p_client->>'source', 'unpro'), p_client->>'source_detail',
    COALESCE(NULLIF(p_client->>'client_name', ''), 'Client UNPRO'), NULLIF(p_client->>'client_email', ''), NULLIF(p_client->>'client_phone', ''),
    NULLIF(p_client->>'address_line1', ''), NULLIF(p_client->>'city', ''), COALESCE(NULLIF(p_client->>'province', ''), 'QC'),
    NULLIF(p_client->>'postal_code', ''), COALESCE(NULLIF(p_client->>'urgency_level', ''), 'normal'), NULLIF(p_client->>'requested_notes', ''),
    'confirmed', p_start, p_end, v_buffer_before, v_buffer_after, v_travel
  ) RETURNING id INTO v_booking_id;
  RETURN v_booking_id;
END;
$function$;