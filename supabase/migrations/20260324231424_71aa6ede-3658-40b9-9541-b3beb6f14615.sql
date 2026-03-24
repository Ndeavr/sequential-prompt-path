
-- market_leads: raw lead intake
CREATE TABLE public.market_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL DEFAULT 'organic',
  homeowner_user_id uuid,
  contractor_id uuid,
  city_slug text,
  trade_slug text,
  specialty_slug text,
  project_category text,
  urgency_level text DEFAULT 'normal',
  budget_range text,
  timeline text,
  property_type text,
  description text,
  contact_preference text,
  referral_source text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  session_id uuid,
  intake_metadata jsonb DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- market_lead_predictions: rule-based prediction output
CREATE TABLE public.market_lead_predictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.market_leads(id) ON DELETE CASCADE,
  predicted_contract_value numeric NOT NULL DEFAULT 0,
  predicted_profit_value numeric NOT NULL DEFAULT 0,
  predicted_close_probability numeric NOT NULL DEFAULT 0,
  predicted_show_probability numeric NOT NULL DEFAULT 0,
  predicted_time_to_close_days integer NOT NULL DEFAULT 14,
  predicted_abandon_probability numeric NOT NULL DEFAULT 0,
  predicted_lead_quality_score numeric NOT NULL DEFAULT 0,
  predicted_routing_priority integer NOT NULL DEFAULT 5,
  predicted_pricing_sensitivity text DEFAULT 'medium',
  predicted_best_offer_type text DEFAULT 'standard',
  predicted_next_best_action text DEFAULT 'contact',
  confidence_score numeric NOT NULL DEFAULT 0.5,
  reasoning_json jsonb DEFAULT '[]'::jsonb,
  model_version text NOT NULL DEFAULT 'v1_rules',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- market_lead_risk_scores: risk breakdown
CREATE TABLE public.market_lead_risk_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.market_leads(id) ON DELETE CASCADE,
  no_show_risk numeric DEFAULT 0,
  price_objection_risk numeric DEFAULT 0,
  competitor_loss_risk numeric DEFAULT 0,
  scope_creep_risk numeric DEFAULT 0,
  delay_risk numeric DEFAULT 0,
  overall_risk_score numeric DEFAULT 0,
  risk_level text DEFAULT 'low',
  mitigation_suggestions jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- market_next_best_actions: recommended actions queue
CREATE TABLE public.market_next_best_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.market_leads(id) ON DELETE CASCADE,
  action_type text NOT NULL,
  action_label text NOT NULL,
  action_description text,
  priority integer NOT NULL DEFAULT 5,
  reasoning text,
  status text NOT NULL DEFAULT 'pending',
  executed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- market_feedback_events: outcome tracking for model improvement
CREATE TABLE public.market_feedback_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.market_leads(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  event_value text,
  actual_contract_value numeric,
  actual_close_days integer,
  actual_show boolean,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_market_leads_status ON public.market_leads(status);
CREATE INDEX idx_market_leads_city ON public.market_leads(city_slug);
CREATE INDEX idx_market_leads_trade ON public.market_leads(trade_slug);
CREATE INDEX idx_market_leads_created ON public.market_leads(created_at DESC);
CREATE INDEX idx_market_lead_predictions_lead ON public.market_lead_predictions(lead_id);
CREATE INDEX idx_market_lead_predictions_quality ON public.market_lead_predictions(predicted_lead_quality_score DESC);
CREATE INDEX idx_market_lead_risk_scores_lead ON public.market_lead_risk_scores(lead_id);
CREATE INDEX idx_market_next_best_actions_lead ON public.market_next_best_actions(lead_id);
CREATE INDEX idx_market_next_best_actions_status ON public.market_next_best_actions(status);
CREATE INDEX idx_market_feedback_events_lead ON public.market_feedback_events(lead_id);

-- RLS
ALTER TABLE public.market_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_lead_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_lead_risk_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_next_best_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_feedback_events ENABLE ROW LEVEL SECURITY;

-- Admin-only policies
CREATE POLICY "admin_market_leads" ON public.market_leads FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_market_lead_predictions" ON public.market_lead_predictions FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_market_lead_risk_scores" ON public.market_lead_risk_scores FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_market_next_best_actions" ON public.market_next_best_actions FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_market_feedback_events" ON public.market_feedback_events FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Service role insert for edge functions
CREATE POLICY "service_insert_market_leads" ON public.market_leads FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "service_insert_predictions" ON public.market_lead_predictions FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "service_insert_risk_scores" ON public.market_lead_risk_scores FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "service_insert_actions" ON public.market_next_best_actions FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "service_insert_feedback" ON public.market_feedback_events FOR INSERT TO service_role WITH CHECK (true);
