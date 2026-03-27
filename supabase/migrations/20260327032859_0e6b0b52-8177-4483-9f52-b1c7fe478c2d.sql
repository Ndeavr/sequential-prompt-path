
-- entrepreneur_leads (funnel entry)
CREATE TABLE IF NOT EXISTS public.entrepreneur_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name text NOT NULL,
  city text NOT NULL,
  website text,
  phone text,
  email text,
  source text DEFAULT 'funnel',
  session_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- entrepreneur_scores (AIPP quick scores)
CREATE TABLE IF NOT EXISTS public.entrepreneur_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.entrepreneur_leads(id) ON DELETE CASCADE,
  score integer NOT NULL DEFAULT 0,
  ai_visibility text DEFAULT 'faible',
  opportunities_min integer DEFAULT 0,
  opportunities_max integer DEFAULT 0,
  component_scores jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_entrepreneur_scores_lead ON public.entrepreneur_scores(lead_id);

-- outreach_logs
CREATE TABLE IF NOT EXISTS public.outreach_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES public.entrepreneur_leads(id) ON DELETE SET NULL,
  email_sent boolean DEFAULT false,
  opened boolean DEFAULT false,
  clicked boolean DEFAULT false,
  converted boolean DEFAULT false,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.entrepreneur_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entrepreneur_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outreach_logs ENABLE ROW LEVEL SECURITY;

-- Public insert for leads (anonymous users can submit)
CREATE POLICY "anyone_can_insert_leads" ON public.entrepreneur_leads FOR INSERT WITH CHECK (true);
CREATE POLICY "service_role_leads_all" ON public.entrepreneur_leads FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "anyone_can_insert_scores" ON public.entrepreneur_scores FOR INSERT WITH CHECK (true);
CREATE POLICY "anyone_can_read_own_scores" ON public.entrepreneur_scores FOR SELECT USING (true);
CREATE POLICY "service_role_scores_all" ON public.entrepreneur_scores FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "service_role_outreach_all" ON public.outreach_logs FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
