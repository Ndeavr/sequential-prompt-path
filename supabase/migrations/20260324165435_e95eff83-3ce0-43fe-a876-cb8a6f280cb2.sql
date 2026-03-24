
-- Lead capture sessions
CREATE TABLE public.lead_capture_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_channel text,
  campaign_name text,
  landing_variant text,
  device_type text,
  status text NOT NULL DEFAULT 'started',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.lead_capture_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can insert lead sessions" ON public.lead_capture_sessions FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Anyone can read own session" ON public.lead_capture_sessions FOR SELECT TO anon, authenticated USING (true);

-- AIPP score checks
CREATE TABLE public.aipp_score_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES public.lead_capture_sessions(id),
  business_name text NOT NULL,
  city text NOT NULL,
  website_url text,
  phone text,
  google_profile_url text,
  quick_score numeric DEFAULT 0,
  score_label text,
  market_position_label text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.aipp_score_checks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can insert aipp checks" ON public.aipp_score_checks FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Anyone can read aipp checks" ON public.aipp_score_checks FOR SELECT TO anon, authenticated USING (true);

-- Landing CTA events
CREATE TABLE public.landing_cta_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES public.lead_capture_sessions(id),
  event_name text NOT NULL,
  page_name text NOT NULL,
  metadata_json jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.landing_cta_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can insert cta events" ON public.landing_cta_events FOR INSERT TO anon, authenticated WITH CHECK (true);
