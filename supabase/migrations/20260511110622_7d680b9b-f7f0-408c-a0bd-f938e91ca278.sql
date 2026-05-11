-- Industry pricing profiles
CREATE TABLE IF NOT EXISTS public.industry_pricing_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  industry_slug text NOT NULL UNIQUE,
  industry_name text NOT NULL,
  avg_contract_value_cents integer NOT NULL,
  estimated_margin_percent numeric(5,2) NOT NULL DEFAULT 25,
  avg_close_rate numeric(4,3) NOT NULL DEFAULT 0.35,
  base_rdv_price_cents integer NOT NULL,
  min_rdv_price_cents integer NOT NULL DEFAULT 3500,
  max_rdv_price_cents integer NOT NULL DEFAULT 80000,
  seasonality_factor numeric(4,2) NOT NULL DEFAULT 1.0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.industry_pricing_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "industry_pricing_public_read"
  ON public.industry_pricing_profiles FOR SELECT
  USING (true);

CREATE POLICY "industry_pricing_admin_write"
  ON public.industry_pricing_profiles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Territory clusters
CREATE TABLE IF NOT EXISTS public.territory_clusters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cluster_slug text NOT NULL UNIQUE,
  cluster_name text NOT NULL,
  population integer,
  competition_score numeric(4,2) DEFAULT 1.0,
  demand_score numeric(4,2) DEFAULT 1.0,
  average_income integer,
  housing_density numeric(4,2),
  territory_multiplier numeric(4,3) NOT NULL DEFAULT 1.0,
  city_slugs text[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.territory_clusters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "territory_clusters_public_read"
  ON public.territory_clusters FOR SELECT
  USING (true);

CREATE POLICY "territory_clusters_admin_write"
  ON public.territory_clusters FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Seed industries
INSERT INTO public.industry_pricing_profiles (industry_slug, industry_name, avg_contract_value_cents, avg_close_rate, base_rdv_price_cents, min_rdv_price_cents, max_rdv_price_cents) VALUES
  ('default', 'Général', 400000, 0.35, 12000, 4000, 50000),
  ('isolation', 'Isolation', 420000, 0.42, 14500, 6000, 30000),
  ('toiture', 'Toiture', 1200000, 0.35, 32000, 15000, 80000),
  ('pavage', 'Pavage', 850000, 0.38, 24000, 10000, 60000),
  ('paysagement', 'Paysagement', 350000, 0.40, 11000, 4500, 25000),
  ('electricite', 'Électricien', 90000, 0.55, 5500, 3000, 15000),
  ('plomberie', 'Plomberie', 85000, 0.55, 6500, 3000, 18000),
  ('peinture', 'Peinture', 450000, 0.45, 9000, 4000, 22000),
  ('chauffage', 'Chauffage', 950000, 0.40, 18000, 7000, 45000),
  ('renovation', 'Rénovation', 1500000, 0.30, 35000, 15000, 80000),
  ('excavation', 'Excavation', 1500000, 0.32, 38000, 18000, 80000),
  ('lavage-vitres', 'Lavage de vitres', 45000, 0.60, 3500, 2500, 8000)
ON CONFLICT (industry_slug) DO UPDATE SET
  industry_name = EXCLUDED.industry_name,
  avg_contract_value_cents = EXCLUDED.avg_contract_value_cents,
  avg_close_rate = EXCLUDED.avg_close_rate,
  base_rdv_price_cents = EXCLUDED.base_rdv_price_cents,
  min_rdv_price_cents = EXCLUDED.min_rdv_price_cents,
  max_rdv_price_cents = EXCLUDED.max_rdv_price_cents,
  updated_at = now();

-- Seed territories
INSERT INTO public.territory_clusters (cluster_slug, cluster_name, territory_multiplier, city_slugs) VALUES
  ('default', 'Standard', 1.00, '{}'),
  ('montreal-centre', 'Montréal centre', 1.35, ARRAY['montreal','ville-marie','plateau-mont-royal','rosemont','le-sud-ouest','outremont']),
  ('laval', 'Laval', 1.15, ARRAY['laval']),
  ('rive-sud', 'Rive-Sud', 1.10, ARRAY['longueuil','brossard','saint-lambert','boucherville','saint-hubert']),
  ('rive-nord', 'Rive-Nord', 1.08, ARRAY['terrebonne','mascouche','repentigny','blainville','mirabel','saint-jerome']),
  ('quebec-ville', 'Québec', 1.05, ARRAY['quebec','levis','sainte-foy']),
  ('regions-eloignees', 'Régions éloignées', 0.82, '{}')
ON CONFLICT (cluster_slug) DO UPDATE SET
  cluster_name = EXCLUDED.cluster_name,
  territory_multiplier = EXCLUDED.territory_multiplier,
  city_slugs = EXCLUDED.city_slugs,
  updated_at = now();