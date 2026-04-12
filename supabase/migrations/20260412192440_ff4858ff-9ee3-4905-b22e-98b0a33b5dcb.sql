
-- pipeline_verification_runs
CREATE TABLE IF NOT EXISTS public.pipeline_verification_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  run_type text NOT NULL DEFAULT 'manual',
  status text NOT NULL DEFAULT 'pending',
  target_scope text,
  started_at timestamptz,
  completed_at timestamptz,
  success_count integer NOT NULL DEFAULT 0,
  failure_count integer NOT NULL DEFAULT 0,
  summary text
);
ALTER TABLE public.pipeline_verification_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access on pipeline_verification_runs" ON public.pipeline_verification_runs FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- pipeline_verification_steps
CREATE TABLE IF NOT EXISTS public.pipeline_verification_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  verification_run_id uuid NOT NULL REFERENCES public.pipeline_verification_runs(id) ON DELETE CASCADE,
  step_key text NOT NULL,
  step_label text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  started_at timestamptz,
  completed_at timestamptz,
  duration_ms integer,
  result_payload jsonb DEFAULT '{}'::jsonb,
  error_message text
);
ALTER TABLE public.pipeline_verification_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access on pipeline_verification_steps" ON public.pipeline_verification_steps FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- manual_test_scenarios
CREATE TABLE IF NOT EXISTS public.manual_test_scenarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_key text NOT NULL UNIQUE,
  scenario_label text NOT NULL,
  scenario_description text,
  test_type text NOT NULL DEFAULT 'scraping',
  default_payload jsonb DEFAULT '{}'::jsonb,
  expected_result jsonb DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.manual_test_scenarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access on manual_test_scenarios" ON public.manual_test_scenarios FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- manual_test_runs
CREATE TABLE IF NOT EXISTS public.manual_test_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id uuid REFERENCES public.manual_test_scenarios(id) ON DELETE SET NULL,
  created_by uuid,
  status text NOT NULL DEFAULT 'pending',
  input_payload jsonb DEFAULT '{}'::jsonb,
  result_payload jsonb DEFAULT '{}'::jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.manual_test_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access on manual_test_runs" ON public.manual_test_runs FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- automation_jobs
CREATE TABLE IF NOT EXISTS public.automation_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type text NOT NULL,
  job_scope text,
  status text NOT NULL DEFAULT 'queued',
  priority integer NOT NULL DEFAULT 5,
  dry_run boolean NOT NULL DEFAULT true,
  payload jsonb DEFAULT '{}'::jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  created_by uuid,
  failure_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.automation_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access on automation_jobs" ON public.automation_jobs FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER set_automation_jobs_updated_at BEFORE UPDATE ON public.automation_jobs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- automation_job_steps
CREATE TABLE IF NOT EXISTS public.automation_job_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_job_id uuid NOT NULL REFERENCES public.automation_jobs(id) ON DELETE CASCADE,
  step_key text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  result_payload jsonb DEFAULT '{}'::jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.automation_job_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access on automation_job_steps" ON public.automation_job_steps FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- automation_schedules
CREATE TABLE IF NOT EXISTS public.automation_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_type text NOT NULL UNIQUE,
  is_enabled boolean NOT NULL DEFAULT false,
  frequency_type text NOT NULL DEFAULT 'daily',
  run_hour integer NOT NULL DEFAULT 8,
  daily_limit integer NOT NULL DEFAULT 50,
  days_active jsonb DEFAULT '["mon","tue","wed","thu","fri"]'::jsonb,
  last_run_at timestamptz,
  next_run_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.automation_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access on automation_schedules" ON public.automation_schedules FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER set_automation_schedules_updated_at BEFORE UPDATE ON public.automation_schedules FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- automation_failures
CREATE TABLE IF NOT EXISTS public.automation_failures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_job_id uuid REFERENCES public.automation_jobs(id) ON DELETE CASCADE,
  failure_stage text NOT NULL,
  failure_code text,
  failure_message text,
  failure_payload jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.automation_failures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access on automation_failures" ON public.automation_failures FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- pipeline_logs
CREATE TABLE IF NOT EXISTS public.pipeline_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  log_type text NOT NULL DEFAULT 'info',
  source_module text NOT NULL,
  entity_type text,
  entity_id uuid,
  status text,
  message text NOT NULL,
  payload jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.pipeline_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access on pipeline_logs" ON public.pipeline_logs FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE INDEX idx_pipeline_logs_source ON public.pipeline_logs(source_module);
CREATE INDEX idx_pipeline_logs_created ON public.pipeline_logs(created_at DESC);

-- pipeline_health_snapshots
CREATE TABLE IF NOT EXISTS public.pipeline_health_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date date NOT NULL DEFAULT CURRENT_DATE,
  scraping_health text NOT NULL DEFAULT 'unknown',
  enrichment_health text NOT NULL DEFAULT 'unknown',
  scoring_health text NOT NULL DEFAULT 'unknown',
  emailing_health text NOT NULL DEFAULT 'unknown',
  reply_health text NOT NULL DEFAULT 'unknown',
  automation_health text NOT NULL DEFAULT 'unknown',
  global_health text NOT NULL DEFAULT 'unknown',
  snapshot_payload jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.pipeline_health_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access on pipeline_health_snapshots" ON public.pipeline_health_snapshots FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
