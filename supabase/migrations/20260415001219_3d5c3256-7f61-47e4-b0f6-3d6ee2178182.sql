
-- Conversion events for adaptive homepage tracking
CREATE TABLE public.conversion_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  value TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.conversion_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert conversion events"
  ON public.conversion_events FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can read conversion events"
  ON public.conversion_events FOR SELECT
  USING (true);

CREATE INDEX idx_conversion_events_session ON public.conversion_events(session_id);

-- User pain points
CREATE TABLE public.user_pain_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  role TEXT NOT NULL,
  pain_selected TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_pain_points ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert pain points"
  ON public.user_pain_points FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can read pain points"
  ON public.user_pain_points FOR SELECT
  USING (true);

-- Adaptive sessions
CREATE TABLE public.adaptive_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  intent TEXT,
  pain_selected TEXT,
  current_variant TEXT,
  conversion_stage TEXT NOT NULL DEFAULT 'idle',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.adaptive_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert adaptive sessions"
  ON public.adaptive_sessions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can read adaptive sessions"
  ON public.adaptive_sessions FOR SELECT
  USING (true);

CREATE INDEX idx_adaptive_sessions_session ON public.adaptive_sessions(session_id);
