
-- execution_tasks
CREATE TABLE public.execution_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_key text NOT NULL,
  task_name text NOT NULL,
  module_name text,
  requested_scope_json jsonb DEFAULT '{}'::jsonb,
  estimated_complexity_score integer DEFAULT 0,
  estimated_credit_cost numeric DEFAULT 0,
  execution_mode text DEFAULT 'full',
  current_status text DEFAULT 'pending_evaluation',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.execution_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access on execution_tasks" ON public.execution_tasks FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- execution_runs
CREATE TABLE public.execution_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES public.execution_tasks(id) ON DELETE CASCADE NOT NULL,
  run_type text DEFAULT 'full',
  started_at timestamptz DEFAULT now(),
  finished_at timestamptz,
  duration_ms integer,
  credits_estimated numeric DEFAULT 0,
  credits_actual numeric DEFAULT 0,
  run_status text DEFAULT 'running',
  partial_output_json jsonb,
  error_message text
);
ALTER TABLE public.execution_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access on execution_runs" ON public.execution_runs FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- execution_budget_rules
CREATE TABLE public.execution_budget_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_key text UNIQUE NOT NULL,
  rule_name text NOT NULL,
  max_complexity_score integer DEFAULT 100,
  max_credit_estimate numeric DEFAULT 50,
  max_duration_seconds integer DEFAULT 300,
  auto_pause_enabled boolean DEFAULT true,
  auto_split_enabled boolean DEFAULT true,
  ask_question_threshold integer DEFAULT 3,
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.execution_budget_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access on execution_budget_rules" ON public.execution_budget_rules FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- execution_decisions
CREATE TABLE public.execution_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES public.execution_tasks(id) ON DELETE CASCADE NOT NULL,
  decision_type text NOT NULL,
  decision_reason text,
  selected_strategy text,
  decision_payload_json jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.execution_decisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access on execution_decisions" ON public.execution_decisions FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- execution_recovery_actions
CREATE TABLE public.execution_recovery_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES public.execution_tasks(id) ON DELETE CASCADE NOT NULL,
  recovery_type text NOT NULL,
  recovery_label text,
  recovery_payload_json jsonb DEFAULT '{}'::jsonb,
  recovery_status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.execution_recovery_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access on execution_recovery_actions" ON public.execution_recovery_actions FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- execution_missing_inputs
CREATE TABLE public.execution_missing_inputs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES public.execution_tasks(id) ON DELETE CASCADE NOT NULL,
  input_key text NOT NULL,
  input_label text,
  blocking_level text DEFAULT 'medium',
  suggested_default text,
  question_text text,
  resolution_status text DEFAULT 'unresolved',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.execution_missing_inputs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access on execution_missing_inputs" ON public.execution_missing_inputs FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- execution_split_plans
CREATE TABLE public.execution_split_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES public.execution_tasks(id) ON DELETE CASCADE NOT NULL,
  split_version integer DEFAULT 1,
  split_steps_json jsonb DEFAULT '[]'::jsonb,
  current_step_index integer DEFAULT 0,
  split_status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.execution_split_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access on execution_split_plans" ON public.execution_split_plans FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- execution_fail_safes
CREATE TABLE public.execution_fail_safes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES public.execution_tasks(id) ON DELETE CASCADE NOT NULL,
  fail_safe_type text NOT NULL,
  trigger_reason text,
  action_taken text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.execution_fail_safes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access on execution_fail_safes" ON public.execution_fail_safes FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Seed default budget rules
INSERT INTO public.execution_budget_rules (rule_key, rule_name, max_complexity_score, max_credit_estimate, max_duration_seconds, auto_pause_enabled, auto_split_enabled, ask_question_threshold)
VALUES
  ('default', 'Règle par défaut', 80, 30, 180, true, true, 2),
  ('heavy_module', 'Module lourd', 150, 80, 600, true, true, 3),
  ('light_task', 'Tâche légère', 30, 10, 60, false, false, 1);
