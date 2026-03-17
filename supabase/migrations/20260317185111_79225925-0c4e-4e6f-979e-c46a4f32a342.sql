
-- =============================================
-- 1. EMERGENCY PRICING BASE (per category/city)
-- =============================================
CREATE TABLE public.emergency_pricing_base (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  city_slug text,
  region text,
  base_price_cents integer NOT NULL DEFAULT 4500,
  avg_job_value_cents integer,
  competition_level text DEFAULT 'medium',
  historical_acceptance_rate numeric(5,2),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(category, city_slug)
);
ALTER TABLE public.emergency_pricing_base ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage pricing base" ON public.emergency_pricing_base FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Contractors read pricing base" ON public.emergency_pricing_base FOR SELECT TO authenticated USING (true);

-- =============================================
-- 2. DYNAMIC PRICING LOGS
-- =============================================
CREATE TABLE public.dynamic_pricing_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid REFERENCES public.emergency_requests(id) ON DELETE SET NULL,
  contractor_id uuid REFERENCES public.contractors(id) ON DELETE SET NULL,
  base_price_cents integer NOT NULL,
  final_price_cents integer NOT NULL,
  demand_multiplier numeric(5,3) NOT NULL DEFAULT 1.0,
  supply_multiplier numeric(5,3) NOT NULL DEFAULT 1.0,
  urgency_multiplier numeric(5,3) NOT NULL DEFAULT 1.0,
  time_multiplier numeric(5,3) NOT NULL DEFAULT 1.0,
  storm_multiplier numeric(5,3) NOT NULL DEFAULT 1.0,
  intent_multiplier numeric(5,3) NOT NULL DEFAULT 1.0,
  combined_multiplier numeric(5,3) NOT NULL DEFAULT 1.0,
  multipliers_json jsonb,
  sla_tier text,
  sla_surcharge_cents integer DEFAULT 0,
  cap_applied boolean DEFAULT false,
  admin_override boolean DEFAULT false,
  admin_override_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.dynamic_pricing_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage pricing logs" ON public.dynamic_pricing_logs FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Contractors read own pricing" ON public.dynamic_pricing_logs FOR SELECT TO authenticated USING (contractor_id IN (SELECT id FROM public.contractors WHERE user_id = auth.uid()));

-- =============================================
-- 3. SLA TIERS
-- =============================================
CREATE TABLE public.sla_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  label_fr text NOT NULL,
  response_time_minutes integer NOT NULL,
  price_multiplier numeric(5,3) NOT NULL DEFAULT 1.0,
  surcharge_cents integer NOT NULL DEFAULT 0,
  dispatch_rules_override jsonb,
  priority_boost integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.sla_tiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read active SLA tiers" ON public.sla_tiers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage SLA tiers" ON public.sla_tiers FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Seed default SLA tiers
INSERT INTO public.sla_tiers (name, label_fr, response_time_minutes, price_multiplier, surcharge_cents, priority_boost, display_order) VALUES
  ('standard', 'Standard', 30, 1.0, 0, 0, 0),
  ('fast', 'Rapide', 15, 1.3, 1500, 10, 1),
  ('priority', 'Prioritaire', 10, 1.6, 3000, 25, 2),
  ('ultra', 'Ultra', 5, 2.0, 5000, 50, 3);

-- =============================================
-- 4. SLA ASSIGNMENTS (per request)
-- =============================================
CREATE TABLE public.sla_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.emergency_requests(id) ON DELETE CASCADE,
  sla_tier_id uuid NOT NULL REFERENCES public.sla_tiers(id),
  sla_tier_name text NOT NULL,
  guaranteed_response_minutes integer NOT NULL,
  actual_response_minutes integer,
  achieved boolean,
  breach_reason text,
  refund_issued boolean DEFAULT false,
  refund_amount_cents integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);
ALTER TABLE public.sla_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage SLA assignments" ON public.sla_assignments FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users read own SLA" ON public.sla_assignments FOR SELECT TO authenticated USING (request_id IN (SELECT id FROM public.emergency_requests WHERE user_id = auth.uid()));

-- =============================================
-- 5. CONTRACTOR WALLET
-- =============================================
CREATE TABLE public.contractor_wallet (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE UNIQUE,
  balance_cents integer NOT NULL DEFAULT 0,
  lifetime_spent_cents integer NOT NULL DEFAULT 0,
  lifetime_credited_cents integer NOT NULL DEFAULT 0,
  last_top_up_at timestamptz,
  low_balance_alerted boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.contractor_wallet ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Contractors manage own wallet" ON public.contractor_wallet FOR ALL TO authenticated USING (contractor_id IN (SELECT id FROM public.contractors WHERE user_id = auth.uid()));
CREATE POLICY "Admins manage wallets" ON public.contractor_wallet FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- 6. PRICING TRANSACTIONS
-- =============================================
CREATE TABLE public.pricing_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
  wallet_id uuid REFERENCES public.contractor_wallet(id) ON DELETE SET NULL,
  request_id uuid REFERENCES public.emergency_requests(id) ON DELETE SET NULL,
  amount_cents integer NOT NULL,
  transaction_type text NOT NULL, -- lead, sla, boost, credit, refund, top_up
  description_fr text,
  balance_after_cents integer,
  pricing_log_id uuid REFERENCES public.dynamic_pricing_logs(id) ON DELETE SET NULL,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.pricing_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Contractors read own transactions" ON public.pricing_transactions FOR SELECT TO authenticated USING (contractor_id IN (SELECT id FROM public.contractors WHERE user_id = auth.uid()));
CREATE POLICY "Admins manage transactions" ON public.pricing_transactions FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- 7. EMERGENCY DEMAND METRICS (for AI optimization)
-- =============================================
CREATE TABLE public.emergency_demand_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  city_slug text,
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,
  request_count integer NOT NULL DEFAULT 0,
  acceptance_count integer NOT NULL DEFAULT 0,
  refusal_count integer NOT NULL DEFAULT 0,
  avg_time_to_assignment_sec integer,
  avg_time_to_arrival_sec integer,
  avg_price_cents integer,
  contractor_supply_count integer,
  demand_supply_ratio numeric(5,2),
  storm_active boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.emergency_demand_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage demand metrics" ON public.emergency_demand_metrics FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- 8. AI OPTIMIZATION LOGS
-- =============================================
CREATE TABLE public.ai_optimization_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  optimization_type text NOT NULL, -- dispatch, pricing, matching, storm, sla
  target_category text,
  target_city text,
  change_description text NOT NULL,
  change_json jsonb NOT NULL,
  reason text NOT NULL,
  data_used_json jsonb,
  impact_estimate_json jsonb,
  applied boolean NOT NULL DEFAULT false,
  applied_at timestamptz,
  applied_by text, -- 'auto' or admin user_id
  rollback_json jsonb,
  rolled_back boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_optimization_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage AI logs" ON public.ai_optimization_logs FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- 9. AI RECOMMENDATIONS
-- =============================================
CREATE TABLE public.ai_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recommendation_type text NOT NULL, -- dispatch, pricing, matching, storm, sla
  category text,
  city text,
  title_fr text NOT NULL,
  description_fr text NOT NULL,
  confidence_score numeric(5,2) NOT NULL DEFAULT 0.5,
  priority text NOT NULL DEFAULT 'medium', -- low, medium, high, critical
  suggested_change_json jsonb,
  expected_impact_fr text,
  status text NOT NULL DEFAULT 'pending', -- pending, approved, rejected, expired, applied
  reviewed_by uuid,
  reviewed_at timestamptz,
  review_notes text,
  auto_applicable boolean DEFAULT false,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage recommendations" ON public.ai_recommendations FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- 10. DYNAMIC PRICING SETTINGS (admin controls)
-- =============================================
CREATE TABLE public.dynamic_pricing_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text NOT NULL UNIQUE,
  setting_value jsonb NOT NULL,
  label_fr text NOT NULL,
  description_fr text,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.dynamic_pricing_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage pricing settings" ON public.dynamic_pricing_settings FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Seed default settings
INSERT INTO public.dynamic_pricing_settings (setting_key, setting_value, label_fr) VALUES
  ('dynamic_pricing_enabled', 'true', 'Tarification dynamique activée'),
  ('max_combined_multiplier', '3.0', 'Multiplicateur combiné maximum'),
  ('storm_pricing_enabled', 'true', 'Tarification tempête activée'),
  ('auto_optimization_enabled', 'false', 'Auto-optimisation IA activée'),
  ('auto_optimization_aggressiveness', '"balanced"', 'Niveau d''agressivité IA'),
  ('max_auto_price_change_pct', '20', 'Changement de prix auto max (%)'),
  ('max_auto_timeout_change_pct', '50', 'Changement timeout auto max (%)');

-- =============================================
-- 11. CONTRACTOR DISPATCH STATS (rolling)
-- =============================================
CREATE TABLE public.contractor_dispatch_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE UNIQUE,
  total_dispatched integer NOT NULL DEFAULT 0,
  total_accepted integer NOT NULL DEFAULT 0,
  total_refused integer NOT NULL DEFAULT 0,
  total_no_response integer NOT NULL DEFAULT 0,
  total_completed integer NOT NULL DEFAULT 0,
  avg_response_time_sec integer,
  avg_eta_accuracy_pct numeric(5,2),
  acceptance_rate numeric(5,2),
  reliability_score numeric(5,2) DEFAULT 50.0,
  emergency_fit_score numeric(5,2) DEFAULT 50.0,
  last_dispatch_at timestamptz,
  last_acceptance_at timestamptz,
  no_response_streak integer DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.contractor_dispatch_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Contractors read own stats" ON public.contractor_dispatch_stats FOR SELECT TO authenticated USING (contractor_id IN (SELECT id FROM public.contractors WHERE user_id = auth.uid()));
CREATE POLICY "Admins manage dispatch stats" ON public.contractor_dispatch_stats FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX idx_pricing_logs_request ON public.dynamic_pricing_logs(request_id);
CREATE INDEX idx_pricing_logs_contractor ON public.dynamic_pricing_logs(contractor_id);
CREATE INDEX idx_pricing_logs_created ON public.dynamic_pricing_logs(created_at DESC);
CREATE INDEX idx_sla_assignments_request ON public.sla_assignments(request_id);
CREATE INDEX idx_pricing_transactions_contractor ON public.pricing_transactions(contractor_id);
CREATE INDEX idx_pricing_transactions_created ON public.pricing_transactions(created_at DESC);
CREATE INDEX idx_demand_metrics_category_city ON public.emergency_demand_metrics(category, city_slug);
CREATE INDEX idx_demand_metrics_period ON public.emergency_demand_metrics(period_start DESC);
CREATE INDEX idx_ai_logs_type ON public.ai_optimization_logs(optimization_type);
CREATE INDEX idx_ai_recommendations_status ON public.ai_recommendations(status);
CREATE INDEX idx_dispatch_stats_contractor ON public.contractor_dispatch_stats(contractor_id);
CREATE INDEX idx_pricing_base_category ON public.emergency_pricing_base(category, city_slug);

-- =============================================
-- TRIGGERS (updated_at)
-- =============================================
CREATE TRIGGER update_pricing_base_updated_at BEFORE UPDATE ON public.emergency_pricing_base FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_sla_tiers_updated_at BEFORE UPDATE ON public.sla_tiers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_wallet_updated_at BEFORE UPDATE ON public.contractor_wallet FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_dispatch_stats_updated_at BEFORE UPDATE ON public.contractor_dispatch_stats FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
