
-- Plan Definitions table (no free plan)
CREATE TABLE public.plan_definitions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  rank INTEGER NOT NULL,
  base_price_monthly INTEGER NOT NULL DEFAULT 0,
  is_paid BOOLEAN NOT NULL DEFAULT true,
  min_price_required BOOLEAN NOT NULL DEFAULT true,
  scarcity_multiplier_tight NUMERIC NOT NULL DEFAULT 1.1,
  scarcity_multiplier_rare NUMERIC NOT NULL DEFAULT 1.25,
  scarcity_multiplier_full NUMERIC NOT NULL DEFAULT 1.5,
  scarcity_multiplier_locked NUMERIC NOT NULL DEFAULT 1.75,
  priority_level INTEGER NOT NULL DEFAULT 1,
  matching_boost NUMERIC NOT NULL DEFAULT 0,
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.plan_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view plan definitions"
  ON public.plan_definitions FOR SELECT USING (true);

CREATE POLICY "Admins can manage plan definitions"
  ON public.plan_definitions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Insert the 5 paid plans
INSERT INTO public.plan_definitions (code, name, rank, base_price_monthly, priority_level, matching_boost) VALUES
  ('recrue', 'Recrue', 1, 9900, 1, 0),
  ('pro', 'Pro', 2, 19900, 2, 0.10),
  ('premium', 'Premium', 3, 39900, 3, 0.20),
  ('elite', 'Élite', 4, 69900, 4, 0.35),
  ('signature', 'Signature', 5, 149900, 5, 0.50);

-- Cluster Plan Capacity table
CREATE TABLE public.cluster_plan_capacity (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cluster_key TEXT NOT NULL,
  plan_code TEXT NOT NULL REFERENCES public.plan_definitions(code),
  max_slots INTEGER NOT NULL DEFAULT 0,
  occupied_slots INTEGER NOT NULL DEFAULT 0,
  scarcity_status TEXT NOT NULL DEFAULT 'open',
  distribution_profile TEXT NOT NULL DEFAULT 'standard',
  min_plan_required TEXT NOT NULL DEFAULT 'recrue',
  payment_required BOOLEAN NOT NULL DEFAULT true,
  waitlist_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(cluster_key, plan_code),
  CONSTRAINT valid_scarcity CHECK (scarcity_status IN ('open', 'tight', 'rare', 'full', 'locked'))
);

ALTER TABLE public.cluster_plan_capacity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view cluster capacity"
  ON public.cluster_plan_capacity FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage cluster capacity"
  ON public.cluster_plan_capacity FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_cluster_plan_capacity_cluster ON public.cluster_plan_capacity(cluster_key);
CREATE INDEX idx_cluster_plan_capacity_status ON public.cluster_plan_capacity(scarcity_status);

-- Cluster Pricing Multipliers
CREATE TABLE public.cluster_pricing_multipliers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cluster_key TEXT NOT NULL UNIQUE,
  cluster_value_tier TEXT NOT NULL DEFAULT 'medium',
  value_multiplier NUMERIC NOT NULL DEFAULT 1.0,
  scarcity_override_multiplier NUMERIC,
  demand_score NUMERIC NOT NULL DEFAULT 50,
  projected_monthly_revenue INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT valid_value_tier CHECK (cluster_value_tier IN ('low', 'medium', 'high', 'elite'))
);

ALTER TABLE public.cluster_pricing_multipliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view cluster pricing"
  ON public.cluster_pricing_multipliers FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage cluster pricing"
  ON public.cluster_pricing_multipliers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Function to compute scarcity status
CREATE OR REPLACE FUNCTION public.compute_scarcity_status(occupied INTEGER, max_slots INTEGER)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  ratio NUMERIC;
BEGIN
  IF max_slots <= 0 THEN RETURN 'full'; END IF;
  ratio := occupied::NUMERIC / max_slots;
  IF ratio >= 0.95 THEN RETURN 'full';
  ELSIF ratio >= 0.80 THEN RETURN 'rare';
  ELSIF ratio >= 0.60 THEN RETURN 'tight';
  ELSE RETURN 'open';
  END IF;
END;
$$;

-- Trigger to auto-update scarcity_status
CREATE OR REPLACE FUNCTION public.update_cluster_scarcity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.scarcity_status := compute_scarcity_status(NEW.occupied_slots, NEW.max_slots);
  NEW.updated_at := now();
  IF NEW.occupied_slots >= NEW.max_slots THEN
    NEW.waitlist_active := true;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_cluster_scarcity_update
  BEFORE INSERT OR UPDATE ON public.cluster_plan_capacity
  FOR EACH ROW
  EXECUTE FUNCTION public.update_cluster_scarcity();
