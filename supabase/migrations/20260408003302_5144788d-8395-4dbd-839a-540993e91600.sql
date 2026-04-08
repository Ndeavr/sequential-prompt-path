
-- Table: execution_agent_tasks
CREATE TABLE public.execution_agent_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  parent_task_id UUID REFERENCES public.execution_tasks(id) ON DELETE CASCADE,
  agent_type TEXT NOT NULL DEFAULT 'execution_runner',
  task_payload JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  result_json JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.execution_agent_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage agent tasks" ON public.execution_agent_tasks FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Table: execution_recovery_memory
CREATE TABLE public.execution_recovery_memory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID REFERENCES public.execution_tasks(id) ON DELETE CASCADE,
  failure_type TEXT NOT NULL,
  recovery_strategy TEXT NOT NULL,
  success BOOLEAN NOT NULL DEFAULT false,
  retry_count INTEGER NOT NULL DEFAULT 0,
  context_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.execution_recovery_memory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage recovery memory" ON public.execution_recovery_memory FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Table: execution_learning_logs
CREATE TABLE public.execution_learning_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_type TEXT NOT NULL,
  complexity_score NUMERIC,
  estimated_credits NUMERIC,
  actual_credits NUMERIC,
  success_rate NUMERIC,
  avg_duration_ms NUMERIC,
  sample_count INTEGER NOT NULL DEFAULT 1,
  insights_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.execution_learning_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage learning logs" ON public.execution_learning_logs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Add columns to execution_tasks
ALTER TABLE public.execution_tasks
  ADD COLUMN IF NOT EXISTS auto_split_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS learning_adjusted_score NUMERIC;

-- Add columns to execution_runs
ALTER TABLE public.execution_runs
  ADD COLUMN IF NOT EXISTS recovery_used TEXT,
  ADD COLUMN IF NOT EXISTS agent_used TEXT;
