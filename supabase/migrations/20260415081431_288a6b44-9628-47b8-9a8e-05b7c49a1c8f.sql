
-- outbound_clicks
CREATE TABLE IF NOT EXISTS public.outbound_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid,
  token text NOT NULL,
  source_email_id text,
  landing_url text,
  user_agent text,
  clicked_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.outbound_clicks ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_outbound_clicks_token ON public.outbound_clicks(token);
CREATE INDEX idx_outbound_clicks_company ON public.outbound_clicks(company_id);

-- Public insert (prospects clicking from email are unauthenticated)
CREATE POLICY "Anyone can log clicks" ON public.outbound_clicks FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins view clicks" ON public.outbound_clicks FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- booking_sessions
CREATE TABLE IF NOT EXISTS public.booking_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid,
  lead_id uuid REFERENCES public.contractor_leads(id),
  company_name text,
  city text,
  category text,
  scheduled_at timestamptz,
  status text NOT NULL DEFAULT 'pending',
  alex_session_id text,
  token text,
  metadata_json jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.booking_sessions ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_booking_sessions_token ON public.booking_sessions(token);
CREATE INDEX idx_booking_sessions_status ON public.booking_sessions(status);

CREATE POLICY "Anyone can create booking sessions" ON public.booking_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can view their booking by token" ON public.booking_sessions FOR SELECT USING (true);
CREATE POLICY "Admins manage booking sessions" ON public.booking_sessions FOR ALL USING (public.has_role(auth.uid(), 'admin'));
