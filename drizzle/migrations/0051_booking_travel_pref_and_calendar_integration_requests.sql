-- 1) Optional declared max travel between two visits. NULL = not declared (never defaulted).
ALTER TABLE public.contractor_booking_rules
  ADD COLUMN IF NOT EXISTS max_travel_minutes integer
  CHECK (max_travel_minutes IS NULL OR max_travel_minutes BETWEEN 5 AND 240);
COMMENT ON COLUMN public.contractor_booking_rules.max_travel_minutes IS 'Declared by the contractor; NULL = not declared. Compared only against reliable computed ETAs, else reported as unverified.';

CREATE OR REPLACE FUNCTION public.contractor_booking_constraints(p_contractor_id uuid, p_from timestamptz, p_to timestamptz)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'evening_after', to_char(COALESCE(r.evening_after, '19:00'::time), 'HH24:MI'),
    'max_evenings_per_week', r.max_evenings_per_week,
    'max_travel_minutes', r.max_travel_minutes,
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

-- 2) Requests for a calendar/CRM integration UNPRO does not offer yet. A request is never a connection.
CREATE TABLE IF NOT EXISTS public.calendar_integration_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_user_id uuid NOT NULL,
  contractor_id uuid REFERENCES public.contractors(id) ON DELETE SET NULL,
  software_name text NOT NULL CHECK (length(btrim(software_name)) BETWEEN 2 AND 120),
  software_key text NOT NULL CHECK (length(software_key) BETWEEN 2 AND 120),
  documentation_url text CHECK (documentation_url IS NULL OR (documentation_url ~ '^https://' AND length(documentation_url) <= 500)),
  account_holder_name text NOT NULL CHECK (length(btrim(account_holder_name)) BETWEEN 2 AND 160),
  integration_scopes text[] NOT NULL CHECK (cardinality(integration_scopes) BETWEEN 1 AND 3
    AND integration_scopes <@ ARRAY['read_availability', 'book_appointments', 'two_way_sync']::text[]),
  contact_consent boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'in_progress', 'available', 'declined')),
  source_surface text CHECK (source_surface IS NULL OR source_surface ~ '^[a-z0-9_-]{1,64}$'),
  admin_note text CHECK (admin_note IS NULL OR length(admin_note) <= 2000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.calendar_integration_requests IS 'Declared requests for an external calendar/CRM integration. Never a connection; no credentials stored. Written only via request_calendar_integration().';
CREATE UNIQUE INDEX IF NOT EXISTS calendar_integration_requests_open_uniq
  ON public.calendar_integration_requests (requester_user_id, software_key)
  WHERE status IN ('received', 'in_progress');
CREATE INDEX IF NOT EXISTS calendar_integration_requests_status_idx
  ON public.calendar_integration_requests (status, created_at DESC);

GRANT SELECT, UPDATE ON public.calendar_integration_requests TO authenticated;
GRANT ALL ON public.calendar_integration_requests TO service_role;

ALTER TABLE public.calendar_integration_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Requesters read own integration requests" ON public.calendar_integration_requests
  FOR SELECT TO authenticated
  USING (requester_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins update integration requests" ON public.calendar_integration_requests
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.calendar_integration_requests_touch()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END; $$;
CREATE TRIGGER calendar_integration_requests_touch BEFORE UPDATE ON public.calendar_integration_requests
  FOR EACH ROW EXECUTE FUNCTION public.calendar_integration_requests_touch();

-- Single write path: auth required, no credentials, rate limit, idempotent per open software, in-app admin alert only.
CREATE OR REPLACE FUNCTION public.request_calendar_integration(
  p_software_name text,
  p_account_holder_name text,
  p_integration_scopes text[],
  p_contact_consent boolean,
  p_documentation_url text DEFAULT NULL,
  p_source_surface text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_name text := btrim(coalesce(p_software_name, ''));
  v_holder text := btrim(coalesce(p_account_holder_name, ''));
  v_url text := nullif(btrim(coalesce(p_documentation_url, '')), '');
  v_key text;
  v_contractor uuid;
  v_existing record;
  v_recent int;
  v_id uuid;
  v_secret_re text := '(mot de passe|password|passwd|\mmdp\M|token|jeton|api[ _-]?key|cl[ée] api|secret|bearer|\motp\M)';
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'auth_required' USING ERRCODE = '42501';
  END IF;
  IF length(v_name) < 2 OR length(v_name) > 120 OR length(v_holder) < 2 OR length(v_holder) > 160 THEN
    RAISE EXCEPTION 'invalid_input' USING ERRCODE = '22023';
  END IF;
  IF p_integration_scopes IS NULL OR cardinality(p_integration_scopes) = 0
     OR NOT (p_integration_scopes <@ ARRAY['read_availability', 'book_appointments', 'two_way_sync']::text[]) THEN
    RAISE EXCEPTION 'invalid_scope' USING ERRCODE = '22023';
  END IF;
  IF v_url IS NOT NULL AND (v_url !~ '^https://' OR length(v_url) > 500 OR v_url ~ '[?&#]') THEN
    RAISE EXCEPTION 'invalid_url' USING ERRCODE = '22023';
  END IF;
  -- Never accept credentials: secret-like words or long opaque strings in any field.
  IF lower(v_name || ' ' || v_holder || ' ' || coalesce(v_url, '')) ~ v_secret_re
     OR (v_name || ' ' || v_holder) ~ '[A-Za-z0-9_\-]{32,}' THEN
    RAISE EXCEPTION 'credentials_refused' USING ERRCODE = '22023';
  END IF;

  v_key := lower(regexp_replace(v_name, '\s+', ' ', 'g'));

  PERFORM pg_advisory_xact_lock(hashtextextended(v_uid::text, 77));

  SELECT id, status INTO v_existing FROM public.calendar_integration_requests
  WHERE requester_user_id = v_uid AND software_key = v_key AND status IN ('received', 'in_progress')
  LIMIT 1;
  IF FOUND THEN
    RETURN jsonb_build_object('result', 'duplicate', 'id', v_existing.id, 'status', v_existing.status);
  END IF;

  SELECT count(*) INTO v_recent FROM public.calendar_integration_requests
  WHERE requester_user_id = v_uid AND created_at > now() - interval '24 hours';
  IF v_recent >= 5 THEN
    RAISE EXCEPTION 'rate_limited' USING ERRCODE = '54000';
  END IF;

  SELECT c.id INTO v_contractor FROM public.contractors c WHERE c.user_id = v_uid ORDER BY c.created_at NULLS LAST LIMIT 1;

  INSERT INTO public.calendar_integration_requests(
    requester_user_id, contractor_id, software_name, software_key, documentation_url,
    account_holder_name, integration_scopes, contact_consent, source_surface)
  VALUES (
    v_uid, v_contractor, v_name, v_key, v_url, v_holder,
    (SELECT array_agg(DISTINCT s ORDER BY s) FROM unnest(p_integration_scopes) s),
    coalesce(p_contact_consent, false),
    CASE WHEN p_source_surface ~ '^[a-z0-9_-]{1,64}$' THEN p_source_surface END)
  RETURNING id INTO v_id;

  -- In-app admin inbox only (no SMS/email dispatcher reads this table). No personal data in the alert.
  INSERT INTO public.admin_notifications(type, severity, contractor_id, title, body, payload_json)
  VALUES ('calendar_integration_request', 'info', v_contractor,
    'Demande d''intégration agenda',
    'Logiciel demandé : ' || left(v_name, 120),
    jsonb_build_object('request_id', v_id));

  RETURN jsonb_build_object('result', 'created', 'id', v_id, 'status', 'received');
END; $$;
REVOKE ALL ON FUNCTION public.request_calendar_integration(text, text, text[], boolean, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_calendar_integration(text, text, text[], boolean, text, text) TO authenticated, service_role;