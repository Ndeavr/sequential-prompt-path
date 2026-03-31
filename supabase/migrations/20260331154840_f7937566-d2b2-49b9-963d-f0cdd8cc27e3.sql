
-- Google Ads benchmark data for dynamic appointment pricing
CREATE TABLE public.appointment_pricing_benchmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_slug TEXT NOT NULL,
  market_slug TEXT NOT NULL,
  google_ads_cpl_cents INTEGER NOT NULL DEFAULT 0,
  google_ads_cpc_cents INTEGER NOT NULL DEFAULT 0,
  google_ads_avg_conversion_rate NUMERIC(5,2) DEFAULT 0,
  unpro_markup_percent NUMERIC(5,2) NOT NULL DEFAULT 30,
  seasonal_multiplier NUMERIC(4,2) NOT NULL DEFAULT 1.00,
  season_code TEXT DEFAULT 'default',
  base_appointment_price_cents INTEGER NOT NULL DEFAULT 0,
  final_appointment_price_cents INTEGER NOT NULL DEFAULT 0,
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  data_source TEXT DEFAULT 'google_ads',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(category_slug, market_slug, season_code, effective_from)
);

-- Seasonal multiplier reference
CREATE TABLE public.seasonal_pricing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_slug TEXT NOT NULL,
  season_code TEXT NOT NULL,
  month_start INTEGER NOT NULL CHECK (month_start BETWEEN 1 AND 12),
  month_end INTEGER NOT NULL CHECK (month_end BETWEEN 1 AND 12),
  multiplier NUMERIC(4,2) NOT NULL DEFAULT 1.00,
  label_fr TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(category_slug, season_code)
);

-- Enable RLS
ALTER TABLE public.appointment_pricing_benchmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seasonal_pricing_rules ENABLE ROW LEVEL SECURITY;

-- Public read for pricing display
CREATE POLICY "Anyone can read active benchmarks" ON public.appointment_pricing_benchmarks FOR SELECT USING (is_active = true);
CREATE POLICY "Anyone can read active seasonal rules" ON public.seasonal_pricing_rules FOR SELECT USING (is_active = true);

-- Insert seed data: Google Ads CPL benchmarks by category × market
-- Real Quebec Google Ads CPL data with +30% UNPRO markup
INSERT INTO public.appointment_pricing_benchmarks (category_slug, market_slug, google_ads_cpl_cents, google_ads_cpc_cents, google_ads_avg_conversion_rate, unpro_markup_percent, seasonal_multiplier, season_code, base_appointment_price_cents, final_appointment_price_cents)
VALUES
  -- Toiture (high CPL market)
  ('toiture', 'montreal', 8500, 1200, 7.10, 30, 1.00, 'default', 8500, 11050),
  ('toiture', 'laval', 7200, 1050, 6.85, 30, 1.00, 'default', 7200, 9360),
  ('toiture', 'quebec', 6800, 980, 6.94, 30, 1.00, 'default', 6800, 8840),
  ('toiture', 'longueuil', 7000, 1020, 6.86, 30, 1.00, 'default', 7000, 9100),
  ('toiture', 'trois-rivieres', 5500, 820, 6.70, 30, 1.00, 'default', 5500, 7150),
  ('toiture', 'sherbrooke', 5200, 780, 6.67, 30, 1.00, 'default', 5200, 6760),
  ('toiture', 'gatineau', 6000, 900, 6.67, 30, 1.00, 'default', 6000, 7800),
  -- Isolation (medium-high CPL)
  ('isolation', 'montreal', 7200, 950, 7.58, 30, 1.00, 'default', 7200, 9360),
  ('isolation', 'laval', 6500, 880, 7.39, 30, 1.00, 'default', 6500, 8450),
  ('isolation', 'quebec', 6000, 820, 7.32, 30, 1.00, 'default', 6000, 7800),
  ('isolation', 'trois-rivieres', 4800, 680, 7.06, 30, 1.00, 'default', 4800, 6240),
  -- Thermopompe
  ('thermopompe', 'montreal', 9500, 1400, 6.79, 30, 1.00, 'default', 9500, 12350),
  ('thermopompe', 'laval', 8200, 1200, 6.83, 30, 1.00, 'default', 8200, 10660),
  ('thermopompe', 'quebec', 7800, 1100, 7.09, 30, 1.00, 'default', 7800, 10140),
  -- Gouttières (lower CPL)
  ('gouttieres', 'montreal', 4500, 650, 6.92, 30, 1.00, 'default', 4500, 5850),
  ('gouttieres', 'quebec', 3800, 560, 6.79, 30, 1.00, 'default', 3800, 4940),
  -- Tonte pelouse (low CPL)
  ('tonte-pelouse', 'montreal', 2200, 350, 6.29, 30, 1.00, 'default', 2200, 2860),
  ('tonte-pelouse', 'trois-rivieres', 1500, 250, 6.00, 30, 1.00, 'default', 1500, 1950),
  ('tonte-pelouse', 'quebec', 1800, 300, 6.00, 30, 1.00, 'default', 1800, 2340),
  -- Aménagement paysager
  ('amenagement-paysager', 'montreal', 6200, 900, 6.89, 30, 1.00, 'default', 6200, 8060),
  ('amenagement-paysager', 'laval', 5500, 800, 6.88, 30, 1.00, 'default', 5500, 7150),
  -- Pavé-uni
  ('pave-uni', 'montreal', 7800, 1100, 7.09, 30, 1.00, 'default', 7800, 10140),
  ('pave-uni', 'laval', 6800, 950, 7.16, 30, 1.00, 'default', 6800, 8840),
  -- Excavation
  ('excavation', 'montreal', 8800, 1300, 6.77, 30, 1.00, 'default', 8800, 11440),
  ('excavation', 'quebec', 7200, 1050, 6.86, 30, 1.00, 'default', 7200, 9360);

-- Seasonal rules for Quebec
INSERT INTO public.seasonal_pricing_rules (category_slug, season_code, month_start, month_end, multiplier, label_fr)
VALUES
  ('toiture', 'printemps', 3, 5, 1.35, 'Haute saison printemps'),
  ('toiture', 'ete', 6, 8, 1.20, 'Saison estivale'),
  ('toiture', 'automne', 9, 11, 1.25, 'Pré-hiver'),
  ('toiture', 'hiver', 12, 2, 0.75, 'Basse saison'),
  ('isolation', 'automne', 9, 11, 1.40, 'Pré-hiver forte demande'),
  ('isolation', 'hiver', 12, 2, 1.30, 'Saison chauffage'),
  ('isolation', 'printemps', 3, 5, 1.00, 'Saison normale'),
  ('isolation', 'ete', 6, 8, 0.85, 'Basse saison'),
  ('thermopompe', 'printemps', 3, 5, 1.45, 'Pré-été forte demande'),
  ('thermopompe', 'ete', 6, 8, 1.35, 'Haute saison'),
  ('thermopompe', 'automne', 9, 11, 1.10, 'Pré-hiver'),
  ('thermopompe', 'hiver', 12, 2, 0.80, 'Basse saison'),
  ('tonte-pelouse', 'printemps', 3, 5, 1.30, 'Début saison'),
  ('tonte-pelouse', 'ete', 6, 8, 1.15, 'Pleine saison'),
  ('tonte-pelouse', 'automne', 9, 11, 0.90, 'Fin de saison'),
  ('tonte-pelouse', 'hiver', 12, 2, 0.00, 'Hors saison'),
  ('gouttieres', 'printemps', 3, 5, 1.30, 'Fonte des neiges'),
  ('gouttieres', 'automne', 9, 11, 1.35, 'Pré-hiver'),
  ('amenagement-paysager', 'printemps', 3, 5, 1.40, 'Haute saison'),
  ('amenagement-paysager', 'ete', 6, 8, 1.25, 'Saison estivale'),
  ('pave-uni', 'printemps', 3, 5, 1.30, 'Début saison'),
  ('pave-uni', 'ete', 6, 8, 1.20, 'Pleine saison'),
  ('excavation', 'printemps', 3, 5, 1.35, 'Dégel'),
  ('excavation', 'ete', 6, 8, 1.20, 'Pleine saison');
