
-- Alter intent_sessions to add missing columns
ALTER TABLE public.intent_sessions
  ADD COLUMN IF NOT EXISTS raw_input text,
  ADD COLUMN IF NOT EXISTS detected_intent text,
  ADD COLUMN IF NOT EXISTS confidence_score numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS input_type text DEFAULT 'text',
  ADD COLUMN IF NOT EXISTS context_json jsonb DEFAULT '{}'::jsonb;

-- intent_answers
CREATE TABLE public.intent_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.intent_sessions(id) ON DELETE CASCADE,
  question text NOT NULL,
  answer text,
  weight numeric DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.intent_answers ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_intent_answers_session ON public.intent_answers(session_id);

CREATE POLICY "Users manage own intent answers" ON public.intent_answers
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.intent_sessions s WHERE s.id = session_id AND s.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.intent_sessions s WHERE s.id = session_id AND s.user_id = auth.uid())
  );

CREATE POLICY "Admins full access intent_answers" ON public.intent_answers
  FOR ALL USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- match_scores
CREATE TABLE public.match_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.intent_sessions(id) ON DELETE CASCADE,
  contractor_id uuid NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
  score numeric NOT NULL DEFAULT 0,
  breakdown_json jsonb DEFAULT '{}'::jsonb,
  rank integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.match_scores ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_match_scores_session ON public.match_scores(session_id);
CREATE INDEX idx_match_scores_contractor ON public.match_scores(contractor_id);

CREATE POLICY "Users view own match scores" ON public.match_scores
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.intent_sessions s WHERE s.id = session_id AND s.user_id = auth.uid())
  );

CREATE POLICY "Admins full access match_scores" ON public.match_scores
  FOR ALL USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- booking_requests
CREATE TABLE public.booking_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  contractor_id uuid NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
  session_id uuid REFERENCES public.intent_sessions(id) ON DELETE SET NULL,
  time_slot timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.booking_requests ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_booking_requests_user ON public.booking_requests(user_id);
CREATE INDEX idx_booking_requests_contractor ON public.booking_requests(contractor_id);
CREATE INDEX idx_booking_requests_status ON public.booking_requests(status);

CREATE POLICY "Users manage own booking requests" ON public.booking_requests
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins full access booking_requests" ON public.booking_requests
  FOR ALL USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- user_profiles_extended
CREATE TABLE public.user_profiles_extended (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  address text,
  phone text,
  city text,
  property_type text,
  preferences_json jsonb DEFAULT '{}'::jsonb,
  constraints_json jsonb DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.user_profiles_extended ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own extended profile" ON public.user_profiles_extended
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins full access user_profiles_extended" ON public.user_profiles_extended
  FOR ALL USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- scarcity_tracker
CREATE TABLE public.scarcity_tracker (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city_slug text NOT NULL,
  category_slug text NOT NULL,
  total_slots integer NOT NULL DEFAULT 5,
  filled_slots integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(city_slug, category_slug)
);
ALTER TABLE public.scarcity_tracker ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read scarcity" ON public.scarcity_tracker
  FOR SELECT USING (true);

CREATE POLICY "Admins manage scarcity" ON public.scarcity_tracker
  FOR ALL USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- live_activity_events
CREATE TABLE public.live_activity_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL DEFAULT 'booking',
  city text,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.live_activity_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read activity events" ON public.live_activity_events
  FOR SELECT USING (true);

CREATE POLICY "Admins manage activity events" ON public.live_activity_events
  FOR ALL USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Enable realtime on live_activity_events
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_activity_events;
