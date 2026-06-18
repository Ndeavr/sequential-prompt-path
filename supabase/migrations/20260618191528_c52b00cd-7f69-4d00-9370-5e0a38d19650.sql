
CREATE TABLE public.critical_path_metrics_snapshot (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  stage TEXT NOT NULL,
  stage_order INT NOT NULL,
  value NUMERIC NOT NULL DEFAULT 0,
  previous_stage_value NUMERIC,
  conversion_rate NUMERIC,
  top_failures JSONB DEFAULT '[]'::jsonb,
  meta JSONB DEFAULT '{}'::jsonb
);
CREATE INDEX idx_cpms_captured ON public.critical_path_metrics_snapshot (captured_at DESC);
CREATE INDEX idx_cpms_stage ON public.critical_path_metrics_snapshot (stage, captured_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.critical_path_metrics_snapshot TO authenticated;
GRANT ALL ON public.critical_path_metrics_snapshot TO service_role;
ALTER TABLE public.critical_path_metrics_snapshot ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read cpms" ON public.critical_path_metrics_snapshot FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Service writes cpms" ON public.critical_path_metrics_snapshot FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TABLE public.critical_path_test_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by UUID REFERENCES auth.users(id),
  tester_phone TEXT NOT NULL,
  tester_email TEXT NOT NULL,
  tester_business_name TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  current_stage TEXT NOT NULL DEFAULT 'prospect_found',
  final_status TEXT NOT NULL DEFAULT 'running',
  stage_timestamps JSONB NOT NULL DEFAULT '{}'::jsonb,
  stage_status JSONB NOT NULL DEFAULT '{}'::jsonb,
  errors JSONB NOT NULL DEFAULT '[]'::jsonb,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_cptr_started ON public.critical_path_test_runs (started_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.critical_path_test_runs TO authenticated;
GRANT ALL ON public.critical_path_test_runs TO service_role;
ALTER TABLE public.critical_path_test_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage cptr" ON public.critical_path_test_runs FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Service manages cptr" ON public.critical_path_test_runs FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.cptr_touch_updated() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;
CREATE TRIGGER trg_cptr_touch BEFORE UPDATE ON public.critical_path_test_runs
FOR EACH ROW EXECUTE FUNCTION public.cptr_touch_updated();
