
-- Validation system tables

CREATE TABLE public.validation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','running','completed','failed')),
  triggered_by UUID REFERENCES auth.users(id),
  total_pages INTEGER DEFAULT 0,
  pages_scanned INTEGER DEFAULT 0,
  critical_count INTEGER DEFAULT 0,
  high_count INTEGER DEFAULT 0,
  medium_count INTEGER DEFAULT 0,
  low_count INTEGER DEFAULT 0,
  executive_summary TEXT,
  run_config JSONB DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.validation_findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID REFERENCES public.validation_runs(id) ON DELETE CASCADE NOT NULL,
  agent TEXT NOT NULL CHECK (agent IN ('agent_q','agent_i')),
  category TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('critical','high','medium','low','info')),
  page_route TEXT,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  expected_behavior TEXT,
  actual_behavior TEXT,
  reproduction_steps JSONB,
  probable_cause TEXT,
  suggested_fix TEXT,
  screenshot_url TEXT,
  business_impact_score INTEGER DEFAULT 0,
  is_resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.page_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID REFERENCES public.validation_runs(id) ON DELETE CASCADE NOT NULL,
  page_route TEXT NOT NULL,
  page_name TEXT NOT NULL,
  clarity_score INTEGER DEFAULT 0,
  navigation_score INTEGER DEFAULT 0,
  cta_score INTEGER DEFAULT 0,
  trust_score INTEGER DEFAULT 0,
  visual_score INTEGER DEFAULT 0,
  image_score INTEGER DEFAULT 0,
  mobile_score INTEGER DEFAULT 0,
  overall_score INTEGER DEFAULT 0,
  recommendations JSONB DEFAULT '[]'::jsonb,
  strengths JSONB DEFAULT '[]'::jsonb,
  weaknesses JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.improvement_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID REFERENCES public.validation_runs(id) ON DELETE CASCADE,
  finding_id UUID REFERENCES public.validation_findings(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  priority TEXT NOT NULL CHECK (priority IN ('p0','p1','p2','p3')),
  effort TEXT CHECK (effort IN ('quick_win','small','medium','large')),
  category TEXT NOT NULL,
  page_route TEXT,
  status TEXT NOT NULL DEFAULT 'backlog' CHECK (status IN ('backlog','todo','in_progress','done','wont_fix')),
  assigned_to UUID REFERENCES auth.users(id),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.validation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.validation_findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.improvement_tasks ENABLE ROW LEVEL SECURITY;

-- Admin-only policies
CREATE POLICY "Admins manage validation_runs" ON public.validation_runs FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage validation_findings" ON public.validation_findings FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage page_scores" ON public.page_scores FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage improvement_tasks" ON public.improvement_tasks FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Updated_at triggers
CREATE TRIGGER set_updated_at_validation_runs BEFORE UPDATE ON public.validation_runs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER set_updated_at_improvement_tasks BEFORE UPDATE ON public.improvement_tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
