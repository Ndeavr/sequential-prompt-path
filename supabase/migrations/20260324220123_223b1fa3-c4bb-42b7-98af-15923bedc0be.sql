
-- Optimization Opportunities
CREATE TABLE IF NOT EXISTS public.optimization_opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  screen_key text NOT NULL,
  opportunity_type text NOT NULL,
  title text NOT NULL,
  description text,
  priority text NOT NULL DEFAULT 'medium',
  confidence_score numeric(5,2) NOT NULL DEFAULT 0,
  supporting_metrics jsonb DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Optimization Experiments
CREATE TABLE IF NOT EXISTS public.optimization_experiments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  screen_key text NOT NULL,
  experiment_type text NOT NULL,
  name text NOT NULL,
  description text,
  hypothesis text,
  primary_metric text NOT NULL DEFAULT 'ctr',
  secondary_metrics text[] DEFAULT '{}',
  status text NOT NULL DEFAULT 'draft',
  traffic_allocation_percent integer NOT NULL DEFAULT 50,
  minimum_sample_size integer NOT NULL DEFAULT 100,
  started_at timestamptz,
  ended_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Optimization Variants
CREATE TABLE IF NOT EXISTS public.optimization_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id uuid NOT NULL REFERENCES public.optimization_experiments(id) ON DELETE CASCADE,
  variant_key text NOT NULL,
  variant_name text NOT NULL,
  variant_type text NOT NULL DEFAULT 'copy',
  config_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_control boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Experiment Assignments
CREATE TABLE IF NOT EXISTS public.experiment_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id uuid NOT NULL REFERENCES public.optimization_experiments(id) ON DELETE CASCADE,
  variant_id uuid NOT NULL REFERENCES public.optimization_variants(id) ON DELETE CASCADE,
  user_id uuid,
  session_id uuid,
  screen_key text NOT NULL,
  assigned_at timestamptz NOT NULL DEFAULT now()
);

-- Experiment Events
CREATE TABLE IF NOT EXISTS public.experiment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id uuid NOT NULL REFERENCES public.optimization_experiments(id) ON DELETE CASCADE,
  variant_id uuid NOT NULL REFERENCES public.optimization_variants(id) ON DELETE CASCADE,
  user_id uuid,
  session_id uuid,
  screen_key text NOT NULL,
  event_type text NOT NULL,
  event_value numeric DEFAULT 0,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Winning Variants
CREATE TABLE IF NOT EXISTS public.winning_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id uuid NOT NULL REFERENCES public.optimization_experiments(id) ON DELETE CASCADE,
  variant_id uuid NOT NULL REFERENCES public.optimization_variants(id) ON DELETE CASCADE,
  screen_key text NOT NULL,
  decision_reason text,
  primary_metric_lift_percent numeric(6,2) DEFAULT 0,
  confidence_score numeric(5,2) DEFAULT 0,
  approved_by uuid,
  auto_promoted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Optimization Rules
CREATE TABLE IF NOT EXISTS public.optimization_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_key text NOT NULL UNIQUE,
  rule_name text NOT NULL,
  scope text NOT NULL DEFAULT 'global',
  is_active boolean NOT NULL DEFAULT false,
  config_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Optimization Alerts
CREATE TABLE IF NOT EXISTS public.optimization_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id uuid REFERENCES public.optimization_experiments(id) ON DELETE SET NULL,
  alert_type text NOT NULL,
  severity text NOT NULL DEFAULT 'info',
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

-- UI Block Registry
CREATE TABLE IF NOT EXISTS public.ui_block_registry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  block_key text NOT NULL UNIQUE,
  screen_key text NOT NULL,
  block_name text NOT NULL,
  block_type text NOT NULL DEFAULT 'cta',
  default_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_experimentable boolean NOT NULL DEFAULT true,
  risk_level text NOT NULL DEFAULT 'low',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Copy Variant Registry
CREATE TABLE IF NOT EXISTS public.copy_variant_registry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  screen_key text NOT NULL,
  block_key text NOT NULL,
  copy_type text NOT NULL DEFAULT 'cta_label',
  language text NOT NULL DEFAULT 'fr',
  variant_key text NOT NULL,
  content text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_opt_opportunities_screen ON public.optimization_opportunities(screen_key);
CREATE INDEX IF NOT EXISTS idx_opt_opportunities_status ON public.optimization_opportunities(status);
CREATE INDEX IF NOT EXISTS idx_opt_experiments_status ON public.optimization_experiments(status);
CREATE INDEX IF NOT EXISTS idx_opt_experiments_screen ON public.optimization_experiments(screen_key);
CREATE INDEX IF NOT EXISTS idx_opt_variants_experiment ON public.optimization_variants(experiment_id);
CREATE INDEX IF NOT EXISTS idx_exp_assignments_experiment ON public.experiment_assignments(experiment_id);
CREATE INDEX IF NOT EXISTS idx_exp_assignments_user ON public.experiment_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_exp_events_experiment ON public.experiment_events(experiment_id);
CREATE INDEX IF NOT EXISTS idx_exp_events_created ON public.experiment_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_winning_variants_experiment ON public.winning_variants(experiment_id);
CREATE INDEX IF NOT EXISTS idx_opt_alerts_status ON public.optimization_alerts(status);
CREATE INDEX IF NOT EXISTS idx_ui_block_screen ON public.ui_block_registry(screen_key);
CREATE INDEX IF NOT EXISTS idx_copy_variant_screen ON public.copy_variant_registry(screen_key);

-- RLS
ALTER TABLE public.optimization_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.optimization_experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.optimization_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.experiment_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.experiment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.winning_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.optimization_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.optimization_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ui_block_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.copy_variant_registry ENABLE ROW LEVEL SECURITY;

-- Admin-only policies
CREATE POLICY "admin_all_optimization_opportunities" ON public.optimization_opportunities FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_all_optimization_experiments" ON public.optimization_experiments FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_all_optimization_variants" ON public.optimization_variants FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_all_winning_variants" ON public.winning_variants FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_all_optimization_rules" ON public.optimization_rules FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_all_optimization_alerts" ON public.optimization_alerts FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_all_ui_block_registry" ON public.ui_block_registry FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_all_copy_variant_registry" ON public.copy_variant_registry FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Assignment/events: insert for authenticated, read for admin
CREATE POLICY "auth_insert_experiment_assignments" ON public.experiment_assignments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "admin_read_experiment_assignments" ON public.experiment_assignments FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "user_read_own_assignments" ON public.experiment_assignments FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "auth_insert_experiment_events" ON public.experiment_events FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "admin_read_experiment_events" ON public.experiment_events FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Public read for block/copy registries (needed for variant rendering)
CREATE POLICY "public_read_ui_blocks" ON public.ui_block_registry FOR SELECT TO authenticated USING (true);
CREATE POLICY "public_read_copy_variants" ON public.copy_variant_registry FOR SELECT TO authenticated USING (true);

-- Seed UI Block Registry
INSERT INTO public.ui_block_registry (block_key, screen_key, block_name, block_type, risk_level) VALUES
  ('contractor_profile_primary_cta', 'contractor_profile_screen', 'CTA principal profil', 'cta', 'low'),
  ('contractor_profile_trust_block', 'contractor_profile_screen', 'Bloc confiance profil', 'trust_block', 'low'),
  ('aipp_result_share_prompt', 'aipp_score_result_screen', 'Prompt partage AIPP', 'share_prompt', 'low'),
  ('booking_confirmation_reassurance', 'booking_confirmation_screen', 'Réassurance booking', 'reassurance', 'low'),
  ('alex_match_why_this_pro', 'alex_match_result_screen', 'Pourquoi ce pro', 'explanation', 'medium'),
  ('plan_page_recommended_cta', 'plan_comparison_screen', 'CTA plan recommandé', 'cta', 'medium'),
  ('compare_prompt_inline', 'plan_comparison_screen', 'Hint comparaison', 'prompt', 'low')
ON CONFLICT (block_key) DO NOTHING;

-- Seed Optimization Rules
INSERT INTO public.optimization_rules (rule_key, rule_name, scope, is_active, config_json) VALUES
  ('auto_promote_low_risk_copy', 'Auto-promotion copy low-risk', 'copy', false, '{"min_sample":200,"min_lift_percent":5,"max_risk":"low"}'::jsonb),
  ('auto_promote_cta_position', 'Auto-promotion position CTA', 'layout', false, '{"min_sample":300,"min_lift_percent":8,"max_risk":"low"}'::jsonb),
  ('pause_on_conversion_drop', 'Pause si baisse conversion', 'safety', true, '{"max_drop_percent":15,"check_interval_hours":24}'::jsonb)
ON CONFLICT (rule_key) DO NOTHING;
