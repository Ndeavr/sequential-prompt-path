
-- Homeowner voice closer tables

CREATE TABLE public.alex_homeowner_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  session_token text UNIQUE NOT NULL,
  language text DEFAULT 'fr',
  locale_code text DEFAULT 'fr-FR',
  role_detected text DEFAULT 'homeowner',
  current_step text NOT NULL DEFAULT 'diagnosis',
  project_type text,
  city text,
  urgency_level text,
  primary_constraint text,
  recommended_contractor_id uuid,
  booking_ready boolean DEFAULT false,
  booking_submitted boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.homeowner_project_diagnoses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  homeowner_session_id uuid REFERENCES public.alex_homeowner_sessions(id) ON DELETE CASCADE NOT NULL,
  detected_project_type text,
  detected_city text,
  urgency_level text,
  recommended_professional_type text,
  diagnosis_payload jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.homeowner_match_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  homeowner_session_id uuid REFERENCES public.alex_homeowner_sessions(id) ON DELETE CASCADE NOT NULL,
  contractor_id uuid,
  match_score numeric(5,2) NOT NULL DEFAULT 0,
  confidence_score numeric(5,2) NOT NULL DEFAULT 0,
  explanation_summary text,
  is_primary boolean DEFAULT false,
  recommendation_payload jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.alex_homeowner_objections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  homeowner_session_id uuid REFERENCES public.alex_homeowner_sessions(id) ON DELETE CASCADE NOT NULL,
  objection_type text NOT NULL,
  detected_text text,
  response_used text,
  resolved boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.alex_homeowner_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  homeowner_session_id uuid REFERENCES public.alex_homeowner_sessions(id) ON DELETE CASCADE NOT NULL,
  event_type text NOT NULL,
  event_status text,
  payload jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.alex_homeowner_booking_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  homeowner_session_id uuid REFERENCES public.alex_homeowner_sessions(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  contractor_id uuid,
  service_type text,
  city text,
  project_summary text,
  urgency_level text,
  preferred_time_window text,
  contact_first_name text,
  contact_phone text,
  contact_email text,
  booking_status text NOT NULL DEFAULT 'draft',
  calendar_payload jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.alex_homeowner_conversion_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  homeowner_session_id uuid REFERENCES public.alex_homeowner_sessions(id) ON DELETE CASCADE NOT NULL,
  intent_score numeric(5,2) DEFAULT 0,
  trust_score numeric(5,2) DEFAULT 0,
  urgency_score numeric(5,2) DEFAULT 0,
  objection_risk_score numeric(5,2) DEFAULT 0,
  booking_readiness_score numeric(5,2) DEFAULT 0,
  booking_probability_score numeric(5,2) DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.alex_homeowner_recovery_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  homeowner_session_id uuid REFERENCES public.alex_homeowner_sessions(id) ON DELETE CASCADE NOT NULL,
  first_name text,
  phone text NOT NULL,
  email text,
  project_type text,
  city text,
  status text NOT NULL DEFAULT 'pending',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.alex_homeowner_prompt_performance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  locale_code text NOT NULL,
  role_key text NOT NULL DEFAULT 'homeowner',
  prompt_style text NOT NULL,
  sessions_count integer DEFAULT 0,
  recommendation_rate numeric(5,2) DEFAULT 0,
  calendar_open_rate numeric(5,2) DEFAULT 0,
  contact_capture_rate numeric(5,2) DEFAULT 0,
  booking_rate numeric(5,2) DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE public.alex_homeowner_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homeowner_project_diagnoses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homeowner_match_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alex_homeowner_objections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alex_homeowner_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alex_homeowner_booking_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alex_homeowner_conversion_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alex_homeowner_recovery_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alex_homeowner_prompt_performance ENABLE ROW LEVEL SECURITY;

-- Public insert for guest sessions
CREATE POLICY "Allow anon insert homeowner sessions" ON public.alex_homeowner_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Users read own homeowner sessions" ON public.alex_homeowner_sessions FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Users update own homeowner sessions" ON public.alex_homeowner_sessions FOR UPDATE USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Insert homeowner diagnoses" ON public.homeowner_project_diagnoses FOR INSERT WITH CHECK (true);
CREATE POLICY "Read homeowner diagnoses" ON public.homeowner_project_diagnoses FOR SELECT USING (true);

CREATE POLICY "Insert homeowner recommendations" ON public.homeowner_match_recommendations FOR INSERT WITH CHECK (true);
CREATE POLICY "Read homeowner recommendations" ON public.homeowner_match_recommendations FOR SELECT USING (true);

CREATE POLICY "Insert homeowner objections" ON public.alex_homeowner_objections FOR INSERT WITH CHECK (true);
CREATE POLICY "Read homeowner objections" ON public.alex_homeowner_objections FOR SELECT USING (true);

CREATE POLICY "Insert homeowner events" ON public.alex_homeowner_events FOR INSERT WITH CHECK (true);
CREATE POLICY "Read homeowner events" ON public.alex_homeowner_events FOR SELECT USING (true);

CREATE POLICY "Insert homeowner booking drafts" ON public.alex_homeowner_booking_drafts FOR INSERT WITH CHECK (true);
CREATE POLICY "Read own homeowner booking drafts" ON public.alex_homeowner_booking_drafts FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Update own homeowner booking drafts" ON public.alex_homeowner_booking_drafts FOR UPDATE USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Insert homeowner conversion scores" ON public.alex_homeowner_conversion_scores FOR INSERT WITH CHECK (true);
CREATE POLICY "Read homeowner conversion scores" ON public.alex_homeowner_conversion_scores FOR SELECT USING (true);

CREATE POLICY "Insert homeowner recovery queue" ON public.alex_homeowner_recovery_queue FOR INSERT WITH CHECK (true);
CREATE POLICY "Read homeowner recovery queue" ON public.alex_homeowner_recovery_queue FOR SELECT USING (true);

CREATE POLICY "Admin read homeowner prompt perf" ON public.alex_homeowner_prompt_performance FOR SELECT USING (true);
CREATE POLICY "Admin insert homeowner prompt perf" ON public.alex_homeowner_prompt_performance FOR INSERT WITH CHECK (true);

-- Updated_at triggers
CREATE TRIGGER set_updated_at_homeowner_sessions BEFORE UPDATE ON public.alex_homeowner_sessions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at_homeowner_booking_drafts BEFORE UPDATE ON public.alex_homeowner_booking_drafts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at_homeowner_recovery_queue BEFORE UPDATE ON public.alex_homeowner_recovery_queue FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
