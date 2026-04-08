
-- Table: execution_complexity_factors
CREATE TABLE public.execution_complexity_factors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  factor_key TEXT NOT NULL UNIQUE,
  factor_label TEXT NOT NULL,
  weight NUMERIC NOT NULL DEFAULT 1.0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.execution_complexity_factors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage complexity factors"
ON public.execution_complexity_factors FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Table: execution_decision_rules
CREATE TABLE public.execution_decision_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rule_name TEXT NOT NULL,
  min_score NUMERIC NOT NULL DEFAULT 0,
  max_score NUMERIC NOT NULL DEFAULT 100,
  action TEXT NOT NULL DEFAULT 'run',
  max_credit_allowed NUMERIC NOT NULL DEFAULT 100,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.execution_decision_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage decision rules"
ON public.execution_decision_rules FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Add columns to execution_tasks
ALTER TABLE public.execution_tasks
  ADD COLUMN IF NOT EXISTS advanced_score NUMERIC,
  ADD COLUMN IF NOT EXISTS breakdown_json JSONB,
  ADD COLUMN IF NOT EXISTS estimated_credits NUMERIC;

-- Add columns to execution_decisions
ALTER TABLE public.execution_decisions
  ADD COLUMN IF NOT EXISTS rule_applied TEXT,
  ADD COLUMN IF NOT EXISTS score_snapshot NUMERIC;

-- Seed complexity factors
INSERT INTO public.execution_complexity_factors (factor_key, factor_label, weight) VALUES
  ('tables_count', 'Tables à créer', 3.0),
  ('components_count', 'Composants UI', 2.0),
  ('pages_count', 'Pages à brancher', 2.5),
  ('api_calls', 'Appels API externes', 1.5),
  ('edge_functions', 'Edge Functions', 3.0),
  ('automation_needed', 'Automatisations', 2.0),
  ('cron_jobs', 'Cron Jobs', 2.5),
  ('image_generation', 'Génération d''images', 1.0),
  ('data_volume', 'Volume de données', 1.5),
  ('dependencies_count', 'Dépendances', 1.0);

-- Seed decision rules
INSERT INTO public.execution_decision_rules (rule_name, min_score, max_score, action, max_credit_allowed) VALUES
  ('Léger — exécuter', 0, 30, 'run', 50),
  ('Moyen — découper', 30, 80, 'split', 100),
  ('Lourd — pause', 80, 999, 'pause', 200);
