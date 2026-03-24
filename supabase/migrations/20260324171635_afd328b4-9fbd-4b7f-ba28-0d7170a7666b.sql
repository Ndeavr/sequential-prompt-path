
-- Onboarding objectives
CREATE TABLE IF NOT EXISTS public.onboarding_objectives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid NOT NULL,
  primary_objective text NOT NULL,
  secondary_objectives_json jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.onboarding_objectives ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can insert objectives" ON public.onboarding_objectives FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can read own objectives" ON public.onboarding_objectives FOR SELECT USING (true);

-- Strategy recommendations
CREATE TABLE IF NOT EXISTS public.strategy_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid NOT NULL,
  strategy_type text NOT NULL,
  reasoning text,
  confidence_score numeric DEFAULT 0,
  action_plan_json jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.strategy_recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can insert strategy" ON public.strategy_recommendations FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can read strategy" ON public.strategy_recommendations FOR SELECT USING (true);

-- Revenue fit inputs
CREATE TABLE IF NOT EXISTS public.revenue_fit_inputs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid NOT NULL,
  target_revenue_amount numeric DEFAULT 0,
  average_job_value numeric DEFAULT 0,
  gross_margin_percent numeric DEFAULT 0,
  close_rate_percent numeric,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.revenue_fit_inputs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can insert revenue inputs" ON public.revenue_fit_inputs FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can read revenue inputs" ON public.revenue_fit_inputs FOR SELECT USING (true);

-- Revenue fit results
CREATE TABLE IF NOT EXISTS public.revenue_fit_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  input_id uuid REFERENCES public.revenue_fit_inputs(id),
  required_closed_jobs numeric DEFAULT 0,
  required_appointments numeric DEFAULT 0,
  recommended_plan_code text,
  fit_label text,
  reason_json jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.revenue_fit_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can insert revenue results" ON public.revenue_fit_results FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can read revenue results" ON public.revenue_fit_results FOR SELECT USING (true);

-- Plan recommendations
CREATE TABLE IF NOT EXISTS public.plan_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid NOT NULL,
  recommended_plan_code text NOT NULL,
  reason_summary text,
  reason_json jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.plan_recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can insert plan recs" ON public.plan_recommendations FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can read plan recs" ON public.plan_recommendations FOR SELECT USING (true);
