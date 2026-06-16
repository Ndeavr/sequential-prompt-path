
CREATE TABLE IF NOT EXISTS public.outbound_send_window_policy (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  channel TEXT NOT NULL CHECK (channel IN ('sms','email','call','push')),
  weekday SMALLINT NOT NULL CHECK (weekday BETWEEN 0 AND 6), -- 0=Sunday .. 6=Saturday
  start_minute INT NOT NULL CHECK (start_minute BETWEEN 0 AND 1440),
  end_minute INT NOT NULL CHECK (end_minute BETWEEN 0 AND 1440),
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (channel, weekday)
);

GRANT SELECT ON public.outbound_send_window_policy TO authenticated;
GRANT ALL ON public.outbound_send_window_policy TO service_role;

ALTER TABLE public.outbound_send_window_policy ENABLE ROW LEVEL SECURITY;

CREATE POLICY "send_window_policy_read_authenticated"
  ON public.outbound_send_window_policy FOR SELECT TO authenticated USING (true);

CREATE POLICY "send_window_policy_admin_write"
  ON public.outbound_send_window_policy FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_outbound_send_window_policy_updated_at
  BEFORE UPDATE ON public.outbound_send_window_policy
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed canonical rules (idempotent)
INSERT INTO public.outbound_send_window_policy (channel, weekday, start_minute, end_minute, enabled, notes) VALUES
  -- SMS: Lun-Ven 9-17, Sam 10-13, Dim bloqué
  ('sms', 1, 540, 1020, true,  'Lundi 9h-17h'),
  ('sms', 2, 540, 1020, true,  'Mardi 9h-17h'),
  ('sms', 3, 540, 1020, true,  'Mercredi 9h-17h'),
  ('sms', 4, 540, 1020, true,  'Jeudi 9h-17h'),
  ('sms', 5, 540, 1020, true,  'Vendredi 9h-17h'),
  ('sms', 6, 600, 780,  true,  'Samedi 10h-13h'),
  ('sms', 0, 0,   0,    false, 'Dimanche bloqué'),
  -- Email: Lun-Ven 7-18, Sam 9-12, Dim bloqué
  ('email', 1, 420, 1080, true,  'Lundi 7h-18h'),
  ('email', 2, 420, 1080, true,  'Mardi 7h-18h'),
  ('email', 3, 420, 1080, true,  'Mercredi 7h-18h'),
  ('email', 4, 420, 1080, true,  'Jeudi 7h-18h'),
  ('email', 5, 420, 1080, true,  'Vendredi 7h-18h'),
  ('email', 6, 540, 720,  true,  'Samedi 9h-12h'),
  ('email', 0, 0,   0,    false, 'Dimanche bloqué')
ON CONFLICT (channel, weekday) DO NOTHING;

-- Helper: is current Montreal time within the allowed window for a given channel?
CREATE OR REPLACE FUNCTION public.is_within_send_window(_channel TEXT, _at TIMESTAMPTZ DEFAULT now())
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  WITH local AS (
    SELECT
      EXTRACT(DOW FROM (_at AT TIME ZONE 'America/Montreal'))::int AS wd,
      (EXTRACT(HOUR FROM (_at AT TIME ZONE 'America/Montreal'))::int * 60
        + EXTRACT(MINUTE FROM (_at AT TIME ZONE 'America/Montreal'))::int) AS m
  )
  SELECT COALESCE(
    (SELECT p.enabled
       AND local.m >= p.start_minute
       AND local.m <  p.end_minute
     FROM public.outbound_send_window_policy p, local
     WHERE p.channel = _channel AND p.weekday = local.wd
     LIMIT 1),
    false
  );
$$;

-- Helper: when is the next opening of the window for this channel (up to 8 days lookahead)?
CREATE OR REPLACE FUNCTION public.next_send_window_open(_channel TEXT, _from TIMESTAMPTZ DEFAULT now())
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = public AS $$
DECLARE
  d INT;
  candidate TIMESTAMPTZ;
  local_date DATE;
  wd INT;
  start_min INT;
  end_min INT;
  enabled_row BOOLEAN;
  cur_min INT;
BEGIN
  FOR d IN 0..8 LOOP
    local_date := ((_from AT TIME ZONE 'America/Montreal')::date + d);
    wd := EXTRACT(DOW FROM local_date)::int;
    SELECT p.start_minute, p.end_minute, p.enabled
      INTO start_min, end_min, enabled_row
      FROM public.outbound_send_window_policy p
      WHERE p.channel = _channel AND p.weekday = wd
      LIMIT 1;
    IF enabled_row IS TRUE AND end_min > start_min THEN
      candidate := ((local_date::text || ' ' ||
        lpad((start_min / 60)::text, 2, '0') || ':' ||
        lpad((start_min % 60)::text, 2, '0') || ':00')::timestamp
        AT TIME ZONE 'America/Montreal');
      IF d = 0 THEN
        cur_min := EXTRACT(HOUR FROM (_from AT TIME ZONE 'America/Montreal'))::int * 60
                 + EXTRACT(MINUTE FROM (_from AT TIME ZONE 'America/Montreal'))::int;
        IF cur_min < start_min THEN RETURN candidate; END IF;
        IF cur_min < end_min THEN RETURN _from; END IF; -- already open
        CONTINUE;
      ELSE
        RETURN candidate;
      END IF;
    END IF;
  END LOOP;
  RETURN NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_within_send_window(TEXT, TIMESTAMPTZ) TO authenticated, service_role, anon;
GRANT EXECUTE ON FUNCTION public.next_send_window_open(TEXT, TIMESTAMPTZ) TO authenticated, service_role, anon;
