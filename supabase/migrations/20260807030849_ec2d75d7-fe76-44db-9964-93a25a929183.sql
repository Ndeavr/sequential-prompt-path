-- ============================================================
-- PHASE 1 — Source unique de vérité tarifaire (entrepreneurs)
-- ============================================================

-- 1a. Retirer les anciens niveaux des surfaces client (données conservées)
UPDATE public.plans SET active = false, updated_at = now()
WHERE code IN ('recrue', 'elite', 'signature');

-- 1b. Repositionner les codes réutilisés
UPDATE public.plans SET
  name = 'Pro',
  tier_rank = 4,
  monthly_price = 29900,
  yearly_price = 299000,
  appointments_included = 12,
  tagline = 'Acquisition soutenue',
  visibility_multiplier = 1.60,
  recommendation_multiplier = 1.50,
  ai_index_priority = 70,
  trust_boost = 0.20,
  seo_boost = 0.20,
  citation_boost = 0.15,
  territory_radius_km = 35,
  booking_priority = 60,
  active = true,
  updated_at = now()
WHERE code = 'pro';

UPDATE public.plans SET
  name = 'Premium',
  tier_rank = 5,
  monthly_price = 59900,
  yearly_price = 599000,
  appointments_included = 25,
  tagline = 'Agenda rempli',
  visibility_multiplier = 2.00,
  recommendation_multiplier = 1.90,
  ai_index_priority = 85,
  trust_boost = 0.30,
  seo_boost = 0.30,
  citation_boost = 0.25,
  territory_radius_km = 50,
  booking_priority = 80,
  active = true,
  updated_at = now()
WHERE code = 'premium';

-- 1c. Nouveaux niveaux
INSERT INTO public.plans (
  code, name, audience, tier_rank, monthly_price, yearly_price, one_time_price,
  visibility_multiplier, recommendation_multiplier, ai_index_priority,
  trust_boost, seo_boost, citation_boost, territory_radius_km,
  booking_priority, appointments_included, tagline, active, billing_interval
) VALUES
  ('presence',   'Présence',   'contractor', 1,  4900,  49000, 0, 1.00, 1.00, 35, 0.05, 0.05, 0.05, 10,  10,  0,
   'Présence et réputation vérifiée', true, 'month'),
  ('local',      'Local',      'contractor', 2,  7900,  79000, 0, 1.20, 1.15, 45, 0.10, 0.10, 0.08, 15,  25,  2,
   'Visible là où vous travaillez', true, 'month'),
  ('croissance', 'Croissance', 'contractor', 3, 14900, 149000, 0, 1.40, 1.30, 58, 0.15, 0.15, 0.12, 25,  45,  5,
   'Quelques projets de plus chaque mois', true, 'month'),
  ('domination', 'Domination', 'contractor', 6, 149900, 1499000, 0, 2.60, 2.50, 100, 0.45, 0.45, 0.40, 80, 100, 60,
   'Exclusivité et domination de territoire', true, 'month')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  tier_rank = EXCLUDED.tier_rank,
  monthly_price = EXCLUDED.monthly_price,
  yearly_price = EXCLUDED.yearly_price,
  appointments_included = EXCLUDED.appointments_included,
  tagline = EXCLUDED.tagline,
  active = true,
  updated_at = now();

-- 1d. Matrice d'accès des six niveaux
INSERT INTO public.plan_features (plan_code, feature_key, enabled, limit_value, teaser_copy, upgrade_target) VALUES
  -- Présence
  ('presence','ai_index_priority',    true,  35,  NULL, NULL),
  ('presence','aeo_blocks_published', true,  2,   NULL, 'local'),
  ('presence','analytics_advanced',   false, 0,   'Statistiques détaillées à partir de Croissance.', 'croissance'),
  ('presence','booking_direct',       false, 0,   'Les rendez-vous confirmés commencent au forfait Local.', 'local'),
  ('presence','priority_dispatch',    false, 0,   'Priorité de répartition à partir de Pro.', 'pro'),
  ('presence','priority_support',     false, 0,   'Support prioritaire à partir de Premium.', 'premium'),
  ('presence','route_optimization',   false, 0,   'Optimisation des déplacements à partir de Premium.', 'premium'),
  ('presence','territory_lock',       false, 0,   'Verrouillez votre territoire avec Domination.', 'domination'),
  ('presence','exclusivity',          false, 0,   'Exclusivité réservée au forfait Domination.', 'domination'),
  ('presence','service_cities_max',   true,  1,   'Ajoutez des villes avec Local.', 'local'),
  -- Local
  ('local','ai_index_priority',    true,  45, NULL, NULL),
  ('local','aeo_blocks_published', true,  5,  NULL, 'croissance'),
  ('local','analytics_advanced',   false, 0,  'Statistiques détaillées à partir de Croissance.', 'croissance'),
  ('local','booking_direct',       true,  2,  NULL, NULL),
  ('local','priority_dispatch',    false, 0,  'Priorité de répartition à partir de Pro.', 'pro'),
  ('local','priority_support',     false, 0,  'Support prioritaire à partir de Premium.', 'premium'),
  ('local','route_optimization',   false, 0,  'Optimisation des déplacements à partir de Premium.', 'premium'),
  ('local','territory_lock',       false, 0,  'Verrouillez votre territoire avec Domination.', 'domination'),
  ('local','exclusivity',          false, 0,  'Exclusivité réservée au forfait Domination.', 'domination'),
  ('local','service_cities_max',   true,  2,  'Couvrez plus de villes avec Croissance.', 'croissance'),
  -- Croissance
  ('croissance','ai_index_priority',    true,  58, NULL, NULL),
  ('croissance','aeo_blocks_published', true,  12, NULL, 'pro'),
  ('croissance','analytics_advanced',   true,  NULL, NULL, NULL),
  ('croissance','booking_direct',       true,  5,  NULL, NULL),
  ('croissance','priority_dispatch',    false, 0,  'Priorité de répartition à partir de Pro.', 'pro'),
  ('croissance','priority_support',     false, 0,  'Support prioritaire à partir de Premium.', 'premium'),
  ('croissance','route_optimization',   false, 0,  'Optimisation des déplacements à partir de Premium.', 'premium'),
  ('croissance','territory_lock',       false, 0,  'Verrouillez votre territoire avec Domination.', 'domination'),
  ('croissance','exclusivity',          false, 0,  'Exclusivité réservée au forfait Domination.', 'domination'),
  ('croissance','service_cities_max',   true,  4,  'Couvrez plus de villes avec Pro.', 'pro'),
  -- Pro
  ('pro','service_cities_max', true, 8, 'Couvrez plus de villes avec Premium.', 'premium'),
  ('pro','exclusivity',        false, 0, 'Exclusivité réservée au forfait Domination.', 'domination'),
  -- Premium
  ('premium','service_cities_max', true, 15, 'Territoire illimité avec Domination.', 'domination'),
  ('premium','exclusivity',        false, 0, 'Exclusivité réservée au forfait Domination.', 'domination'),
  -- Domination
  ('domination','ai_index_priority',    true,  100, NULL, NULL),
  ('domination','aeo_blocks_published', true,  -1,  NULL, NULL),
  ('domination','analytics_advanced',   true,  NULL, NULL, NULL),
  ('domination','booking_direct',       true,  60,  NULL, NULL),
  ('domination','priority_dispatch',    true,  NULL, NULL, NULL),
  ('domination','priority_support',     true,  NULL, NULL, NULL),
  ('domination','route_optimization',   true,  NULL, NULL, NULL),
  ('domination','territory_lock',       true,  NULL, NULL, NULL),
  ('domination','exclusivity',          true,  NULL, NULL, NULL),
  ('domination','service_cities_max',   true,  -1,  NULL, NULL)
ON CONFLICT (plan_code, feature_key) DO UPDATE SET
  enabled = EXCLUDED.enabled,
  limit_value = EXCLUDED.limit_value,
  teaser_copy = EXCLUDED.teaser_copy,
  upgrade_target = EXCLUDED.upgrade_target,
  updated_at = now();

-- Réaligner les niveaux réutilisés
UPDATE public.plan_features SET limit_value = 12, enabled = true, updated_at = now()
  WHERE plan_code = 'pro' AND feature_key = 'booking_direct';
UPDATE public.plan_features SET enabled = true, limit_value = NULL, upgrade_target = NULL, updated_at = now()
  WHERE plan_code = 'pro' AND feature_key = 'priority_dispatch';
UPDATE public.plan_features SET limit_value = 25, enabled = true, updated_at = now()
  WHERE plan_code = 'premium' AND feature_key = 'booking_direct';
UPDATE public.plan_features SET enabled = true, limit_value = NULL, upgrade_target = NULL, updated_at = now()
  WHERE plan_code = 'premium' AND feature_key = 'priority_support';
UPDATE public.plan_features SET upgrade_target = 'domination', updated_at = now()
  WHERE plan_code IN ('pro','premium') AND feature_key = 'territory_lock';
UPDATE public.plan_features SET upgrade_target = 'premium', updated_at = now()
  WHERE plan_code IN ('pro') AND feature_key IN ('priority_support','route_optimization');
UPDATE public.plan_features SET upgrade_target = 'domination', updated_at = now()
  WHERE plan_code = 'premium' AND feature_key = 'route_optimization';

-- ============================================================
-- PHASE 1b — Configuration tarifaire centralisée
-- ============================================================
CREATE TABLE IF NOT EXISTS public.pricing_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pricing_version text NOT NULL UNIQUE,
  active boolean NOT NULL DEFAULT false,
  trial_price_cents integer NOT NULL DEFAULT 100,
  trial_days integer NOT NULL DEFAULT 7,
  default_plan_code text NOT NULL DEFAULT 'presence',
  min_monthly_cents integer NOT NULL DEFAULT 4900,
  max_monthly_cents integer NOT NULL DEFAULT 149900,
  weights jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.pricing_config TO anon, authenticated;
GRANT ALL ON public.pricing_config TO service_role;
ALTER TABLE public.pricing_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pricing_config_public_read" ON public.pricing_config;
CREATE POLICY "pricing_config_public_read" ON public.pricing_config
  FOR SELECT USING (active = true);

DROP POLICY IF EXISTS "pricing_config_admin_all" ON public.pricing_config;
CREATE POLICY "pricing_config_admin_all" ON public.pricing_config
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.pricing_config (pricing_version, active, weights, notes) VALUES (
  'v2026.08-growth', true,
  jsonb_build_object(
    'volume_per_appointment_cents', 9000,
    'capacity_factor_min', 0.85,
    'capacity_factor_max', 1.15,
    'demand_factor_min', 0.90,
    'demand_factor_max', 1.25,
    'competition_factor_min', 0.90,
    'competition_factor_max', 1.20,
    'exclusivity_multiplier', 1.45,
    'territory_multiplier_per_extra_city', 0.12,
    'territory_multiplier_cap', 1.60,
    'objective_multipliers', jsonb_build_object(
      'visibility', 0.85,
      'few_projects', 1.00,
      'grow', 1.15,
      'expand_territory', 1.25,
      'dominate', 1.40,
      'exclusivity', 1.45
    )
  ),
  'Refonte 2026-08 : 6 paliers 49/79/149/299/599/1499 + entrée 1 $ / 7 jours.'
) ON CONFLICT (pricing_version) DO UPDATE SET
  active = true, weights = EXCLUDED.weights, notes = EXCLUDED.notes, updated_at = now();

UPDATE public.pricing_config SET active = false WHERE pricing_version <> 'v2026.08-growth';

-- ============================================================
-- PHASE 2 — Profil de croissance entrepreneur
-- ============================================================
ALTER TABLE public.contractor_growth_profiles
  ALTER COLUMN contractor_id DROP NOT NULL,
  ALTER COLUMN user_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS session_id text,
  ADD COLUMN IF NOT EXISTS trade text,
  ADD COLUMN IF NOT EXISTS service_categories text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS primary_city text,
  ADD COLUMN IF NOT EXISTS service_cities text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS service_radius_km integer,
  ADD COLUMN IF NOT EXISTS desired_monthly_projects integer,
  ADD COLUMN IF NOT EXISTS business_objective text,
  ADD COLUMN IF NOT EXISTS average_project_value integer,
  ADD COLUMN IF NOT EXISTS budget_comfort_cents integer,
  ADD COLUMN IF NOT EXISTS data_sources jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS completeness numeric(5,2) NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_cgp_user ON public.contractor_growth_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_cgp_session ON public.contractor_growth_profiles(session_id);

GRANT SELECT, INSERT, UPDATE ON public.contractor_growth_profiles TO authenticated;
GRANT ALL ON public.contractor_growth_profiles TO service_role;
ALTER TABLE public.contractor_growth_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cgp_owner_all" ON public.contractor_growth_profiles;
CREATE POLICY "cgp_owner_all" ON public.contractor_growth_profiles
  FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS trg_cgp_updated_at ON public.contractor_growth_profiles;
CREATE TRIGGER trg_cgp_updated_at
  BEFORE UPDATE ON public.contractor_growth_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_pricing_config_updated_at ON public.pricing_config;
CREATE TRIGGER trg_pricing_config_updated_at
  BEFORE UPDATE ON public.pricing_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- PHASE 3 — Disponibilité réelle par métier x ville
-- ============================================================
CREATE OR REPLACE FUNCTION public.territory_availability(_trade text, _city text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  slot_row public.acq_territory_slots%ROWTYPE;
  active_contractors integer := 0;
  occupied integer;
  remaining integer;
BEGIN
  IF _trade IS NULL OR _city IS NULL OR btrim(_trade) = '' OR btrim(_city) = '' THEN
    RETURN jsonb_build_object('status', 'unknown', 'reason', 'missing_input');
  END IF;

  SELECT * INTO slot_row
  FROM public.acq_territory_slots
  WHERE lower(btrim(city)) = lower(btrim(_city))
    AND lower(btrim(trade)) = lower(btrim(_trade))
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'status', 'unknown',
      'reason', 'no_configured_capacity',
      'city', _city,
      'trade', _trade
    );
  END IF;

  SELECT count(*)::int INTO active_contractors
  FROM public.contractors c
  WHERE lower(btrim(coalesce(c.city, ''))) = lower(btrim(_city))
    AND lower(btrim(coalesce(c.specialty, ''))) = lower(btrim(_trade))
    AND coalesce(c.account_status, '') = 'active';

  occupied := GREATEST(slot_row.used_slots, active_contractors);
  remaining := GREATEST(slot_row.max_slots - occupied, 0);

  RETURN jsonb_build_object(
    'status', 'verified',
    'city', slot_row.city,
    'trade', slot_row.trade,
    'max_slots', slot_row.max_slots,
    'occupied_slots', occupied,
    'remaining_slots', remaining,
    'lock_status', slot_row.lock_status,
    'saturation_percent', slot_row.saturation_percent,
    'sources', jsonb_build_object(
      'configured_slots', slot_row.max_slots,
      'configured_used', slot_row.used_slots,
      'active_contractors', active_contractors,
      'computed_at', now()
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.territory_availability(text, text) TO anon, authenticated, service_role;