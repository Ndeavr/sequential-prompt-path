
-- Sessions table
CREATE TABLE public.self_serve_goal_plan_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id text,
  city text,
  category text,
  status text NOT NULL DEFAULT 'started',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.self_serve_goal_plan_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can insert sessions" ON public.self_serve_goal_plan_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can read own session" ON public.self_serve_goal_plan_sessions FOR SELECT USING (true);
CREATE POLICY "Anyone can update sessions" ON public.self_serve_goal_plan_sessions FOR UPDATE USING (true);

-- Inputs table
CREATE TABLE public.self_serve_goal_plan_inputs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES public.self_serve_goal_plan_sessions(id) ON DELETE CASCADE NOT NULL,
  submissions_per_month integer,
  close_rate_percent numeric,
  avg_contract_value numeric,
  profit_margin_percent numeric,
  current_city text,
  current_category text,
  pre_unpro_score integer,
  revenue_target_monthly numeric,
  growth_target_percent numeric,
  appointments_capacity_weekly integer,
  preferred_project_size text,
  preferred_territory text,
  preferred_lead_quality text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.self_serve_goal_plan_inputs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can insert inputs" ON public.self_serve_goal_plan_inputs FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can read inputs" ON public.self_serve_goal_plan_inputs FOR SELECT USING (true);
CREATE POLICY "Anyone can update inputs" ON public.self_serve_goal_plan_inputs FOR UPDATE USING (true);

-- Results table
CREATE TABLE public.self_serve_goal_plan_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES public.self_serve_goal_plan_sessions(id) ON DELETE CASCADE NOT NULL,
  current_monthly_revenue numeric,
  current_monthly_profit numeric,
  projected_monthly_revenue_min numeric,
  projected_monthly_revenue_max numeric,
  projected_monthly_profit_min numeric,
  projected_monthly_profit_max numeric,
  lost_monthly_revenue_min numeric,
  lost_monthly_revenue_max numeric,
  lost_monthly_profit_min numeric,
  lost_monthly_profit_max numeric,
  required_appointments_monthly integer,
  required_appointments_weekly numeric,
  appointment_mix_json jsonb,
  recommended_plan text,
  plan_match_confidence numeric,
  territory_status text,
  exclusivity_possible boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.self_serve_goal_plan_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can insert results" ON public.self_serve_goal_plan_results FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can read results" ON public.self_serve_goal_plan_results FOR SELECT USING (true);

-- CTA events
CREATE TABLE public.self_serve_goal_plan_cta_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES public.self_serve_goal_plan_sessions(id) ON DELETE CASCADE,
  cta_key text NOT NULL,
  page_section text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.self_serve_goal_plan_cta_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can insert cta events" ON public.self_serve_goal_plan_cta_events FOR INSERT WITH CHECK (true);

-- City checks
CREATE TABLE public.self_serve_goal_plan_city_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES public.self_serve_goal_plan_sessions(id) ON DELETE CASCADE,
  city text NOT NULL,
  category text,
  territory_status text,
  checked_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.self_serve_goal_plan_city_checks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can insert city checks" ON public.self_serve_goal_plan_city_checks FOR INSERT WITH CHECK (true);
