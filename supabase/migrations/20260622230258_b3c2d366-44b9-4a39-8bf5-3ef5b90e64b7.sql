
-- 1. ai_visibility_runs
CREATE TABLE public.ai_visibility_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phase TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  triggered_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.ai_visibility_runs TO authenticated;
GRANT ALL ON public.ai_visibility_runs TO service_role;
ALTER TABLE public.ai_visibility_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read runs" ON public.ai_visibility_runs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 2. ai_visibility_findings
CREATE TABLE public.ai_visibility_findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID REFERENCES public.ai_visibility_runs(id) ON DELETE CASCADE,
  phase TEXT NOT NULL,
  route TEXT,
  entity_type TEXT,
  entity_id TEXT,
  severity TEXT NOT NULL DEFAULT 'medium',
  score NUMERIC,
  auto_repairable BOOLEAN NOT NULL DEFAULT false,
  repair_status TEXT NOT NULL DEFAULT 'pending',
  estimated_conversion_lift_pct NUMERIC DEFAULT 0,
  estimated_revenue_impact_cad NUMERIC DEFAULT 0,
  repair_difficulty SMALLINT DEFAULT 3,
  recommended_action TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_avf_phase ON public.ai_visibility_findings(phase);
CREATE INDEX idx_avf_severity ON public.ai_visibility_findings(severity);
CREATE INDEX idx_avf_revenue ON public.ai_visibility_findings(estimated_revenue_impact_cad DESC);
CREATE INDEX idx_avf_status ON public.ai_visibility_findings(repair_status);
GRANT SELECT, UPDATE ON public.ai_visibility_findings TO authenticated;
GRANT ALL ON public.ai_visibility_findings TO service_role;
ALTER TABLE public.ai_visibility_findings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read findings" ON public.ai_visibility_findings FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update findings" ON public.ai_visibility_findings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 3. ai_citation_scores
CREATE TABLE public.ai_citation_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route TEXT NOT NULL,
  engine TEXT NOT NULL,
  score NUMERIC NOT NULL DEFAULT 0,
  factors JSONB NOT NULL DEFAULT '{}'::jsonb,
  scanned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX idx_acs_route_engine ON public.ai_citation_scores(route, engine);
GRANT SELECT ON public.ai_citation_scores TO authenticated;
GRANT ALL ON public.ai_citation_scores TO service_role;
ALTER TABLE public.ai_citation_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read citation scores" ON public.ai_citation_scores FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 4. contractor_fit_blocks
CREATE TABLE public.contractor_fit_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID NOT NULL,
  why_recommended TEXT,
  best_for TEXT[],
  not_ideal_for TEXT[],
  model TEXT,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX idx_cfb_contractor ON public.contractor_fit_blocks(contractor_id);
GRANT SELECT ON public.contractor_fit_blocks TO anon, authenticated;
GRANT ALL ON public.contractor_fit_blocks TO service_role;
ALTER TABLE public.contractor_fit_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read fit blocks" ON public.contractor_fit_blocks FOR SELECT TO anon, authenticated USING (true);

-- 5. ai_visibility_settings
CREATE TABLE public.ai_visibility_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.ai_visibility_settings TO authenticated;
GRANT ALL ON public.ai_visibility_settings TO service_role;
ALTER TABLE public.ai_visibility_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage settings" ON public.ai_visibility_settings FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.ai_visibility_settings (key, value, description) VALUES
  ('citation_engine_weights', '{"chatgpt":1.0,"gemini":1.0,"perplexity":1.1,"claude":0.9,"copilot":0.8}'::jsonb, 'Per-engine citation likelihood weights'),
  ('auto_repair_thresholds', '{"min_score_for_auto":80,"rewrite_requires_approval":true}'::jsonb, 'Auto-repair behavior'),
  ('revenue_assumptions', '{"avg_contractor_ltv_cad":3500,"avg_homeowner_value_cad":120,"monthly_baseline_traffic":5000}'::jsonb, 'Revenue impact assumptions');

-- updated_at triggers
CREATE TRIGGER trg_avr_updated BEFORE UPDATE ON public.ai_visibility_runs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_avf_updated BEFORE UPDATE ON public.ai_visibility_findings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_cfb_updated BEFORE UPDATE ON public.contractor_fit_blocks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_avs_updated BEFORE UPDATE ON public.ai_visibility_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
