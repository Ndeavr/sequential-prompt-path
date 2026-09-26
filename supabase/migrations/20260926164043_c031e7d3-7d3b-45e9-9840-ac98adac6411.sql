CREATE TABLE public.system_status_checks (
  check_key text PRIMARY KEY,
  label text NOT NULL,
  status text NOT NULL DEFAULT 'untested' CHECK (status IN ('ok','problem','untested')),
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  probable_cause text,
  component text,
  fix_applied text,
  test_performed text,
  next_blocker text,
  sort_order int NOT NULL DEFAULT 0,
  checked_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.system_status_checks TO authenticated;
GRANT ALL ON public.system_status_checks TO service_role;
ALTER TABLE public.system_status_checks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read system status" ON public.system_status_checks
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));