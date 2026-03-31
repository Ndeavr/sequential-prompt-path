
-- ===========================================
-- PRICING ENGINE TABLES
-- ===========================================

-- 1. Pricing Categories
CREATE TABLE public.pricing_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name_fr TEXT NOT NULL,
  name_en TEXT,
  parent_category_id UUID REFERENCES public.pricing_categories(id),
  average_contract_value_min NUMERIC DEFAULT 0,
  average_contract_value_max NUMERIC DEFAULT 0,
  base_competitiveness_score INTEGER DEFAULT 50,
  base_market_difficulty_score INTEGER DEFAULT 50,
  base_rendezvous_unit_price NUMERIC DEFAULT 85,
  base_plan_floor TEXT DEFAULT 'recrue',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Pricing Markets
CREATE TABLE public.pricing_markets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  province_code TEXT DEFAULT 'QC',
  city_name TEXT NOT NULL,
  region_name TEXT,
  market_tier TEXT DEFAULT 'standard',
  population_estimate INTEGER DEFAULT 0,
  competitiveness_multiplier NUMERIC DEFAULT 1.0,
  premium_territory_multiplier NUMERIC DEFAULT 1.0,
  labor_cost_multiplier NUMERIC DEFAULT 1.0,
  demand_score INTEGER DEFAULT 50,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Pricing Plan Bases
CREATE TABLE public.pricing_plan_bases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_code TEXT UNIQUE NOT NULL,
  plan_name TEXT NOT NULL,
  billing_period TEXT NOT NULL DEFAULT 'month',
  base_price NUMERIC NOT NULL DEFAULT 0,
  included_rendezvous INTEGER DEFAULT 0,
  max_service_areas INTEGER,
  max_categories INTEGER,
  booking_features JSONB DEFAULT '{}',
  ranking_features JSONB DEFAULT '{}',
  ai_features JSONB DEFAULT '{}',
  support_features JSONB DEFAULT '{}',
  is_public BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Pricing Rendezvous Packages
CREATE TABLE public.pricing_rendezvous_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_code TEXT UNIQUE NOT NULL,
  package_name TEXT NOT NULL,
  rendezvous_count INTEGER NOT NULL,
  pricing_mode TEXT DEFAULT 'per_unit',
  base_package_price NUMERIC NOT NULL DEFAULT 0,
  category_multiplier_enabled BOOLEAN DEFAULT true,
  market_multiplier_enabled BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Pricing Rule Overrides
CREATE TABLE public.pricing_rule_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope_type TEXT NOT NULL DEFAULT 'global',
  scope_reference_id UUID,
  category_id UUID REFERENCES public.pricing_categories(id),
  market_id UUID REFERENCES public.pricing_markets(id),
  plan_base_id UUID REFERENCES public.pricing_plan_bases(id),
  rendezvous_package_id UUID REFERENCES public.pricing_rendezvous_packages(id),
  override_type TEXT NOT NULL,
  override_value NUMERIC NOT NULL DEFAULT 0,
  reason TEXT,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Pricing Quotes
CREATE TABLE public.pricing_quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID,
  session_id UUID,
  category_id UUID NOT NULL REFERENCES public.pricing_categories(id),
  market_id UUID NOT NULL REFERENCES public.pricing_markets(id),
  selected_plan_code TEXT NOT NULL,
  selected_billing_period TEXT NOT NULL DEFAULT 'month',
  selected_rendezvous_count INTEGER DEFAULT 0,
  revenue_goal_monthly NUMERIC,
  capacity_monthly INTEGER,
  close_rate_percent NUMERIC,
  average_contract_value NUMERIC,
  competitiveness_score INTEGER,
  recommended_plan_code TEXT,
  recommended_rendezvous_count INTEGER,
  base_plan_amount NUMERIC NOT NULL DEFAULT 0,
  rendezvous_amount NUMERIC NOT NULL DEFAULT 0,
  category_multiplier NUMERIC DEFAULT 1.0,
  market_multiplier NUMERIC DEFAULT 1.0,
  competitiveness_multiplier NUMERIC DEFAULT 1.0,
  override_adjustment_amount NUMERIC DEFAULT 0,
  subtotal_amount NUMERIC NOT NULL DEFAULT 0,
  gst_amount NUMERIC NOT NULL DEFAULT 0,
  qst_amount NUMERIC NOT NULL DEFAULT 0,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  calculation_version TEXT DEFAULT 'v1',
  pricing_snapshot JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft',
  accepted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Pricing Checkout Sessions
CREATE TABLE public.pricing_checkout_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pricing_quote_id UUID NOT NULL REFERENCES public.pricing_quotes(id),
  contractor_id UUID,
  stripe_checkout_session_id TEXT UNIQUE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  currency TEXT DEFAULT 'CAD',
  subtotal_amount NUMERIC NOT NULL DEFAULT 0,
  gst_amount NUMERIC NOT NULL DEFAULT 0,
  qst_amount NUMERIC NOT NULL DEFAULT 0,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  checkout_url TEXT,
  paid_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 8. Pricing Payment Events
CREATE TABLE public.pricing_payment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pricing_checkout_session_id UUID NOT NULL REFERENCES public.pricing_checkout_sessions(id),
  stripe_event_id TEXT UNIQUE,
  stripe_event_type TEXT,
  event_payload JSONB DEFAULT '{}',
  processed_successfully BOOLEAN DEFAULT false,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ======= RLS =======
ALTER TABLE public.pricing_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_markets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_plan_bases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_rendezvous_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_rule_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_checkout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_payment_events ENABLE ROW LEVEL SECURITY;

-- Public read for categories, markets, plans, packages
CREATE POLICY "Anyone can read active pricing categories" ON public.pricing_categories FOR SELECT USING (is_active = true);
CREATE POLICY "Anyone can read active pricing markets" ON public.pricing_markets FOR SELECT USING (is_active = true);
CREATE POLICY "Anyone can read active pricing plan bases" ON public.pricing_plan_bases FOR SELECT USING (is_active = true AND is_public = true);
CREATE POLICY "Anyone can read active rendezvous packages" ON public.pricing_rendezvous_packages FOR SELECT USING (is_active = true);

-- Rule overrides: admin only (via service role in edge functions)
CREATE POLICY "Service role manages pricing rule overrides" ON public.pricing_rule_overrides FOR ALL USING (false);

-- Pricing quotes: users can read their own
CREATE POLICY "Users can read own pricing quotes" ON public.pricing_quotes FOR SELECT TO authenticated USING (
  contractor_id IN (SELECT id FROM public.contractors WHERE user_id = auth.uid())
  OR session_id IS NOT NULL
);
CREATE POLICY "Anyone can insert pricing quotes" ON public.pricing_quotes FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update own pricing quotes" ON public.pricing_quotes FOR UPDATE TO authenticated USING (
  contractor_id IN (SELECT id FROM public.contractors WHERE user_id = auth.uid())
);

-- Checkout sessions: users can read their own
CREATE POLICY "Users can read own checkout sessions" ON public.pricing_checkout_sessions FOR SELECT TO authenticated USING (
  contractor_id IN (SELECT id FROM public.contractors WHERE user_id = auth.uid())
);

-- Payment events: no direct access (service role only)
CREATE POLICY "Service role manages payment events" ON public.pricing_payment_events FOR ALL USING (false);

-- ======= SEED DATA =======

-- Categories
INSERT INTO public.pricing_categories (slug, name_fr, name_en, average_contract_value_min, average_contract_value_max, base_competitiveness_score, base_market_difficulty_score, base_rendezvous_unit_price, base_plan_floor) VALUES
('toiture', 'Toiture', 'Roofing', 8000, 25000, 85, 75, 125, 'premium'),
('isolation', 'Isolation', 'Insulation', 3000, 12000, 65, 55, 95, 'pro'),
('thermopompe', 'Thermopompe', 'Heat Pump', 5000, 15000, 70, 65, 110, 'pro'),
('gouttieres', 'Gouttières', 'Gutters', 1500, 5000, 55, 40, 75, 'recrue'),
('amenagement-paysager', 'Aménagement paysager', 'Landscaping', 3000, 15000, 60, 50, 85, 'pro'),
('pave-uni', 'Pavé-uni', 'Paving', 5000, 20000, 65, 60, 100, 'pro'),
('tonte-pelouse', 'Tonte de pelouse', 'Lawn Mowing', 500, 2000, 40, 25, 45, 'recrue'),
('excavation', 'Excavation', 'Excavation', 5000, 30000, 70, 70, 115, 'premium'),
('notaire', 'Notaire', 'Notary', 1000, 3000, 50, 35, 65, 'recrue'),
('courtier-immobilier', 'Courtier immobilier', 'Real Estate Broker', 5000, 20000, 80, 75, 120, 'premium');

-- Markets
INSERT INTO public.pricing_markets (slug, city_name, region_name, market_tier, population_estimate, competitiveness_multiplier, premium_territory_multiplier, labor_cost_multiplier, demand_score) VALUES
('montreal', 'Montréal', 'Grande région de Montréal', 'premium', 1780000, 1.35, 1.25, 1.15, 90),
('laval', 'Laval', 'Grande région de Montréal', 'premium', 440000, 1.25, 1.15, 1.10, 80),
('quebec', 'Québec', 'Capitale-Nationale', 'standard', 550000, 1.15, 1.10, 1.05, 75),
('longueuil', 'Longueuil', 'Montérégie', 'standard', 250000, 1.20, 1.10, 1.08, 75),
('trois-rivieres', 'Trois-Rivières', 'Mauricie', 'economy', 140000, 0.90, 0.95, 0.95, 55),
('sherbrooke', 'Sherbrooke', 'Estrie', 'economy', 170000, 0.95, 0.95, 0.98, 60),
('gatineau', 'Gatineau', 'Outaouais', 'standard', 290000, 1.10, 1.05, 1.05, 70);

-- Plan Bases (monthly prices in dollars)
INSERT INTO public.pricing_plan_bases (plan_code, plan_name, billing_period, base_price, included_rendezvous, max_service_areas, max_categories) VALUES
('recrue', 'Recrue', 'month', 0, 0, 1, 1),
('pro', 'Pro', 'month', 49, 0, 3, 2),
('premium', 'Premium', 'month', 99, 0, 5, 3),
('elite', 'Élite', 'month', 199, 0, 10, 5),
('signature', 'Signature', 'month', 399, 0, NULL, NULL);

-- Rendezvous Packages
INSERT INTO public.pricing_rendezvous_packages (package_code, package_name, rendezvous_count, pricing_mode, base_package_price) VALUES
('rdv-10', '10 rendez-vous', 10, 'per_unit', 850),
('rdv-20', '20 rendez-vous', 20, 'per_unit', 1600),
('rdv-40', '40 rendez-vous', 40, 'per_unit', 2800),
('rdv-60', '60 rendez-vous', 60, 'per_unit', 3600);
