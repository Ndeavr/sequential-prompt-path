
-- ============================================================
-- UNPRO Dynamic Pricing — Plan IA Personnalisé (Phase 1)
-- ============================================================

-- has_role helper assumed to exist (per project convention)

-- 1) contractor_growth_profiles
CREATE TABLE public.contractor_growth_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID NOT NULL,
  user_id UUID NOT NULL,
  monthly_capacity INT NOT NULL DEFAULT 10 CHECK (monthly_capacity BETWEEN 0 AND 500),
  avg_ticket_cents INT NOT NULL DEFAULT 200000 CHECK (avg_ticket_cents >= 0),
  teams_count INT NOT NULL DEFAULT 1 CHECK (teams_count BETWEEN 1 AND 100),
  target_growth_percent INT NOT NULL DEFAULT 20 CHECK (target_growth_percent BETWEEN 0 AND 500),
  preferred_job_types TEXT[] NOT NULL DEFAULT '{}',
  preferred_territories TEXT[] NOT NULL DEFAULT '{}',
  wants_exclusivity BOOLEAN NOT NULL DEFAULT false,
  max_distance_km INT NOT NULL DEFAULT 50 CHECK (max_distance_km BETWEEN 0 AND 1000),
  quality_vs_volume SMALLINT NOT NULL DEFAULT 50 CHECK (quality_vs_volume BETWEEN 0 AND 100),
  seasonality_notes TEXT,
  availability_score SMALLINT NOT NULL DEFAULT 50 CHECK (availability_score BETWEEN 0 AND 100),
  response_speed_minutes INT,
  generated_plan_id UUID,
  generated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(contractor_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.contractor_growth_profiles TO authenticated;
GRANT ALL ON public.contractor_growth_profiles TO service_role;

ALTER TABLE public.contractor_growth_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Contractors manage their own growth profile"
ON public.contractor_growth_profiles FOR ALL
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- 2) territory_market_scores
CREATE TABLE public.territory_market_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  territory TEXT NOT NULL,
  trade TEXT NOT NULL,
  competition_score SMALLINT NOT NULL DEFAULT 50 CHECK (competition_score BETWEEN 0 AND 100),
  avg_cpc_cents INT NOT NULL DEFAULT 500,
  demand_score SMALLINT NOT NULL DEFAULT 50 CHECK (demand_score BETWEEN 0 AND 100),
  avg_project_value_cents INT NOT NULL DEFAULT 250000,
  ai_difficulty_score SMALLINT NOT NULL DEFAULT 50 CHECK (ai_difficulty_score BETWEEN 0 AND 100),
  rarity_score SMALLINT NOT NULL DEFAULT 50 CHECK (rarity_score BETWEEN 0 AND 100),
  exclusivity_slots_total SMALLINT NOT NULL DEFAULT 3 CHECK (exclusivity_slots_total >= 0),
  exclusivity_slots_taken SMALLINT NOT NULL DEFAULT 0 CHECK (exclusivity_slots_taken >= 0),
  recommended_min_plan TEXT NOT NULL DEFAULT 'pro',
  seasonality_multiplier NUMERIC(4,2) NOT NULL DEFAULT 1.0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(territory, trade)
);

GRANT SELECT ON public.territory_market_scores TO authenticated;
GRANT ALL ON public.territory_market_scores TO service_role;

ALTER TABLE public.territory_market_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read market scores"
ON public.territory_market_scores FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Only admins can modify market scores"
ON public.territory_market_scores FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 3) dynamic_plan_recommendations
CREATE TABLE public.dynamic_plan_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID NOT NULL,
  user_id UUID NOT NULL,
  recommended_plan_slug TEXT NOT NULL,
  recommended_price_cents INT NOT NULL,
  base_plan_price_cents INT NOT NULL,
  price_modifier_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
  estimated_monthly_appointments_min INT NOT NULL DEFAULT 0,
  estimated_monthly_appointments_max INT NOT NULL DEFAULT 0,
  estimated_revenue_min_cents BIGINT NOT NULL DEFAULT 0,
  estimated_revenue_max_cents BIGINT NOT NULL DEFAULT 0,
  exclusivity_level TEXT NOT NULL DEFAULT 'none' CHECK (exclusivity_level IN ('none','partial','full')),
  territory_priority TEXT NOT NULL DEFAULT 'medium' CHECK (territory_priority IN ('low','medium','high','critical')),
  market_score SMALLINT NOT NULL DEFAULT 50,
  opportunity_score SMALLINT NOT NULL DEFAULT 50,
  competition_score SMALLINT NOT NULL DEFAULT 50,
  recommendation_reason JSONB NOT NULL DEFAULT '{}'::jsonb,
  accepted BOOLEAN NOT NULL DEFAULT false,
  accepted_at TIMESTAMPTZ,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.dynamic_plan_recommendations TO authenticated;
GRANT ALL ON public.dynamic_plan_recommendations TO service_role;

ALTER TABLE public.dynamic_plan_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Contractors read their own recommendations"
ON public.dynamic_plan_recommendations FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role and admin write recommendations"
ON public.dynamic_plan_recommendations FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Contractor can accept own recommendation"
ON public.dynamic_plan_recommendations FOR UPDATE
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_dpr_contractor ON public.dynamic_plan_recommendations(contractor_id, generated_at DESC);

-- 4) pricing_engine_coefficients
CREATE TABLE public.pricing_engine_coefficients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value NUMERIC NOT NULL,
  description TEXT,
  updated_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.pricing_engine_coefficients TO authenticated;
GRANT ALL ON public.pricing_engine_coefficients TO service_role;

ALTER TABLE public.pricing_engine_coefficients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read coefficients"
ON public.pricing_engine_coefficients FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Only admins can modify coefficients"
ON public.pricing_engine_coefficients FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.pricing_engine_coefficients (key, value, description) VALUES
  ('competition_weight', 0.30, 'Poids du score de compétition dans le market modifier'),
  ('demand_weight', 0.25, 'Poids du score de demande'),
  ('ticket_weight', 0.20, 'Poids du ticket moyen'),
  ('exclusivity_premium', 0.40, 'Premium appliqué si exclusivité territoriale demandée et disponible'),
  ('rarity_premium', 0.25, 'Premium appliqué si rareté > 70'),
  ('seasonality_weight', 0.10, 'Poids de la saisonnalité'),
  ('min_price_floor_cents', 14900, 'Prix plancher (cents)'),
  ('max_price_ceiling_cents', 499900, 'Prix plafond (cents)');

-- 5) pricing_overrides
CREATE TABLE public.pricing_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID,
  territory TEXT,
  trade TEXT,
  forced_price_cents INT,
  forced_plan_slug TEXT,
  reason TEXT NOT NULL,
  expires_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (contractor_id IS NOT NULL OR (territory IS NOT NULL AND trade IS NOT NULL))
);

GRANT SELECT ON public.pricing_overrides TO authenticated;
GRANT ALL ON public.pricing_overrides TO service_role;

ALTER TABLE public.pricing_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read overrides"
ON public.pricing_overrides FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage overrides"
ON public.pricing_overrides FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_overrides_lookup ON public.pricing_overrides(contractor_id, territory, trade);

-- Trigger pour updated_at
CREATE TRIGGER update_growth_profiles_updated_at
BEFORE UPDATE ON public.contractor_growth_profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_market_scores_updated_at
BEFORE UPDATE ON public.territory_market_scores
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_coefficients_updated_at
BEFORE UPDATE ON public.pricing_engine_coefficients
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed sample market data (QC core territories × trades)
INSERT INTO public.territory_market_scores
  (territory, trade, competition_score, avg_cpc_cents, demand_score, avg_project_value_cents, ai_difficulty_score, rarity_score, exclusivity_slots_total, exclusivity_slots_taken, recommended_min_plan, seasonality_multiplier)
VALUES
  ('Montréal','isolation',85,1200,82,650000,70,55,3,1,'premium',1.10),
  ('Laval','isolation',75,950,78,580000,65,60,3,0,'premium',1.10),
  ('Terrebonne','isolation',55,700,62,520000,55,65,2,0,'pro',1.05),
  ('Montréal','plomberie',88,1500,90,180000,72,40,5,2,'premium',1.00),
  ('Laval','plomberie',70,900,75,170000,60,55,3,1,'pro',1.00),
  ('Montréal','electricite',82,1400,80,220000,68,45,4,1,'premium',1.00),
  ('Laval','electricite',65,850,70,200000,58,60,3,0,'pro',1.00),
  ('Montréal','toiture',78,1300,85,950000,65,50,3,1,'elite',1.20),
  ('Laval','toiture',62,800,72,890000,55,65,2,0,'premium',1.20),
  ('Terrebonne','toiture',48,600,58,820000,50,72,2,0,'pro',1.20);
