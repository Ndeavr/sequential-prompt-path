
-- Market Dynamic Prices
CREATE TABLE public.market_dynamic_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city_slug text NOT NULL,
  trade_slug text NOT NULL,
  specialty_slug text,
  base_cpl_cents integer NOT NULL DEFAULT 0,
  unpro_markup_percent numeric NOT NULL DEFAULT 30,
  base_price_cents integer NOT NULL DEFAULT 0,
  demand_multiplier numeric NOT NULL DEFAULT 1.0,
  seasonality_multiplier numeric NOT NULL DEFAULT 1.0,
  urgency_multiplier numeric NOT NULL DEFAULT 1.0,
  competition_multiplier numeric NOT NULL DEFAULT 1.0,
  scarcity_multiplier numeric NOT NULL DEFAULT 1.0,
  predicted_value_multiplier numeric NOT NULL DEFAULT 1.0,
  price_sensitivity_multiplier numeric NOT NULL DEFAULT 1.0,
  combined_multiplier numeric NOT NULL DEFAULT 1.0,
  final_price_cents integer NOT NULL DEFAULT 0,
  minimum_price_cents integer NOT NULL DEFAULT 500,
  maximum_price_cents integer NOT NULL DEFAULT 50000,
  justification_json jsonb DEFAULT '[]'::jsonb,
  valid_from timestamptz NOT NULL DEFAULT now(),
  valid_until timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  confidence_score integer NOT NULL DEFAULT 50,
  fallback_used boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_market_dynamic_prices_city ON public.market_dynamic_prices(city_slug);
CREATE INDEX idx_market_dynamic_prices_trade ON public.market_dynamic_prices(trade_slug);
CREATE INDEX idx_market_dynamic_prices_active ON public.market_dynamic_prices(is_active, valid_from);

ALTER TABLE public.market_dynamic_prices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_full_access_market_dynamic_prices" ON public.market_dynamic_prices FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "authenticated_read_market_dynamic_prices" ON public.market_dynamic_prices FOR SELECT TO authenticated USING (is_active = true);

-- Market Signal Snapshots
CREATE TABLE public.market_signal_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city_slug text NOT NULL,
  trade_slug text NOT NULL,
  specialty_slug text,
  signal_type text NOT NULL DEFAULT 'composite',
  demand_score numeric NOT NULL DEFAULT 50,
  supply_score numeric NOT NULL DEFAULT 50,
  competition_index numeric NOT NULL DEFAULT 1.0,
  seasonality_index numeric NOT NULL DEFAULT 1.0,
  urgency_index numeric NOT NULL DEFAULT 1.0,
  scarcity_index numeric NOT NULL DEFAULT 1.0,
  google_cpl_estimate_cents integer,
  active_contractors integer NOT NULL DEFAULT 0,
  active_leads integer NOT NULL DEFAULT 0,
  avg_close_rate numeric,
  avg_job_value_cents integer,
  signals_json jsonb DEFAULT '{}'::jsonb,
  snapshot_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_market_signal_snapshots_city ON public.market_signal_snapshots(city_slug);
CREATE INDEX idx_market_signal_snapshots_trade ON public.market_signal_snapshots(trade_slug);
CREATE INDEX idx_market_signal_snapshots_at ON public.market_signal_snapshots(snapshot_at DESC);

ALTER TABLE public.market_signal_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_full_access_market_signal_snapshots" ON public.market_signal_snapshots FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "authenticated_read_market_signal_snapshots" ON public.market_signal_snapshots FOR SELECT TO authenticated USING (true);

-- Price history served
CREATE TABLE public.market_price_served_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  price_id uuid REFERENCES public.market_dynamic_prices(id),
  contractor_id uuid,
  lead_id uuid,
  price_served_cents integer NOT NULL,
  context_json jsonb DEFAULT '{}'::jsonb,
  served_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_market_price_served_log_price ON public.market_price_served_log(price_id);
CREATE INDEX idx_market_price_served_log_at ON public.market_price_served_log(served_at DESC);

ALTER TABLE public.market_price_served_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_full_access_market_price_served_log" ON public.market_price_served_log FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
