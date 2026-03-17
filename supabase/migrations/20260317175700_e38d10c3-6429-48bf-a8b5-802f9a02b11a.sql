
-- Market Domination Layer
CREATE TABLE public.market_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  problem_type TEXT NOT NULL DEFAULT 'general',
  estimated_value_cents INTEGER DEFAULT 0,
  urgency TEXT DEFAULT 'normal',
  city TEXT,
  status TEXT DEFAULT 'open',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.contractor_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
  monthly_budget_cents INTEGER DEFAULT 0,
  remaining_budget_cents INTEGER DEFAULT 0,
  boost_active BOOLEAN DEFAULT false,
  boost_multiplier NUMERIC DEFAULT 1.0,
  period_start TIMESTAMPTZ DEFAULT date_trunc('month', now()),
  period_end TIMESTAMPTZ DEFAULT (date_trunc('month', now()) + interval '1 month'),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(contractor_id, period_start)
);

CREATE TABLE public.opportunity_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID NOT NULL REFERENCES public.market_opportunities(id) ON DELETE CASCADE,
  contractor_id UUID NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
  allocation_score NUMERIC DEFAULT 0,
  price_charged_cents INTEGER DEFAULT 0,
  allocation_mode TEXT DEFAULT 'intelligent',
  status TEXT DEFAULT 'pending',
  responded_at TIMESTAMPTZ,
  conversion_result TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.dynamic_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city TEXT NOT NULL,
  problem_type TEXT NOT NULL,
  base_price_cents INTEGER DEFAULT 500,
  demand_multiplier NUMERIC DEFAULT 1.0,
  supply_multiplier NUMERIC DEFAULT 1.0,
  urgency_multiplier NUMERIC DEFAULT 1.0,
  final_price_cents INTEGER DEFAULT 500,
  sample_size INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(city, problem_type)
);

-- Nexus Identity Layer
CREATE TABLE public.nexus_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role TEXT NOT NULL,
  level_name TEXT NOT NULL,
  min_score INTEGER DEFAULT 0,
  perks_json JSONB DEFAULT '{}',
  badge_color TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(role, level_name)
);

CREATE TABLE public.nexus_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'homeowner',
  global_score INTEGER DEFAULT 0,
  level TEXT DEFAULT 'nouveau',
  breakdown_json JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, role)
);

CREATE TABLE public.nexus_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  signal_type TEXT NOT NULL,
  value NUMERIC DEFAULT 0,
  weight NUMERIC DEFAULT 1.0,
  source TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.nexus_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  delta_score INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE public.market_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractor_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunity_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dynamic_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nexus_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nexus_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nexus_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nexus_events ENABLE ROW LEVEL SECURITY;

-- Admin full access
CREATE POLICY "admin_market_opportunities" ON public.market_opportunities FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_contractor_budgets" ON public.contractor_budgets FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_opportunity_allocations" ON public.opportunity_allocations FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_dynamic_pricing" ON public.dynamic_pricing FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_nexus_levels" ON public.nexus_levels FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_nexus_profiles" ON public.nexus_profiles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_nexus_signals" ON public.nexus_signals FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_nexus_events" ON public.nexus_events FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Contractors see own budgets
CREATE POLICY "contractor_own_budgets" ON public.contractor_budgets FOR SELECT TO authenticated
  USING (contractor_id IN (SELECT id FROM public.contractors WHERE user_id = auth.uid()));

-- Contractors see own allocations
CREATE POLICY "contractor_own_allocations" ON public.opportunity_allocations FOR SELECT TO authenticated
  USING (contractor_id IN (SELECT id FROM public.contractors WHERE user_id = auth.uid()));

-- Users see own nexus profile
CREATE POLICY "user_own_nexus_profile" ON public.nexus_profiles FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Public read nexus_levels
CREATE POLICY "public_nexus_levels" ON public.nexus_levels FOR SELECT TO anon, authenticated USING (true);

-- Public read dynamic_pricing
CREATE POLICY "public_dynamic_pricing" ON public.dynamic_pricing FOR SELECT TO anon, authenticated USING (is_active = true);

-- Seed nexus levels
INSERT INTO public.nexus_levels (role, level_name, min_score, perks_json, badge_color) VALUES
  ('contractor', 'Bronze', 0, '{"visibility_boost": 1.0}', '#CD7F32'),
  ('contractor', 'Silver', 30, '{"visibility_boost": 1.2, "priority_matching": true}', '#C0C0C0'),
  ('contractor', 'Gold', 60, '{"visibility_boost": 1.5, "priority_matching": true, "featured": true}', '#FFD700'),
  ('contractor', 'Elite', 80, '{"visibility_boost": 1.8, "priority_matching": true, "featured": true, "exclusive_leads": true}', '#6366F1'),
  ('contractor', 'Signature', 95, '{"visibility_boost": 2.0, "priority_matching": true, "featured": true, "exclusive_leads": true, "territory_lock": true}', '#8B5CF6'),
  ('homeowner', 'Nouveau', 0, '{"basic_access": true}', '#94A3B8'),
  ('homeowner', 'Actif', 20, '{"priority_support": true}', '#3B82F6'),
  ('homeowner', 'Optimisé', 50, '{"priority_support": true, "advanced_tools": true}', '#10B981'),
  ('homeowner', 'Premium', 80, '{"priority_support": true, "advanced_tools": true, "exclusive_matching": true}', '#8B5CF6');
