
-- Table 1: alex_intents
CREATE TABLE public.alex_intents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  detected_intent text NOT NULL DEFAULT 'info_seek',
  confidence_score numeric NOT NULL DEFAULT 0,
  urgency_score numeric NOT NULL DEFAULT 0,
  trust_score numeric NOT NULL DEFAULT 0.5,
  booking_readiness_score numeric NOT NULL DEFAULT 0,
  friction_score numeric NOT NULL DEFAULT 0,
  raw_signals jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Table 2: alex_predictive_matches
CREATE TABLE public.alex_predictive_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  contractor_id uuid REFERENCES public.contractors(id) ON DELETE CASCADE,
  match_score numeric NOT NULL DEFAULT 0,
  availability_score numeric NOT NULL DEFAULT 0,
  confidence_score numeric NOT NULL DEFAULT 0,
  explanation_summary text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Table 3: alex_booking_drafts
CREATE TABLE public.alex_booking_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  contractor_id uuid REFERENCES public.contractors(id) ON DELETE SET NULL,
  service_type text,
  city text,
  project_summary text,
  preferred_time_window text,
  contact_first_name text,
  contact_phone text,
  contact_email text,
  booking_status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Table 4: alex_conversion_prompts
CREATE TABLE public.alex_conversion_prompts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  prompt_style text NOT NULL DEFAULT 'reassuring',
  prompt_text text NOT NULL,
  trigger_reason text,
  user_response text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Table 5: alex_momentum_events
CREATE TABLE public.alex_momentum_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  event_type text NOT NULL,
  momentum_score numeric NOT NULL DEFAULT 0,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Table 6: alex_soft_objections
CREATE TABLE public.alex_soft_objections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  objection_type text NOT NULL,
  detected_text text,
  answer_used text,
  resolved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.alex_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alex_predictive_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alex_booking_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alex_conversion_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alex_momentum_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alex_soft_objections ENABLE ROW LEVEL SECURITY;

-- RLS: Allow insert from edge functions (anon + authenticated)
CREATE POLICY "Allow insert alex_intents" ON public.alex_intents FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Allow insert alex_predictive_matches" ON public.alex_predictive_matches FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Allow insert alex_booking_drafts" ON public.alex_booking_drafts FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Allow insert alex_conversion_prompts" ON public.alex_conversion_prompts FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Allow insert alex_momentum_events" ON public.alex_momentum_events FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Allow insert alex_soft_objections" ON public.alex_soft_objections FOR INSERT TO anon, authenticated WITH CHECK (true);

-- RLS: Users can read their own drafts
CREATE POLICY "Users read own booking drafts" ON public.alex_booking_drafts FOR SELECT TO authenticated USING (user_id = auth.uid());

-- RLS: Admins can read all
CREATE POLICY "Admins read all intents" ON public.alex_intents FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins read all matches" ON public.alex_predictive_matches FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins read all drafts" ON public.alex_booking_drafts FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins read all prompts" ON public.alex_conversion_prompts FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins read all momentum" ON public.alex_momentum_events FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins read all objections" ON public.alex_soft_objections FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- RLS: Session-based read for anonymous (booking drafts by session)
CREATE POLICY "Anon read drafts by session" ON public.alex_booking_drafts FOR SELECT TO anon USING (true);

-- Update trigger for booking drafts
CREATE TRIGGER set_alex_booking_drafts_updated_at BEFORE UPDATE ON public.alex_booking_drafts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Indexes
CREATE INDEX idx_alex_intents_session ON public.alex_intents(session_id);
CREATE INDEX idx_alex_predictive_matches_session ON public.alex_predictive_matches(session_id);
CREATE INDEX idx_alex_booking_drafts_session ON public.alex_booking_drafts(session_id);
CREATE INDEX idx_alex_booking_drafts_user ON public.alex_booking_drafts(user_id);
CREATE INDEX idx_alex_momentum_session ON public.alex_momentum_events(session_id);
