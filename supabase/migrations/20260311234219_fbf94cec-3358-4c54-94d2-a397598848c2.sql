
-- Agent Registry: dynamic agent definitions with hierarchy
CREATE TABLE public.agent_registry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_key text NOT NULL UNIQUE,
  agent_name text NOT NULL,
  layer text NOT NULL DEFAULT 'operational' CHECK (layer IN ('chief', 'executive', 'operational', 'micro')),
  domain text NOT NULL DEFAULT 'operations',
  parent_agent_key text REFERENCES public.agent_registry(agent_key),
  mission text,
  actions jsonb DEFAULT '[]'::jsonb,
  triggers jsonb DEFAULT '[]'::jsonb,
  inputs jsonb DEFAULT '[]'::jsonb,
  outputs jsonb DEFAULT '[]'::jsonb,
  tools jsonb DEFAULT '[]'::jsonb,
  success_metrics jsonb DEFAULT '[]'::jsonb,
  config jsonb DEFAULT '{}'::jsonb,
  autonomy_level text NOT NULL DEFAULT 'propose' CHECK (autonomy_level IN ('propose', 'semi_auto', 'full_auto')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'archived', 'creating')),
  tasks_executed integer DEFAULT 0,
  tasks_succeeded integer DEFAULT 0,
  success_rate numeric DEFAULT 0,
  created_by text DEFAULT 'system',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Agent Memory: shared knowledge between agents
CREATE TABLE public.agent_memory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  memory_key text NOT NULL,
  memory_type text NOT NULL DEFAULT 'insight' CHECK (memory_type IN ('insight', 'pattern', 'success', 'failure', 'preference', 'benchmark')),
  domain text NOT NULL DEFAULT 'system',
  content text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  importance integer DEFAULT 5 CHECK (importance >= 1 AND importance <= 10),
  agent_key text REFERENCES public.agent_registry(agent_key),
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.agent_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_memory ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Admins can manage agent registry" ON public.agent_registry
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role manages agent registry" ON public.agent_registry
  FOR ALL TO service_role USING (true);

CREATE POLICY "Admins can manage agent memory" ON public.agent_memory
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role manages agent memory" ON public.agent_memory
  FOR ALL TO service_role USING (true);

-- Add parent_agent_key to agent_tasks for hierarchy
ALTER TABLE public.agent_tasks ADD COLUMN IF NOT EXISTS agent_key text REFERENCES public.agent_registry(agent_key);
ALTER TABLE public.agent_tasks ADD COLUMN IF NOT EXISTS execution_mode text DEFAULT 'manual';
ALTER TABLE public.agent_tasks ADD COLUMN IF NOT EXISTS auto_executable boolean DEFAULT false;

-- Indexes
CREATE INDEX idx_agent_registry_layer ON public.agent_registry(layer);
CREATE INDEX idx_agent_registry_domain ON public.agent_registry(domain);
CREATE INDEX idx_agent_registry_parent ON public.agent_registry(parent_agent_key);
CREATE INDEX idx_agent_registry_status ON public.agent_registry(status);
CREATE INDEX idx_agent_memory_domain ON public.agent_memory(domain);
CREATE INDEX idx_agent_memory_type ON public.agent_memory(memory_type);
CREATE INDEX idx_agent_memory_agent ON public.agent_memory(agent_key);

-- Updated_at trigger for agent_registry
CREATE TRIGGER update_agent_registry_updated_at
  BEFORE UPDATE ON public.agent_registry
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
