
-- Zone Value Scores
CREATE TABLE public.market_zone_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city_slug text NOT NULL,
  trade_slug text NOT NULL,
  zone_value_score numeric NOT NULL DEFAULT 0,
  demand_volume integer NOT NULL DEFAULT 0,
  avg_predicted_profit_cents integer NOT NULL DEFAULT 0,
  supply_scarcity_score numeric NOT NULL DEFAULT 0,
  competition_score numeric NOT NULL DEFAULT 0,
  conversion_frequency numeric NOT NULL DEFAULT 0,
  seasonality_factor numeric NOT NULL DEFAULT 1.0,
  exclusivity_eligible boolean NOT NULL DEFAULT false,
  suggested_premium_cents integer,
  revenue_projection_monthly_cents integer,
  justification_json jsonb DEFAULT '{}'::jsonb,
  computed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(city_slug, trade_slug)
);
ALTER TABLE public.market_zone_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage zone scores" ON public.market_zone_scores FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Zone Exclusivity Offers
CREATE TABLE public.market_zone_exclusivity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_score_id uuid REFERENCES public.market_zone_scores(id) ON DELETE CASCADE,
  city_slug text NOT NULL,
  trade_slug text NOT NULL,
  contractor_id uuid REFERENCES public.contractors(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'available',
  premium_price_cents integer NOT NULL DEFAULT 0,
  monthly_revenue_projection_cents integer,
  exclusivity_start timestamptz,
  exclusivity_end timestamptz,
  justification text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.market_zone_exclusivity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage exclusivity" ON public.market_zone_exclusivity FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Contractors see own exclusivity" ON public.market_zone_exclusivity FOR SELECT TO authenticated USING (contractor_id IN (SELECT id FROM public.contractors WHERE user_id = auth.uid()));

-- Contractor Outcomes (for feedback loop)
CREATE TABLE public.contractor_outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES public.market_leads(id) ON DELETE SET NULL,
  contractor_id uuid REFERENCES public.contractors(id) ON DELETE SET NULL,
  actual_contract_value_cents integer,
  actual_profit_cents integer,
  actual_close_probability numeric,
  actual_time_to_close_days integer,
  did_show boolean,
  did_close boolean,
  outcome_source text DEFAULT 'manual',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.contractor_outcomes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage outcomes" ON public.contractor_outcomes FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Indexes
CREATE INDEX idx_market_zone_scores_city ON public.market_zone_scores(city_slug);
CREATE INDEX idx_market_zone_scores_trade ON public.market_zone_scores(trade_slug);
CREATE INDEX idx_market_zone_scores_eligible ON public.market_zone_scores(exclusivity_eligible) WHERE exclusivity_eligible = true;
CREATE INDEX idx_market_zone_exclusivity_status ON public.market_zone_exclusivity(status);
CREATE INDEX idx_contractor_outcomes_lead ON public.contractor_outcomes(lead_id);
