
-- =============================================
-- AUTOMATION ENGINE TABLES
-- =============================================

-- 1. automation_agents
CREATE TABLE IF NOT EXISTS public.automation_agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  category text NOT NULL CHECK (category IN ('trigger','build','optimization','strategic')),
  is_enabled boolean DEFAULT true,
  frequency_type text NOT NULL CHECK (frequency_type IN ('minutes','hours','daily','weekly','manual')),
  frequency_value integer DEFAULT 10,
  cron_expression text,
  timezone text DEFAULT 'America/Montreal',
  priority integer DEFAULT 100,
  max_jobs_per_run integer DEFAULT 10,
  max_jobs_per_day integer DEFAULT 100,
  quality_threshold numeric DEFAULT 0.7,
  duplicate_similarity_threshold numeric DEFAULT 0.9,
  min_data_confidence numeric DEFAULT 0.6,
  requires_manual_review boolean DEFAULT false,
  run_if_queue_not_empty_only boolean DEFAULT false,
  config jsonb DEFAULT '{}',
  last_run_at timestamptz,
  next_run_at timestamptz,
  last_status text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. automation_jobs
CREATE TABLE IF NOT EXISTS public.automation_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid REFERENCES public.automation_agents(id) ON DELETE CASCADE,
  job_type text,
  entity_type text,
  entity_id text,
  title text,
  payload jsonb DEFAULT '{}',
  priority integer DEFAULT 100,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','completed','failed','cancelled','skipped','needs_review')),
  scheduled_for timestamptz,
  started_at timestamptz,
  finished_at timestamptz,
  duration_ms integer,
  attempts integer DEFAULT 0,
  max_attempts integer DEFAULT 3,
  error_message text,
  result_summary text,
  result_payload jsonb DEFAULT '{}',
  source_trigger text,
  created_by text DEFAULT 'system',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. automation_runs
CREATE TABLE IF NOT EXISTS public.automation_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid REFERENCES public.automation_agents(id) ON DELETE CASCADE,
  triggered_by text CHECK (triggered_by IN ('scheduler','manual','system')),
  run_started_at timestamptz,
  run_finished_at timestamptz,
  status text DEFAULT 'running' CHECK (status IN ('running','completed','failed','partial')),
  jobs_found integer DEFAULT 0,
  jobs_executed integer DEFAULT 0,
  jobs_succeeded integer DEFAULT 0,
  jobs_failed integer DEFAULT 0,
  jobs_skipped integer DEFAULT 0,
  notes text,
  metrics jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- 4. automation_settings
CREATE TABLE IF NOT EXISTS public.automation_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value jsonb NOT NULL,
  updated_at timestamptz DEFAULT now()
);

-- 5. automation_prompt_exports
CREATE TABLE IF NOT EXISTS public.automation_prompt_exports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid REFERENCES public.automation_jobs(id) ON DELETE SET NULL,
  module_key text,
  title text,
  prompt_text text,
  created_at timestamptz DEFAULT now()
);

-- 6. automation_alerts
CREATE TABLE IF NOT EXISTS public.automation_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  level text NOT NULL CHECK (level IN ('info','warning','critical')),
  title text,
  message text,
  source text,
  is_read boolean DEFAULT false,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- 7. generated_pages_registry
CREATE TABLE IF NOT EXISTS public.generated_pages_registry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_type text,
  slug text UNIQUE,
  city text,
  category text,
  profession text,
  source_agent_key text,
  status text DEFAULT 'draft',
  seo_score numeric,
  aiseo_score numeric,
  quality_score numeric,
  indexed_status text DEFAULT 'not_indexed',
  published_at timestamptz,
  updated_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_automation_jobs_status ON public.automation_jobs(status);
CREATE INDEX IF NOT EXISTS idx_automation_jobs_agent_id ON public.automation_jobs(agent_id);
CREATE INDEX IF NOT EXISTS idx_automation_jobs_priority ON public.automation_jobs(priority DESC);
CREATE INDEX IF NOT EXISTS idx_automation_runs_agent_id ON public.automation_runs(agent_id);
CREATE INDEX IF NOT EXISTS idx_automation_alerts_level ON public.automation_alerts(level);
CREATE INDEX IF NOT EXISTS idx_generated_pages_slug ON public.generated_pages_registry(slug);
CREATE INDEX IF NOT EXISTS idx_generated_pages_type ON public.generated_pages_registry(page_type);

-- RLS
ALTER TABLE public.automation_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_prompt_exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_pages_registry ENABLE ROW LEVEL SECURITY;

-- Admin-only policies
CREATE POLICY "admin_automation_agents_all" ON public.automation_agents FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_automation_jobs_all" ON public.automation_jobs FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_automation_runs_all" ON public.automation_runs FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_automation_settings_all" ON public.automation_settings FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_automation_prompt_exports_all" ON public.automation_prompt_exports FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_automation_alerts_all" ON public.automation_alerts FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_generated_pages_all" ON public.generated_pages_registry FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Updated_at triggers
CREATE TRIGGER set_updated_at_automation_agents BEFORE UPDATE ON public.automation_agents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER set_updated_at_automation_jobs BEFORE UPDATE ON public.automation_jobs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER set_updated_at_automation_settings BEFORE UPDATE ON public.automation_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER set_updated_at_generated_pages BEFORE UPDATE ON public.generated_pages_registry FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
