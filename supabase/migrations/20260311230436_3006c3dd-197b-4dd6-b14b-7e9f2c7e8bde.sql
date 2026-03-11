
-- Agent tasks table for the autonomous orchestrator system
CREATE TABLE public.agent_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_name text NOT NULL,
  agent_domain text NOT NULL DEFAULT 'operations',
  task_title text NOT NULL,
  task_description text,
  action_plan jsonb DEFAULT '[]'::jsonb,
  impact_score integer NOT NULL DEFAULT 0,
  urgency text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'proposed',
  execution_result jsonb,
  proposed_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid,
  executed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Agent execution logs
CREATE TABLE public.agent_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES public.agent_tasks(id) ON DELETE CASCADE,
  agent_name text NOT NULL,
  log_type text NOT NULL DEFAULT 'info',
  message text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- System metrics snapshots for the orchestrator
CREATE TABLE public.agent_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name text NOT NULL,
  metric_value numeric NOT NULL DEFAULT 0,
  metric_category text NOT NULL DEFAULT 'system',
  snapshot_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE public.agent_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_metrics ENABLE ROW LEVEL SECURITY;

-- Only admins can access agent system
CREATE POLICY "Admins can manage agent tasks" ON public.agent_tasks FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Service role manages agent tasks" ON public.agent_tasks FOR ALL TO service_role USING (true);

CREATE POLICY "Admins can view agent logs" ON public.agent_logs FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Service role manages agent logs" ON public.agent_logs FOR ALL TO service_role USING (true);

CREATE POLICY "Admins can view agent metrics" ON public.agent_metrics FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Service role manages agent metrics" ON public.agent_metrics FOR ALL TO service_role USING (true);

-- Indexes
CREATE INDEX idx_agent_tasks_status ON public.agent_tasks(status);
CREATE INDEX idx_agent_tasks_agent ON public.agent_tasks(agent_name);
CREATE INDEX idx_agent_tasks_impact ON public.agent_tasks(impact_score DESC);
CREATE INDEX idx_agent_logs_task ON public.agent_logs(task_id);
CREATE INDEX idx_agent_metrics_category ON public.agent_metrics(metric_category);
CREATE INDEX idx_agent_metrics_snapshot ON public.agent_metrics(snapshot_at DESC);
