
-- Sales closer new tables (keeping existing entrepreneur_goals, entrepreneur_plan_recommendations, entrepreneur_revenue_projections intact)

-- Add sales_session_id to existing tables
ALTER TABLE public.entrepreneur_goals ADD COLUMN IF NOT EXISTS sales_session_id uuid;
ALTER TABLE public.entrepreneur_plan_recommendations ADD COLUMN IF NOT EXISTS sales_session_id uuid;
ALTER TABLE public.entrepreneur_revenue_projections ADD COLUMN IF NOT EXISTS sales_session_id uuid;

-- New tables only
CREATE TABLE IF NOT EXISTS public.alex_sales_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  session_token text UNIQUE NOT NULL,
  language text NOT NULL DEFAULT 'fr',
  locale_code text NOT NULL DEFAULT 'fr-FR',
  role_detected text NOT NULL DEFAULT 'entrepreneur',
  current_step text NOT NULL DEFAULT 'diagnostic',
  service_type text,
  city text,
  growth_goal text,
  target_revenue numeric,
  avg_job_value numeric,
  capacity_per_month integer,
  recommended_plan text,
  selected_plan text,
  checkout_ready boolean DEFAULT false,
  paid boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add FK constraints after table exists
ALTER TABLE public.entrepreneur_goals ADD CONSTRAINT fk_goals_sales_session FOREIGN KEY (sales_session_id) REFERENCES public.alex_sales_sessions(id) ON DELETE SET NULL;
ALTER TABLE public.entrepreneur_plan_recommendations ADD CONSTRAINT fk_plan_rec_sales_session FOREIGN KEY (sales_session_id) REFERENCES public.alex_sales_sessions(id) ON DELETE SET NULL;
ALTER TABLE public.entrepreneur_revenue_projections ADD CONSTRAINT fk_rev_proj_sales_session FOREIGN KEY (sales_session_id) REFERENCES public.alex_sales_sessions(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.alex_sales_objections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_session_id uuid REFERENCES public.alex_sales_sessions(id) ON DELETE CASCADE,
  objection_type text NOT NULL,
  detected_text text,
  response_used text,
  resolved boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.alex_sales_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_session_id uuid REFERENCES public.alex_sales_sessions(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  event_status text,
  payload jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.alex_sales_conversion_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_session_id uuid REFERENCES public.alex_sales_sessions(id) ON DELETE CASCADE,
  intent_score numeric(5,2) DEFAULT 0,
  trust_score numeric(5,2) DEFAULT 0,
  urgency_score numeric(5,2) DEFAULT 0,
  objection_risk_score numeric(5,2) DEFAULT 0,
  checkout_readiness_score numeric(5,2) DEFAULT 0,
  payment_probability_score numeric(5,2) DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.alex_sales_checkout_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_session_id uuid REFERENCES public.alex_sales_sessions(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  recommended_plan text,
  selected_plan text,
  billing_cycle text DEFAULT 'monthly',
  coupon_code text,
  projected_value jsonb DEFAULT '{}'::jsonb,
  checkout_status text NOT NULL DEFAULT 'draft',
  stripe_checkout_session_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.alex_sales_activation_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_session_id uuid REFERENCES public.alex_sales_sessions(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  activation_step text NOT NULL,
  step_status text NOT NULL,
  payload jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.alex_sales_prompt_performance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  locale_code text NOT NULL,
  role_key text NOT NULL DEFAULT 'entrepreneur',
  prompt_style text NOT NULL,
  sessions_count integer DEFAULT 0,
  checkout_open_rate numeric(5,2) DEFAULT 0,
  payment_rate numeric(5,2) DEFAULT 0,
  objection_resolution_rate numeric(5,2) DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE public.alex_sales_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alex_sales_objections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alex_sales_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alex_sales_conversion_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alex_sales_checkout_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alex_sales_activation_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alex_sales_prompt_performance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own sales sessions" ON public.alex_sales_sessions FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Anon insert sales sessions" ON public.alex_sales_sessions FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Auth insert sales sessions" ON public.alex_sales_sessions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users update own sales sessions" ON public.alex_sales_sessions FOR UPDATE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Read own objections" ON public.alex_sales_objections FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.alex_sales_sessions s WHERE s.id = sales_session_id AND s.user_id = auth.uid()));
CREATE POLICY "Insert objections anon" ON public.alex_sales_objections FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Insert objections auth" ON public.alex_sales_objections FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Read own events" ON public.alex_sales_events FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.alex_sales_sessions s WHERE s.id = sales_session_id AND s.user_id = auth.uid()));
CREATE POLICY "Insert events anon" ON public.alex_sales_events FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Insert events auth" ON public.alex_sales_events FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Read own scores" ON public.alex_sales_conversion_scores FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.alex_sales_sessions s WHERE s.id = sales_session_id AND s.user_id = auth.uid()));
CREATE POLICY "Insert scores anon" ON public.alex_sales_conversion_scores FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Insert scores auth" ON public.alex_sales_conversion_scores FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Read own checkout drafts" ON public.alex_sales_checkout_drafts FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Insert checkout drafts anon" ON public.alex_sales_checkout_drafts FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Insert checkout drafts auth" ON public.alex_sales_checkout_drafts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Update own checkout drafts" ON public.alex_sales_checkout_drafts FOR UPDATE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Read own activation" ON public.alex_sales_activation_events FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Insert activation anon" ON public.alex_sales_activation_events FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Insert activation auth" ON public.alex_sales_activation_events FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Read prompt perf" ON public.alex_sales_prompt_performance FOR SELECT TO authenticated USING (true);
CREATE POLICY "Insert prompt perf" ON public.alex_sales_prompt_performance FOR INSERT TO anon WITH CHECK (true);
