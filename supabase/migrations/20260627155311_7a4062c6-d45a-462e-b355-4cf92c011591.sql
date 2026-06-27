
CREATE TABLE IF NOT EXISTS public.email_health_selftest_runs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ran_at timestamptz NOT NULL DEFAULT now(),
  run_type text NOT NULL DEFAULT 'daily_selftest',
  recipient text NOT NULL,
  subject text,
  passed boolean NOT NULL DEFAULT false,
  provider_message_id text,
  provider_response jsonb,
  error_message text
);
CREATE INDEX IF NOT EXISTS idx_email_health_selftest_runs_ran_at ON public.email_health_selftest_runs (ran_at DESC);
GRANT SELECT ON public.email_health_selftest_runs TO authenticated;
GRANT ALL ON public.email_health_selftest_runs TO service_role;
ALTER TABLE public.email_health_selftest_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read selftest runs" ON public.email_health_selftest_runs
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
