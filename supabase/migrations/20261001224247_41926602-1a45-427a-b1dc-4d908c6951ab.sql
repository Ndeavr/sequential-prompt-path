CREATE TABLE public.outreach_daily_sms_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  day_local date NOT NULL,
  dedupe_key text NOT NULL,
  prospect_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (day_local, dedupe_key)
);
GRANT ALL ON public.outreach_daily_sms_reservations TO service_role;
ALTER TABLE public.outreach_daily_sms_reservations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read sms reservations" ON public.outreach_daily_sms_reservations
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
GRANT SELECT ON public.outreach_daily_sms_reservations TO authenticated;

-- Shared, race-safe daily cap for ALL commercial SMS dispatchers (hard ceiling 25).
CREATE OR REPLACE FUNCTION public.reserve_outreach_sms_slot(p_dedupe_key text, p_prospect_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_day date := (now() AT TIME ZONE 'America/Toronto')::date;
  v_cap int;
  v_used int;
BEGIN
  SELECT LEAST(25, GREATEST(0, COALESCE(sms_daily_limit, 0))) INTO v_cap FROM outreach_settings LIMIT 1;
  v_cap := COALESCE(v_cap, 0);
  PERFORM pg_advisory_xact_lock(hashtext('outreach_sms_daily_cap'));
  IF EXISTS (SELECT 1 FROM outreach_daily_sms_reservations WHERE day_local = v_day AND dedupe_key = p_dedupe_key) THEN
    RETURN jsonb_build_object('granted', false, 'reason', 'already_reserved_today', 'cap', v_cap);
  END IF;
  SELECT count(*) INTO v_used FROM outreach_daily_sms_reservations WHERE day_local = v_day;
  IF v_used >= v_cap THEN
    RETURN jsonb_build_object('granted', false, 'reason', 'daily_cap_reached', 'cap', v_cap, 'used', v_used);
  END IF;
  INSERT INTO outreach_daily_sms_reservations(day_local, dedupe_key, prospect_id) VALUES (v_day, p_dedupe_key, p_prospect_id);
  RETURN jsonb_build_object('granted', true, 'cap', v_cap, 'used', v_used + 1);
END $$;
REVOKE ALL ON FUNCTION public.reserve_outreach_sms_slot(text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_outreach_sms_slot(text, uuid) TO service_role;

UPDATE public.outreach_settings SET sms_daily_limit = 25, updated_at = now() WHERE sms_daily_limit > 25;