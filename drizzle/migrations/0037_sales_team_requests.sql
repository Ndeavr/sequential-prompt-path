CREATE TABLE public.sales_team_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key text NOT NULL UNIQUE,
  company text NOT NULL,
  website text,
  role text NOT NULL CHECK (role IN ('seller','sales_director','owner')),
  sellers_count integer NOT NULL CHECK (sellers_count BETWEEN 1 AND 500),
  specialties text NOT NULL,
  priority_mandates text,
  refused_mandates text,
  territories text NOT NULL,
  travel_radius_km integer CHECK (travel_radius_km IS NULL OR travel_radius_km BETWEEN 1 AND 1000),
  objectives text[] NOT NULL DEFAULT '{}',
  annual_revenue_goal_cad numeric CHECK (annual_revenue_goal_cad IS NULL OR annual_revenue_goal_cad BETWEEN 0 AND 100000000),
  weekly_capacity integer CHECK (weekly_capacity IS NULL OR weekly_capacity BETWEEN 1 AND 2000),
  average_ticket_cad numeric CHECK (average_ticket_cad IS NULL OR average_ticket_cad BETWEEN 1 AND 10000000),
  close_rate_pct numeric CHECK (close_rate_pct IS NULL OR close_rate_pct > 0 AND close_rate_pct <= 100),
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL,
  phone text,
  consent_text text NOT NULL,
  consented_at timestamptz NOT NULL DEFAULT now(),
  marketing_opt_in boolean NOT NULL DEFAULT false,
  utm jsonb NOT NULL DEFAULT '{}'::jsonb,
  locale text,
  ip_hash text,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','contacted','qualified','declined','archived')),
  is_synthetic boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.sales_team_requests TO authenticated;
GRANT ALL ON public.sales_team_requests TO service_role;
ALTER TABLE public.sales_team_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read sales team requests" ON public.sales_team_requests
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update sales team requests" ON public.sales_team_requests
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE INDEX sales_team_requests_ip_recent ON public.sales_team_requests (ip_hash, created_at DESC);