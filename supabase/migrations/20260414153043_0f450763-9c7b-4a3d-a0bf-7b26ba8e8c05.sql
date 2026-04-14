
-- Table: landing_visits
CREATE TABLE public.landing_visits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT,
  page_key TEXT NOT NULL DEFAULT 'contractor_voice_landing',
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  referrer TEXT,
  device_type TEXT,
  visited_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_landing_visits_session ON public.landing_visits(session_id);
CREATE INDEX idx_landing_visits_page ON public.landing_visits(page_key);

ALTER TABLE public.landing_visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access on landing_visits"
  ON public.landing_visits FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Allow anon inserts for tracking
CREATE POLICY "Anon can insert landing_visits"
  ON public.landing_visits FOR INSERT
  TO anon
  WITH CHECK (true);

-- Table: onboarding_entry_events
CREATE TABLE public.onboarding_entry_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  prospect_id UUID REFERENCES public.contractors_prospects(id) ON DELETE SET NULL,
  entry_mode TEXT NOT NULL DEFAULT 'voice',
  source_channel TEXT,
  event_type TEXT NOT NULL DEFAULT 'entry',
  event_payload_json JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.onboarding_entry_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access on onboarding_entry_events"
  ON public.onboarding_entry_events FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anon can insert onboarding_entry_events"
  ON public.onboarding_entry_events FOR INSERT
  TO anon
  WITH CHECK (true);

-- Table: onboarding_conversion_events
CREATE TABLE public.onboarding_conversion_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT,
  contractor_id UUID,
  plan_session_id UUID,
  conversion_stage TEXT NOT NULL DEFAULT 'landed',
  conversion_value NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.onboarding_conversion_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access on onboarding_conversion_events"
  ON public.onboarding_conversion_events FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anon can insert onboarding_conversion_events"
  ON public.onboarding_conversion_events FOR INSERT
  TO anon
  WITH CHECK (true);
