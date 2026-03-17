
-- ============================================
-- OPTIMIZATION INSIGHTS
-- ============================================
CREATE TABLE public.optimization_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  placement_id uuid REFERENCES public.qr_placements(id) ON DELETE SET NULL,
  feature text,
  city text,
  role text,
  metric_type text NOT NULL,
  metric_value numeric NOT NULL DEFAULT 0,
  insight_type text NOT NULL,
  confidence_score numeric NOT NULL DEFAULT 0.5,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_optimization_insights_type ON public.optimization_insights(insight_type);
CREATE INDEX idx_optimization_insights_created ON public.optimization_insights(created_at DESC);
ALTER TABLE public.optimization_insights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage insights" ON public.optimization_insights FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- OPTIMIZATION ACTIONS
-- ============================================
CREATE TABLE public.optimization_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  insight_id uuid NOT NULL REFERENCES public.optimization_insights(id) ON DELETE CASCADE,
  action_type text NOT NULL,
  target_rule_id uuid REFERENCES public.reward_rules(id) ON DELETE SET NULL,
  target_placement_id uuid REFERENCES public.qr_placements(id) ON DELETE SET NULL,
  old_value jsonb DEFAULT '{}'::jsonb,
  new_value jsonb DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  applied_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_optimization_actions_status ON public.optimization_actions(status);
ALTER TABLE public.optimization_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage actions" ON public.optimization_actions FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- A/B TEST VARIANTS
-- ============================================
CREATE TABLE public.ab_test_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  variant_key text NOT NULL,
  config_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  traffic_split numeric NOT NULL DEFAULT 0.5,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ab_test_variants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage ab tests" ON public.ab_test_variants FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Anyone can read active tests" ON public.ab_test_variants FOR SELECT USING (is_active = true);
