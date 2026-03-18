
-- =============================================
-- JOB VALUE ENGINE — SCHEMA
-- =============================================

-- TABLE 1: trades
CREATE TABLE public.jve_trades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name_fr text NOT NULL,
  name_en text,
  category text NOT NULL DEFAULT 'construction',
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- TABLE 2: trade_specialties
CREATE TABLE public.jve_trade_specialties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_id uuid REFERENCES public.jve_trades(id) ON DELETE CASCADE NOT NULL,
  slug text UNIQUE NOT NULL,
  name_fr text NOT NULL,
  name_en text,
  description_fr text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- TABLE 3: regions
CREATE TABLE public.jve_regions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name_fr text NOT NULL,
  market_type text DEFAULT 'medium',
  base_cost_index numeric(8,4) DEFAULT 1.0,
  created_at timestamptz DEFAULT now()
);

-- TABLE 4: cities
CREATE TABLE public.jve_cities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  region_id uuid REFERENCES public.jve_regions(id) ON DELETE RESTRICT NOT NULL,
  slug text UNIQUE NOT NULL,
  name_fr text NOT NULL,
  population integer,
  cost_index numeric(8,4) DEFAULT 1.0,
  competition_index numeric(8,4) DEFAULT 1.0,
  seasonality_index numeric(8,4) DEFAULT 1.0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- TABLE 5: trade_city_factors
CREATE TABLE public.jve_trade_city_factors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_id uuid REFERENCES public.jve_trades(id) ON DELETE CASCADE NOT NULL,
  specialty_id uuid REFERENCES public.jve_trade_specialties(id) ON DELETE SET NULL,
  city_id uuid REFERENCES public.jve_cities(id) ON DELETE CASCADE NOT NULL,
  city_multiplier numeric(8,4) DEFAULT 1.0,
  competition_multiplier numeric(8,4) DEFAULT 1.0,
  urgency_multiplier numeric(8,4) DEFAULT 1.0,
  seasonality_multiplier numeric(8,4) DEFAULT 1.0,
  notes text,
  created_at timestamptz DEFAULT now(),
  UNIQUE (trade_id, specialty_id, city_id)
);

-- TABLE 6: trade_value_benchmarks
CREATE TABLE public.jve_trade_value_benchmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_id uuid REFERENCES public.jve_trades(id) ON DELETE CASCADE NOT NULL,
  specialty_id uuid REFERENCES public.jve_trade_specialties(id) ON DELETE SET NULL,
  benchmark_scope text NOT NULL DEFAULT 'province',
  min_value numeric(12,2) NOT NULL,
  median_value numeric(12,2) NOT NULL,
  max_value numeric(12,2) NOT NULL,
  emergency_value numeric(12,2),
  premium_value numeric(12,2),
  default_avg_value numeric(12,2) NOT NULL,
  currency text DEFAULT 'CAD',
  confidence_score integer DEFAULT 70,
  source_type text DEFAULT 'internal_estimate',
  created_at timestamptz DEFAULT now(),
  UNIQUE (trade_id, specialty_id, benchmark_scope)
);

-- TABLE 7: trade_performance_defaults
CREATE TABLE public.jve_trade_performance_defaults (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_id uuid REFERENCES public.jve_trades(id) ON DELETE CASCADE NOT NULL,
  specialty_id uuid REFERENCES public.jve_trade_specialties(id) ON DELETE SET NULL,
  default_closing_rate numeric(8,4) DEFAULT 0.30,
  low_closing_rate numeric(8,4) DEFAULT 0.15,
  high_closing_rate numeric(8,4) DEFAULT 0.55,
  default_profit_margin numeric(8,4) DEFAULT 0.20,
  low_profit_margin numeric(8,4) DEFAULT 0.10,
  high_profit_margin numeric(8,4) DEFAULT 0.35,
  default_monthly_capacity integer DEFAULT 10,
  low_monthly_capacity integer DEFAULT 4,
  high_monthly_capacity integer DEFAULT 25,
  created_at timestamptz DEFAULT now(),
  UNIQUE (trade_id, specialty_id)
);

-- TABLE 8: contractor_overrides
CREATE TABLE public.jve_contractor_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid NOT NULL,
  trade_id uuid REFERENCES public.jve_trades(id) ON DELETE CASCADE NOT NULL,
  specialty_id uuid REFERENCES public.jve_trade_specialties(id) ON DELETE SET NULL,
  avg_job_value_override numeric(12,2),
  closing_rate_override numeric(8,4),
  profit_margin_override numeric(8,4),
  monthly_capacity_override integer,
  updated_by text DEFAULT 'system',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- TABLE 9: calculator_sessions
CREATE TABLE public.jve_calculator_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  contractor_id uuid,
  trade_id uuid REFERENCES public.jve_trades(id) ON DELETE SET NULL,
  specialty_id uuid REFERENCES public.jve_trade_specialties(id) ON DELETE SET NULL,
  city_id uuid REFERENCES public.jve_cities(id) ON DELETE SET NULL,
  inputs jsonb NOT NULL DEFAULT '{}',
  outputs jsonb NOT NULL DEFAULT '{}',
  recommended_plan text,
  recommended_exclusivity text,
  created_at timestamptz DEFAULT now()
);

-- TABLE 10: estimation_audit_log
CREATE TABLE public.jve_estimation_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  calculator_session_id uuid REFERENCES public.jve_calculator_sessions(id) ON DELETE CASCADE,
  base_avg_value numeric(12,2),
  city_multiplier numeric(8,4),
  competition_multiplier numeric(8,4),
  seasonality_multiplier numeric(8,4),
  urgency_multiplier numeric(8,4),
  final_estimated_value numeric(12,2),
  reasoning jsonb,
  created_at timestamptz DEFAULT now()
);

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX idx_jve_specialties_trade ON public.jve_trade_specialties(trade_id);
CREATE INDEX idx_jve_cities_region ON public.jve_cities(region_id);
CREATE INDEX idx_jve_city_factors_trade ON public.jve_trade_city_factors(trade_id);
CREATE INDEX idx_jve_city_factors_city ON public.jve_trade_city_factors(city_id);
CREATE INDEX idx_jve_benchmarks_trade ON public.jve_trade_value_benchmarks(trade_id);
CREATE INDEX idx_jve_perf_trade ON public.jve_trade_performance_defaults(trade_id);
CREATE INDEX idx_jve_overrides_contractor ON public.jve_contractor_overrides(contractor_id);
CREATE INDEX idx_jve_sessions_user ON public.jve_calculator_sessions(user_id);
CREATE INDEX idx_jve_audit_session ON public.jve_estimation_audit_log(calculator_session_id);

-- =============================================
-- RLS
-- =============================================
ALTER TABLE public.jve_trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jve_trade_specialties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jve_regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jve_cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jve_trade_city_factors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jve_trade_value_benchmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jve_trade_performance_defaults ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jve_contractor_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jve_calculator_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jve_estimation_audit_log ENABLE ROW LEVEL SECURITY;

-- Public read for reference data
CREATE POLICY "Public read trades" ON public.jve_trades FOR SELECT USING (true);
CREATE POLICY "Public read specialties" ON public.jve_trade_specialties FOR SELECT USING (true);
CREATE POLICY "Public read regions" ON public.jve_regions FOR SELECT USING (true);
CREATE POLICY "Public read cities" ON public.jve_cities FOR SELECT USING (true);
CREATE POLICY "Public read city factors" ON public.jve_trade_city_factors FOR SELECT USING (true);
CREATE POLICY "Public read benchmarks" ON public.jve_trade_value_benchmarks FOR SELECT USING (true);
CREATE POLICY "Public read perf defaults" ON public.jve_trade_performance_defaults FOR SELECT USING (true);

-- Contractor overrides: owner or admin
CREATE POLICY "Contractor reads own overrides" ON public.jve_contractor_overrides
  FOR SELECT TO authenticated
  USING (
    contractor_id IN (SELECT id FROM public.contractors WHERE user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );
CREATE POLICY "Contractor manages own overrides" ON public.jve_contractor_overrides
  FOR ALL TO authenticated
  USING (
    contractor_id IN (SELECT id FROM public.contractors WHERE user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

-- Calculator sessions: auth insert, own read
CREATE POLICY "Auth insert sessions" ON public.jve_calculator_sessions
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Anon insert sessions" ON public.jve_calculator_sessions
  FOR INSERT TO anon WITH CHECK (user_id IS NULL);
CREATE POLICY "Users read own sessions" ON public.jve_calculator_sessions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Anon read anon sessions" ON public.jve_calculator_sessions
  FOR SELECT TO anon USING (user_id IS NULL);

-- Audit log: admin or session owner
CREATE POLICY "Admin reads audit" ON public.jve_estimation_audit_log
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR calculator_session_id IN (SELECT id FROM public.jve_calculator_sessions WHERE user_id = auth.uid())
  );

-- Admin write for reference tables
CREATE POLICY "Admin manage trades" ON public.jve_trades FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin manage specialties" ON public.jve_trade_specialties FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin manage regions" ON public.jve_regions FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin manage cities" ON public.jve_cities FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin manage city factors" ON public.jve_trade_city_factors FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin manage benchmarks" ON public.jve_trade_value_benchmarks FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin manage perf" ON public.jve_trade_performance_defaults FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin manage audit" ON public.jve_estimation_audit_log FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- VIEW: vw_trade_estimation_defaults
-- =============================================
CREATE OR REPLACE VIEW public.vw_jve_trade_estimation_defaults AS
SELECT
  t.slug AS trade_slug,
  ts.slug AS specialty_slug,
  NULL::text AS city_slug,
  b.default_avg_value AS estimated_avg_value,
  p.default_closing_rate AS estimated_closing_rate,
  p.default_profit_margin AS estimated_profit_margin,
  p.default_monthly_capacity AS estimated_capacity,
  b.confidence_score
FROM public.jve_trade_value_benchmarks b
JOIN public.jve_trades t ON t.id = b.trade_id
LEFT JOIN public.jve_trade_specialties ts ON ts.id = b.specialty_id
LEFT JOIN public.jve_trade_performance_defaults p ON p.trade_id = b.trade_id
  AND (p.specialty_id IS NOT DISTINCT FROM b.specialty_id);
