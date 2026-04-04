
-- =====================================================
-- EngineClusterPlanProjectSizeMatrixUNPRO
-- =====================================================

-- 1. Enrich project_sizes
ALTER TABLE public.project_sizes
  ADD COLUMN IF NOT EXISTS min_project_value numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_project_value numeric,
  ADD COLUMN IF NOT EXISTS avg_project_value numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS jobs_per_contractor integer DEFAULT 100,
  ADD COLUMN IF NOT EXISTS size_weight integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS color_token text DEFAULT 'muted';

UPDATE public.project_sizes SET min_project_value = 0, max_project_value = 1000, avg_project_value = 500, jobs_per_contractor = 300, size_weight = 1, color_token = 'slate' WHERE code = 'xs';
UPDATE public.project_sizes SET min_project_value = 1000, max_project_value = 5000, avg_project_value = 2500, jobs_per_contractor = 200, size_weight = 2, color_token = 'blue' WHERE code = 's';
UPDATE public.project_sizes SET min_project_value = 5000, max_project_value = 15000, avg_project_value = 10000, jobs_per_contractor = 120, size_weight = 3, color_token = 'emerald' WHERE code = 'm';
UPDATE public.project_sizes SET min_project_value = 15000, max_project_value = 40000, avg_project_value = 25000, jobs_per_contractor = 60, size_weight = 4, color_token = 'amber' WHERE code = 'l';
UPDATE public.project_sizes SET min_project_value = 40000, max_project_value = 100000, avg_project_value = 65000, jobs_per_contractor = 30, size_weight = 5, color_token = 'orange' WHERE code = 'xl';
UPDATE public.project_sizes SET min_project_value = 100000, max_project_value = NULL, avg_project_value = 150000, jobs_per_contractor = 12, size_weight = 6, color_token = 'rose' WHERE code = 'xxl';

UPDATE public.project_sizes SET size_multiplier = 0.50 WHERE code = 'xs';
UPDATE public.project_sizes SET size_multiplier = 0.70 WHERE code = 's';
UPDATE public.project_sizes SET size_multiplier = 1.00 WHERE code = 'm';
UPDATE public.project_sizes SET size_multiplier = 1.30 WHERE code = 'l';
UPDATE public.project_sizes SET size_multiplier = 1.70 WHERE code = 'xl';
UPDATE public.project_sizes SET size_multiplier = 2.50 WHERE code = 'xxl';

-- 2. Enrich plan_definitions
ALTER TABLE public.plan_definitions
  ADD COLUMN IF NOT EXISTS visibility_weight numeric DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS exclusivity_access boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS high_ticket_priority boolean DEFAULT false;

UPDATE public.plan_definitions SET visibility_weight = 1.0, exclusivity_access = false, high_ticket_priority = false WHERE code = 'recrue';
UPDATE public.plan_definitions SET visibility_weight = 1.2, exclusivity_access = false, high_ticket_priority = false WHERE code = 'pro';
UPDATE public.plan_definitions SET visibility_weight = 1.5, exclusivity_access = false, high_ticket_priority = false WHERE code = 'premium';
UPDATE public.plan_definitions SET visibility_weight = 1.8, exclusivity_access = true, high_ticket_priority = true WHERE code = 'elite';
UPDATE public.plan_definitions SET visibility_weight = 2.0, exclusivity_access = true, high_ticket_priority = true WHERE code = 'signature';

-- 3. plan_project_size_access upgrade target
ALTER TABLE public.plan_project_size_access
  ADD COLUMN IF NOT EXISTS upgrade_target_plan_id uuid REFERENCES public.plan_definitions(id);

UPDATE public.plan_project_size_access psa
SET upgrade_target_plan_id = (SELECT id FROM public.plan_definitions WHERE code = 'pro')
WHERE psa.plan_code = 'recrue' AND psa.access_allowed = false
  AND EXISTS (SELECT 1 FROM public.project_sizes ps WHERE ps.id = psa.project_size_id AND ps.code = 'm');

UPDATE public.plan_project_size_access psa
SET upgrade_target_plan_id = (SELECT id FROM public.plan_definitions WHERE code = 'premium')
WHERE psa.plan_code IN ('recrue','pro') AND psa.access_allowed = false
  AND EXISTS (SELECT 1 FROM public.project_sizes ps WHERE ps.id = psa.project_size_id AND ps.code = 'l');

UPDATE public.plan_project_size_access psa
SET upgrade_target_plan_id = (SELECT id FROM public.plan_definitions WHERE code = 'elite')
WHERE psa.plan_code IN ('recrue','pro','premium') AND psa.access_allowed = false
  AND EXISTS (SELECT 1 FROM public.project_sizes ps WHERE ps.id = psa.project_size_id AND ps.code = 'xl');

UPDATE public.plan_project_size_access psa
SET upgrade_target_plan_id = (SELECT id FROM public.plan_definitions WHERE code = 'signature')
WHERE psa.access_allowed = false
  AND EXISTS (SELECT 1 FROM public.project_sizes ps WHERE ps.id = psa.project_size_id AND ps.code = 'xxl');

-- 4. cluster_domain_capacity
CREATE TABLE public.cluster_domain_capacity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cluster_id uuid NOT NULL,
  domain_id uuid NOT NULL,
  annual_demand_estimated numeric NOT NULL DEFAULT 0,
  annual_market_value numeric NOT NULL DEFAULT 0,
  market_control_factor numeric NOT NULL DEFAULT 0.65,
  market_tier text NOT NULL DEFAULT 'standard',
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(cluster_id, domain_id)
);
ALTER TABLE public.cluster_domain_capacity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_full_cdc" ON public.cluster_domain_capacity FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "read_cdc" ON public.cluster_domain_capacity FOR SELECT TO authenticated USING (true);

-- 5. cluster_project_size_distribution
CREATE TABLE public.cluster_project_size_distribution (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cluster_id uuid NOT NULL,
  domain_id uuid NOT NULL,
  project_size_id uuid NOT NULL REFERENCES public.project_sizes(id),
  distribution_profile text NOT NULL DEFAULT 'standard',
  demand_percentage numeric NOT NULL DEFAULT 0,
  annual_demand_estimated numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(cluster_id, domain_id, project_size_id)
);
ALTER TABLE public.cluster_project_size_distribution ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_full_cpsd" ON public.cluster_project_size_distribution FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "read_cpsd" ON public.cluster_project_size_distribution FOR SELECT TO authenticated USING (true);

-- 6. cluster_domain_project_size_capacity
CREATE TABLE public.cluster_domain_project_size_capacity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cluster_id uuid NOT NULL,
  domain_id uuid NOT NULL,
  project_size_id uuid NOT NULL REFERENCES public.project_sizes(id),
  annual_demand_estimated numeric NOT NULL DEFAULT 0,
  jobs_per_contractor integer NOT NULL DEFAULT 100,
  max_contractors_raw numeric NOT NULL DEFAULT 0,
  max_contractors_final integer NOT NULL DEFAULT 0,
  current_contractors integer NOT NULL DEFAULT 0,
  remaining_contractors integer NOT NULL DEFAULT 0,
  occupancy_rate numeric NOT NULL DEFAULT 0,
  scarcity_status text NOT NULL DEFAULT 'open',
  annual_market_value numeric NOT NULL DEFAULT 0,
  monthly_market_value numeric NOT NULL DEFAULT 0,
  value_per_slot numeric NOT NULL DEFAULT 0,
  cluster_value_tier text NOT NULL DEFAULT 'medium',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(cluster_id, domain_id, project_size_id)
);
ALTER TABLE public.cluster_domain_project_size_capacity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_full_cdpsc" ON public.cluster_domain_project_size_capacity FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "read_cdpsc" ON public.cluster_domain_project_size_capacity FOR SELECT TO authenticated USING (true);

-- 7. cluster_domain_plan_project_size_capacity (MASTER)
CREATE TABLE public.cluster_domain_plan_project_size_capacity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cluster_id uuid NOT NULL,
  domain_id uuid NOT NULL,
  plan_id uuid NOT NULL REFERENCES public.plan_definitions(id),
  project_size_id uuid NOT NULL REFERENCES public.project_sizes(id),
  access_allowed boolean NOT NULL DEFAULT false,
  target_percentage numeric NOT NULL DEFAULT 0,
  max_slots integer NOT NULL DEFAULT 0,
  current_slots integer NOT NULL DEFAULT 0,
  remaining_slots integer NOT NULL DEFAULT 0,
  occupancy_rate numeric NOT NULL DEFAULT 0,
  scarcity_status text NOT NULL DEFAULT 'open',
  waitlist_count integer NOT NULL DEFAULT 0,
  locked_by_rule boolean NOT NULL DEFAULT false,
  locked_by_admin boolean NOT NULL DEFAULT false,
  upgrade_required boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(cluster_id, domain_id, plan_id, project_size_id)
);
ALTER TABLE public.cluster_domain_plan_project_size_capacity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_full_cdppsc" ON public.cluster_domain_plan_project_size_capacity FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "read_cdppsc" ON public.cluster_domain_plan_project_size_capacity FOR SELECT TO authenticated USING (true);

-- 8. cluster_domain_project_size_pricing
CREATE TABLE public.cluster_domain_project_size_pricing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cluster_id uuid NOT NULL,
  domain_id uuid NOT NULL,
  project_size_id uuid NOT NULL REFERENCES public.project_sizes(id),
  size_multiplier numeric NOT NULL DEFAULT 1.0,
  scarcity_multiplier numeric NOT NULL DEFAULT 1.0,
  cluster_value_multiplier numeric NOT NULL DEFAULT 1.0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(cluster_id, domain_id, project_size_id)
);
ALTER TABLE public.cluster_domain_project_size_pricing ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_full_cdpsp" ON public.cluster_domain_project_size_pricing FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "read_cdpsp" ON public.cluster_domain_project_size_pricing FOR SELECT TO authenticated USING (true);

-- 9. cluster_domain_plan_project_size_pricing
CREATE TABLE public.cluster_domain_plan_project_size_pricing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cluster_id uuid NOT NULL,
  domain_id uuid NOT NULL,
  plan_id uuid NOT NULL REFERENCES public.plan_definitions(id),
  project_size_id uuid NOT NULL REFERENCES public.project_sizes(id),
  base_monthly_price numeric NOT NULL DEFAULT 0,
  final_monthly_price numeric NOT NULL DEFAULT 0,
  final_annual_price numeric NOT NULL DEFAULT 0,
  pricing_status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(cluster_id, domain_id, plan_id, project_size_id)
);
ALTER TABLE public.cluster_domain_plan_project_size_pricing ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_full_cdppsp" ON public.cluster_domain_plan_project_size_pricing FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "read_cdppsp" ON public.cluster_domain_plan_project_size_pricing FOR SELECT TO authenticated USING (true);

-- 10. cluster_domain_plan_project_size_revenue
CREATE TABLE public.cluster_domain_plan_project_size_revenue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cluster_id uuid NOT NULL,
  domain_id uuid NOT NULL,
  plan_id uuid NOT NULL REFERENCES public.plan_definitions(id),
  project_size_id uuid NOT NULL REFERENCES public.project_sizes(id),
  max_slots integer NOT NULL DEFAULT 0,
  current_slots integer NOT NULL DEFAULT 0,
  revenue_if_full_monthly numeric NOT NULL DEFAULT 0,
  revenue_if_full_annual numeric NOT NULL DEFAULT 0,
  revenue_current_monthly numeric NOT NULL DEFAULT 0,
  revenue_current_annual numeric NOT NULL DEFAULT 0,
  revenue_gap_monthly numeric NOT NULL DEFAULT 0,
  revenue_gap_annual numeric NOT NULL DEFAULT 0,
  upgrade_revenue_opportunity numeric NOT NULL DEFAULT 0,
  high_ticket_pressure_score numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(cluster_id, domain_id, plan_id, project_size_id)
);
ALTER TABLE public.cluster_domain_plan_project_size_revenue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_full_cdppsr" ON public.cluster_domain_plan_project_size_revenue FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "read_cdppsr" ON public.cluster_domain_plan_project_size_revenue FOR SELECT TO authenticated USING (true);

-- 11. cluster_project_size_rules
CREATE TABLE public.cluster_project_size_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_category text,
  market_tier text,
  project_size_code text NOT NULL,
  distribution_profile text NOT NULL DEFAULT 'standard',
  default_demand_percentage numeric NOT NULL DEFAULT 0,
  size_multiplier numeric NOT NULL DEFAULT 1.0,
  scarcity_threshold_tight numeric NOT NULL DEFAULT 0.60,
  scarcity_threshold_rare numeric NOT NULL DEFAULT 0.80,
  scarcity_threshold_full numeric NOT NULL DEFAULT 0.95,
  can_lock boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.cluster_project_size_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_full_cpsr" ON public.cluster_project_size_rules FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "read_cpsr" ON public.cluster_project_size_rules FOR SELECT TO authenticated USING (true);

-- 12. project_size_matching_rules
CREATE TABLE public.project_size_matching_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_size_id uuid NOT NULL REFERENCES public.project_sizes(id) UNIQUE,
  min_plan_rank integer NOT NULL DEFAULT 1,
  min_aipp_score numeric,
  prioritize_speed boolean NOT NULL DEFAULT false,
  prioritize_experience boolean NOT NULL DEFAULT false,
  prioritize_capacity boolean NOT NULL DEFAULT false,
  prioritize_compatibility boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.project_size_matching_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_full_psmr" ON public.project_size_matching_rules FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "read_psmr" ON public.project_size_matching_rules FOR SELECT TO authenticated USING (true);

-- 13. cluster_project_size_history
CREATE TABLE public.cluster_project_size_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cluster_id uuid NOT NULL,
  domain_id uuid NOT NULL,
  project_size_id uuid NOT NULL REFERENCES public.project_sizes(id),
  plan_id uuid REFERENCES public.plan_definitions(id),
  event_type text NOT NULL,
  old_value jsonb,
  new_value jsonb,
  reason text,
  actor_type text NOT NULL DEFAULT 'system',
  actor_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.cluster_project_size_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_full_cpsh" ON public.cluster_project_size_history FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 14. Indexes
CREATE INDEX idx_cdppsc_cluster_domain ON public.cluster_domain_plan_project_size_capacity(cluster_id, domain_id);
CREATE INDEX idx_cdppsc_plan ON public.cluster_domain_plan_project_size_capacity(plan_id);
CREATE INDEX idx_cdppsc_size ON public.cluster_domain_plan_project_size_capacity(project_size_id);
CREATE INDEX idx_cdppsc_scarcity ON public.cluster_domain_plan_project_size_capacity(scarcity_status);
CREATE INDEX idx_cdppsr_cluster_domain ON public.cluster_domain_plan_project_size_revenue(cluster_id, domain_id);
CREATE INDEX idx_cpsh_cluster ON public.cluster_project_size_history(cluster_id, domain_id);

-- 15. Trigger for auto scarcity
CREATE OR REPLACE FUNCTION public.update_cdppsc_scarcity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.remaining_slots := GREATEST(0, NEW.max_slots - NEW.current_slots);
  IF NEW.max_slots > 0 THEN
    NEW.occupancy_rate := ROUND(NEW.current_slots::numeric / NEW.max_slots, 4);
  ELSE
    NEW.occupancy_rate := 0;
  END IF;
  IF NEW.locked_by_admin OR NEW.locked_by_rule THEN
    NEW.scarcity_status := 'locked';
  ELSIF NEW.occupancy_rate >= 0.95 THEN
    NEW.scarcity_status := 'full';
  ELSIF NEW.occupancy_rate >= 0.80 THEN
    NEW.scarcity_status := 'rare';
  ELSIF NEW.occupancy_rate >= 0.60 THEN
    NEW.scarcity_status := 'tight';
  ELSE
    NEW.scarcity_status := 'open';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_update_cdppsc_scarcity
BEFORE INSERT OR UPDATE ON public.cluster_domain_plan_project_size_capacity
FOR EACH ROW EXECUTE FUNCTION public.update_cdppsc_scarcity();

-- 16. Seed matching rules
INSERT INTO public.project_size_matching_rules (project_size_id, min_plan_rank, min_aipp_score, prioritize_speed, prioritize_experience, prioritize_capacity, prioritize_compatibility)
SELECT id, 1, NULL, true, false, true, false FROM public.project_sizes WHERE code = 'xs';

INSERT INTO public.project_size_matching_rules (project_size_id, min_plan_rank, min_aipp_score, prioritize_speed, prioritize_experience, prioritize_capacity, prioritize_compatibility)
SELECT id, 1, NULL, true, false, true, false FROM public.project_sizes WHERE code = 's';

INSERT INTO public.project_size_matching_rules (project_size_id, min_plan_rank, min_aipp_score, prioritize_speed, prioritize_experience, prioritize_capacity, prioritize_compatibility)
SELECT id, 2, 40, false, true, true, true FROM public.project_sizes WHERE code = 'm';

INSERT INTO public.project_size_matching_rules (project_size_id, min_plan_rank, min_aipp_score, prioritize_speed, prioritize_experience, prioritize_capacity, prioritize_compatibility)
SELECT id, 3, 55, false, true, true, true FROM public.project_sizes WHERE code = 'l';

INSERT INTO public.project_size_matching_rules (project_size_id, min_plan_rank, min_aipp_score, prioritize_speed, prioritize_experience, prioritize_capacity, prioritize_compatibility)
SELECT id, 4, 65, false, true, false, true FROM public.project_sizes WHERE code = 'xl';

INSERT INTO public.project_size_matching_rules (project_size_id, min_plan_rank, min_aipp_score, prioritize_speed, prioritize_experience, prioritize_capacity, prioritize_compatibility)
SELECT id, 5, 75, false, true, false, true FROM public.project_sizes WHERE code = 'xxl';

-- 17. Seed distribution rules
INSERT INTO public.cluster_project_size_rules (project_size_code, distribution_profile, default_demand_percentage, size_multiplier, can_lock) VALUES
('xs', 'standard', 25, 0.50, false),
('s', 'standard', 30, 0.70, false),
('m', 'standard', 20, 1.00, false),
('l', 'standard', 12, 1.30, false),
('xl', 'standard', 8, 1.70, true),
('xxl', 'standard', 5, 2.50, true),
('xs', 'premium', 10, 0.50, false),
('s', 'premium', 22, 0.70, false),
('m', 'premium', 28, 1.00, false),
('l', 'premium', 20, 1.30, false),
('xl', 'premium', 12, 1.70, true),
('xxl', 'premium', 8, 2.50, true),
('xs', 'urgence', 40, 0.50, false),
('s', 'urgence', 32, 0.70, false),
('m', 'urgence', 16, 1.00, false),
('l', 'urgence', 7, 1.30, false),
('xl', 'urgence', 3, 1.70, true),
('xxl', 'urgence', 2, 2.50, true);

-- 18. Updated_at triggers
CREATE TRIGGER trg_updated_at_cluster_domain_capacity
  BEFORE UPDATE ON public.cluster_domain_capacity
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_updated_at_cluster_project_size_distribution
  BEFORE UPDATE ON public.cluster_project_size_distribution
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_updated_at_cluster_domain_project_size_capacity
  BEFORE UPDATE ON public.cluster_domain_project_size_capacity
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_updated_at_cluster_domain_project_size_pricing
  BEFORE UPDATE ON public.cluster_domain_project_size_pricing
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_updated_at_cluster_domain_plan_project_size_pricing
  BEFORE UPDATE ON public.cluster_domain_plan_project_size_pricing
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_updated_at_cluster_domain_plan_project_size_revenue
  BEFORE UPDATE ON public.cluster_domain_plan_project_size_revenue
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_updated_at_cluster_project_size_rules
  BEFORE UPDATE ON public.cluster_project_size_rules
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_updated_at_project_size_matching_rules
  BEFORE UPDATE ON public.project_size_matching_rules
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
