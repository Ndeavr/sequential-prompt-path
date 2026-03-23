
-- Roadmap Execution Agent tables

CREATE TABLE public.roadmap_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_slug text UNIQUE NOT NULL,
  module_name text NOT NULL,
  phase_slug text NOT NULL,
  phase_order integer NOT NULL,
  module_order integer NOT NULL,
  module_description text,
  build_status text NOT NULL DEFAULT 'pending',
  dependency_status text NOT NULL DEFAULT 'unknown',
  implementation_confidence text NOT NULL DEFAULT 'unknown',
  is_required boolean NOT NULL DEFAULT true,
  approval_required boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.roadmap_module_dependencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_slug text NOT NULL,
  depends_on_module_slug text NOT NULL,
  dependency_type text NOT NULL DEFAULT 'hard',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(module_slug, depends_on_module_slug)
);

CREATE TABLE public.roadmap_execution_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_slug text NOT NULL,
  run_type text NOT NULL DEFAULT 'build',
  run_status text NOT NULL DEFAULT 'queued',
  run_notes text,
  prompt_generated text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.roadmap_execution_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_slug text NOT NULL,
  decision_type text NOT NULL,
  decision_reason text,
  decided_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.roadmap_implementation_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_slug text NOT NULL,
  evidence_type text NOT NULL,
  evidence_reference text,
  evidence_notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.roadmap_execution_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_slug text NOT NULL,
  queue_position integer NOT NULL,
  queue_status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Trigger for updated_at
CREATE TRIGGER set_roadmap_modules_updated_at BEFORE UPDATE ON public.roadmap_modules FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_roadmap_queue_updated_at BEFORE UPDATE ON public.roadmap_execution_queue FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS
ALTER TABLE public.roadmap_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roadmap_module_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roadmap_execution_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roadmap_execution_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roadmap_implementation_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roadmap_execution_queue ENABLE ROW LEVEL SECURITY;

-- Admin-only policies
CREATE POLICY "admin_all_roadmap_modules" ON public.roadmap_modules FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_all_roadmap_deps" ON public.roadmap_module_dependencies FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_all_roadmap_runs" ON public.roadmap_execution_runs FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_all_roadmap_decisions" ON public.roadmap_execution_decisions FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_all_roadmap_evidence" ON public.roadmap_implementation_evidence FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_all_roadmap_queue" ON public.roadmap_execution_queue FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Indexes
CREATE INDEX idx_roadmap_modules_phase ON public.roadmap_modules(phase_order, module_order);
CREATE INDEX idx_roadmap_modules_status ON public.roadmap_modules(build_status);
CREATE INDEX idx_roadmap_queue_position ON public.roadmap_execution_queue(queue_position);
