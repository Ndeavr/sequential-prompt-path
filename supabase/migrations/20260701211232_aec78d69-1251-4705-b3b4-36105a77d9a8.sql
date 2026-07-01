
CREATE TABLE IF NOT EXISTS public.admin_system_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  check_key text NOT NULL UNIQUE,
  label text NOT NULL,
  category text NOT NULL,
  status text NOT NULL DEFAULT 'unknown' CHECK (status IN ('healthy','warning','critical','unknown')),
  affected_count integer NOT NULL DEFAULT 0,
  last_checked_at timestamptz,
  last_auto_fix_at timestamptz,
  recommended_action text,
  repair_route text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.admin_repair_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type text NOT NULL,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','dry_run_completed','waiting_approval','applied','failed','skipped')),
  risk_level text NOT NULL DEFAULT 'safe' CHECK (risk_level IN ('safe','review','danger')),
  affected_count integer NOT NULL DEFAULT 0,
  sample_diff jsonb NOT NULL DEFAULT '[]'::jsonb,
  summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  error_message text,
  created_by uuid,
  approved_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  applied_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_admin_repair_jobs_created ON public.admin_repair_jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_repair_jobs_type ON public.admin_repair_jobs(job_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_system_checks_category ON public.admin_system_checks(category);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_system_checks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_repair_jobs TO authenticated;
GRANT ALL ON public.admin_system_checks TO service_role;
GRANT ALL ON public.admin_repair_jobs TO service_role;

ALTER TABLE public.admin_system_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_repair_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_system_checks_admin_all" ON public.admin_system_checks;
CREATE POLICY "admin_system_checks_admin_all" ON public.admin_system_checks
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "admin_repair_jobs_admin_all" ON public.admin_repair_jobs;
CREATE POLICY "admin_repair_jobs_admin_all" ON public.admin_repair_jobs
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$
LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_admin_system_checks_updated ON public.admin_system_checks;
CREATE TRIGGER trg_admin_system_checks_updated BEFORE UPDATE ON public.admin_system_checks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_admin_repair_jobs_updated ON public.admin_repair_jobs;
CREATE TRIGGER trg_admin_repair_jobs_updated BEFORE UPDATE ON public.admin_repair_jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
