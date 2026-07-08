
-- 1. system_flags: runtime kill switches (OUTREACH_ENABLED, etc.)
CREATE TABLE IF NOT EXISTS public.system_flags (
  key TEXT PRIMARY KEY,
  value BOOLEAN NOT NULL DEFAULT false,
  description TEXT,
  updated_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.system_flags TO authenticated;
GRANT ALL ON public.system_flags TO service_role;

ALTER TABLE public.system_flags ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Admins read system_flags"
    ON public.system_flags FOR SELECT TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Admins write system_flags"
    ON public.system_flags FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Seed OUTREACH_ENABLED = false (kill switch ON until Twilio 401 fixed)
INSERT INTO public.system_flags (key, value, description)
VALUES ('OUTREACH_ENABLED', false, 'Master kill switch for all outbound SMS/email senders. Must be true for any outreach edge function to actually call a provider.')
ON CONFLICT (key) DO NOTHING;

-- 2. provider_health_checks: PASS/FAIL history per provider check
CREATE TABLE IF NOT EXISTS public.provider_health_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,           -- twilio | resend | stripe | lovable_ai
  check_name TEXT NOT NULL,         -- auth | messaging_service | from_number | domains | webhook_signing
  status TEXT NOT NULL,             -- pass | fail | skipped
  http_status INT,
  latency_ms INT,
  error_body JSONB,
  metadata JSONB,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.provider_health_checks TO authenticated;
GRANT ALL ON public.provider_health_checks TO service_role;

ALTER TABLE public.provider_health_checks ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Admins read provider_health_checks"
    ON public.provider_health_checks FOR SELECT TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_provider_health_recent
  ON public.provider_health_checks (provider, check_name, checked_at DESC);

-- 3. Ensure the outreach queue allows the new terminal status without breaking constraints.
--    contractor_outreach_queue.status is TEXT (no enum) — no migration needed on column.
--    Add helpful index for the new state.
CREATE INDEX IF NOT EXISTS idx_outreach_queue_status
  ON public.contractor_outreach_queue (status);

-- 4. Admin-only RPC to flip a system flag.
CREATE OR REPLACE FUNCTION public.set_system_flag(_key TEXT, _value BOOLEAN)
RETURNS public.system_flags
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  row public.system_flags;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;
  INSERT INTO public.system_flags(key, value, updated_by, updated_at)
  VALUES (_key, _value, auth.uid(), now())
  ON CONFLICT (key) DO UPDATE
    SET value = EXCLUDED.value,
        updated_by = EXCLUDED.updated_by,
        updated_at = now()
  RETURNING * INTO row;
  RETURN row;
END;
$$;

REVOKE ALL ON FUNCTION public.set_system_flag(TEXT, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_system_flag(TEXT, BOOLEAN) TO authenticated;
