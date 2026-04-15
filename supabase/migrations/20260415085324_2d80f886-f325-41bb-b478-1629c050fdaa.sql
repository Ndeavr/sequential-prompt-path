
-- automation_blockers
CREATE TABLE public.automation_blockers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  blocker_key TEXT NOT NULL,
  engine_name TEXT NOT NULL DEFAULT 'unknown',
  workflow_id UUID,
  run_id UUID REFERENCES public.automation_runs(id) ON DELETE SET NULL,
  job_id UUID REFERENCES public.automation_jobs(id) ON DELETE SET NULL,
  severity_level TEXT NOT NULL DEFAULT 'medium',
  blocker_type TEXT NOT NULL DEFAULT 'unknown',
  blocker_title TEXT NOT NULL,
  blocker_message TEXT,
  suggested_resolution TEXT,
  retry_possible BOOLEAN NOT NULL DEFAULT false,
  fallback_available BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'open',
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.automation_blockers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access automation_blockers" ON public.automation_blockers FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE INDEX idx_automation_blockers_status ON public.automation_blockers(status);
CREATE INDEX idx_automation_blockers_severity ON public.automation_blockers(severity_level);

-- automation_workflows
CREATE TABLE public.automation_workflows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_key TEXT NOT NULL UNIQUE,
  workflow_name TEXT NOT NULL,
  engine_name TEXT NOT NULL DEFAULT 'general',
  description TEXT,
  trigger_type TEXT NOT NULL DEFAULT 'manual',
  status TEXT NOT NULL DEFAULT 'active',
  priority_level INT NOT NULL DEFAULT 5,
  auto_retry_enabled BOOLEAN NOT NULL DEFAULT true,
  requires_approval BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.automation_workflows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access automation_workflows" ON public.automation_workflows FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- automation_rules
CREATE TABLE public.automation_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rule_key TEXT NOT NULL UNIQUE,
  rule_name TEXT NOT NULL,
  engine_name TEXT NOT NULL DEFAULT 'general',
  trigger_condition JSONB NOT NULL DEFAULT '{}'::jsonb,
  action_type TEXT NOT NULL DEFAULT 'notify',
  action_config_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  priority_level INT NOT NULL DEFAULT 5,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access automation_rules" ON public.automation_rules FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- automation_action_logs
CREATE TABLE public.automation_action_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  engine_name TEXT NOT NULL DEFAULT 'unknown',
  workflow_id UUID REFERENCES public.automation_workflows(id) ON DELETE SET NULL,
  run_id UUID REFERENCES public.automation_runs(id) ON DELETE SET NULL,
  job_id UUID REFERENCES public.automation_jobs(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL,
  action_label TEXT,
  action_message TEXT,
  action_status TEXT NOT NULL DEFAULT 'completed',
  route_target TEXT,
  metadata_json JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.automation_action_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access automation_action_logs" ON public.automation_action_logs FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE INDEX idx_automation_action_logs_created ON public.automation_action_logs(created_at DESC);

-- automation_dashboard_preferences
CREATE TABLE public.automation_dashboard_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  default_time_range TEXT NOT NULL DEFAULT '24h',
  pinned_engines_json JSONB DEFAULT '[]'::jsonb,
  pinned_widgets_json JSONB DEFAULT '[]'::jsonb,
  layout_mode TEXT NOT NULL DEFAULT 'default',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);
ALTER TABLE public.automation_dashboard_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own dashboard prefs" ON public.automation_dashboard_preferences FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
