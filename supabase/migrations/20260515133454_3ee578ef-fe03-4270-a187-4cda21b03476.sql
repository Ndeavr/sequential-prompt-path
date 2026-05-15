
-- ===== Contractor Capacity Framework — Phase 1 =====

-- 1. trade_capacity_rules
CREATE TABLE public.trade_capacity_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_slug TEXT NOT NULL UNIQUE,
  family TEXT NOT NULL,
  inhabitants_per_pro INTEGER NOT NULL DEFAULT 8000,
  min_cap_per_city INTEGER NOT NULL DEFAULT 2,
  max_cap_per_city INTEGER NOT NULL DEFAULT 25,
  seasonality JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. trade_cpc_benchmarks
CREATE TABLE public.trade_cpc_benchmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_slug TEXT NOT NULL,
  city_slug TEXT NOT NULL,
  cpc_cad NUMERIC(10,2) NOT NULL DEFAULT 0,
  tier TEXT NOT NULL CHECK (tier IN ('S','A','B','C','D')),
  source TEXT NOT NULL DEFAULT 'manual',
  refreshed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(trade_slug, city_slug)
);
CREATE INDEX idx_cpc_trade_city ON public.trade_cpc_benchmarks(trade_slug, city_slug);
CREATE INDEX idx_cpc_tier ON public.trade_cpc_benchmarks(tier);

-- 3. capacity_snapshots
CREATE TABLE public.capacity_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_slug TEXT NOT NULL,
  city_slug TEXT NOT NULL,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  base_cap INTEGER NOT NULL DEFAULT 0,
  final_cap INTEGER NOT NULL DEFAULT 0,
  active_pros INTEGER NOT NULL DEFAULT 0,
  saturation_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  band TEXT NOT NULL DEFAULT 'green' CHECK (band IN ('green','yellow','red')),
  cpc_tier TEXT,
  gap INTEGER NOT NULL DEFAULT 0,
  factors JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(trade_slug, city_slug, snapshot_date)
);
CREATE INDEX idx_snap_trade_city ON public.capacity_snapshots(trade_slug, city_slug);
CREATE INDEX idx_snap_date ON public.capacity_snapshots(snapshot_date DESC);
CREATE INDEX idx_snap_band ON public.capacity_snapshots(band);

-- 4. exclusivity_rules
CREATE TABLE public.exclusivity_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_class TEXT NOT NULL UNIQUE CHECK (slot_class IN ('signature','elite','premium','pro','recrue')),
  min_saturation NUMERIC(5,2) NOT NULL DEFAULT 0,
  required_cpc_tiers TEXT[] NOT NULL DEFAULT '{}',
  min_gap_score INTEGER NOT NULL DEFAULT 0,
  conditions JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. capacity_recommendations
CREATE TABLE public.capacity_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_slug TEXT NOT NULL,
  city_slug TEXT NOT NULL,
  slot_class TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('open','limited','locked')),
  remaining_slots INTEGER NOT NULL DEFAULT 0,
  monthly_value_cents INTEGER NOT NULL DEFAULT 0,
  justification TEXT,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(trade_slug, city_slug, slot_class)
);
CREATE INDEX idx_reco_status ON public.capacity_recommendations(status);
CREATE INDEX idx_reco_slot ON public.capacity_recommendations(slot_class);

-- ===== RLS =====
ALTER TABLE public.trade_capacity_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trade_cpc_benchmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.capacity_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exclusivity_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.capacity_recommendations ENABLE ROW LEVEL SECURITY;

-- Public read on active rows
CREATE POLICY "Public read active capacity rules" ON public.trade_capacity_rules FOR SELECT USING (is_active = true);
CREATE POLICY "Public read CPC benchmarks" ON public.trade_cpc_benchmarks FOR SELECT USING (true);
CREATE POLICY "Public read capacity snapshots" ON public.capacity_snapshots FOR SELECT USING (true);
CREATE POLICY "Public read active exclusivity rules" ON public.exclusivity_rules FOR SELECT USING (is_active = true);
CREATE POLICY "Public read capacity recommendations" ON public.capacity_recommendations FOR SELECT USING (true);

-- Admin write
CREATE POLICY "Admins manage capacity rules" ON public.trade_capacity_rules FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins manage CPC benchmarks" ON public.trade_cpc_benchmarks FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins manage capacity snapshots" ON public.capacity_snapshots FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins manage exclusivity rules" ON public.exclusivity_rules FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins manage capacity recommendations" ON public.capacity_recommendations FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- updated_at triggers
CREATE TRIGGER trg_capacity_rules_updated BEFORE UPDATE ON public.trade_capacity_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_exclusivity_rules_updated BEFORE UPDATE ON public.exclusivity_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===== Views (SECURITY INVOKER) =====
CREATE OR REPLACE VIEW public.v_capacity_live
WITH (security_invoker = true) AS
SELECT
  s.trade_slug,
  s.city_slug,
  s.snapshot_date,
  s.base_cap,
  s.final_cap,
  s.active_pros,
  s.saturation_score,
  s.band,
  s.cpc_tier,
  s.gap,
  c.cpc_cad,
  c.tier AS cpc_band,
  ci.name AS city_name,
  ci.population
FROM public.capacity_snapshots s
LEFT JOIN public.trade_cpc_benchmarks c ON c.trade_slug = s.trade_slug AND c.city_slug = s.city_slug
LEFT JOIN public.cities ci ON ci.slug = s.city_slug
WHERE s.snapshot_date = (
  SELECT MAX(snapshot_date) FROM public.capacity_snapshots s2
  WHERE s2.trade_slug = s.trade_slug AND s2.city_slug = s.city_slug
);

CREATE OR REPLACE VIEW public.v_exclusivity_eligible
WITH (security_invoker = true) AS
SELECT
  r.trade_slug,
  r.city_slug,
  r.slot_class,
  r.status,
  r.remaining_slots,
  r.monthly_value_cents,
  r.justification,
  l.saturation_score,
  l.cpc_band,
  l.final_cap,
  l.active_pros,
  l.city_name
FROM public.capacity_recommendations r
JOIN public.v_capacity_live l ON l.trade_slug = r.trade_slug AND l.city_slug = r.city_slug
WHERE r.slot_class IN ('signature','elite') AND r.status IN ('limited','locked');
