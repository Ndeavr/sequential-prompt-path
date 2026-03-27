CREATE TABLE IF NOT EXISTS public.recruitment_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text,
  email text,
  city text,
  experience_level text DEFAULT 'none',
  availability text DEFAULT 'summer',
  work_mode text DEFAULT 'in_person',
  motivation text,
  source text DEFAULT 'carriere_page',
  status text DEFAULT 'new',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.recruitment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES public.recruitment_leads(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.recruitment_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES public.recruitment_leads(id) ON DELETE CASCADE,
  score integer DEFAULT 0,
  reasoning text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.recruitment_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recruitment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recruitment_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit recruitment application"
  ON public.recruitment_leads FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can track recruitment events"
  ON public.recruitment_events FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can read recruitment leads"
  ON public.recruitment_leads FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can read recruitment events"
  ON public.recruitment_events FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can read recruitment scores"
  ON public.recruitment_scores FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can update recruitment leads"
  ON public.recruitment_leads FOR UPDATE TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert recruitment scores"
  ON public.recruitment_scores FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE INDEX idx_recruitment_leads_status ON public.recruitment_leads(status);
CREATE INDEX idx_recruitment_events_lead_id ON public.recruitment_events(lead_id);
CREATE INDEX idx_recruitment_scores_lead_id ON public.recruitment_scores(lead_id);