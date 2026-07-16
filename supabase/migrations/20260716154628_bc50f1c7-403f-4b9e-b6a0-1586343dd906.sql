
CREATE TABLE IF NOT EXISTS public.admin_sms_recipients (
  phone TEXT PRIMARY KEY,
  label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_sms_recipients TO authenticated;
GRANT ALL ON public.admin_sms_recipients TO service_role;
ALTER TABLE public.admin_sms_recipients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage sms recipients"
  ON public.admin_sms_recipients FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.timezone_health_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  edge_utc TIMESTAMPTZ,
  db_utc TIMESTAMPTZ,
  db_qc TIMESTAMPTZ,
  drift_ms INTEGER,
  status TEXT NOT NULL DEFAULT 'ok',
  notes TEXT
);
GRANT SELECT ON public.timezone_health_checks TO authenticated;
GRANT ALL ON public.timezone_health_checks TO service_role;
ALTER TABLE public.timezone_health_checks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins view timezone health"
  ON public.timezone_health_checks FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX IF NOT EXISTS idx_tz_health_checked_at
  ON public.timezone_health_checks (checked_at DESC);

CREATE OR REPLACE FUNCTION public.qc_now()
RETURNS TIMESTAMPTZ
LANGUAGE sql
STABLE
SET search_path = public
AS $$ SELECT now() AT TIME ZONE 'America/Toronto' AT TIME ZONE 'America/Toronto' $$;
