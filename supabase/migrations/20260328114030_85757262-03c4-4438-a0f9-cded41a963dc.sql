
-- Helper functions for UNPRO foundation
-- =====================================

-- 1. current_profile_id() — returns the profile ID for the current auth user
CREATE OR REPLACE FUNCTION public.current_profile_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

-- 2. is_admin() — shorthand to check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'admin');
$$;

-- 3. owns_contractor(_contractor_id) — check if current user owns a contractor profile
CREATE OR REPLACE FUNCTION public.owns_contractor(_contractor_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.contractors
    WHERE id = _contractor_id AND user_id = auth.uid()
  );
$$;

-- 4. current_contractor_id() — returns the contractor ID for the current auth user
CREATE OR REPLACE FUNCTION public.current_contractor_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.contractors WHERE user_id = auth.uid() LIMIT 1;
$$;

-- 5. Owner match flow tables
CREATE TABLE IF NOT EXISTS public.owner_match_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  session_token text NOT NULL DEFAULT gen_random_uuid()::text,
  entry_mode text NOT NULL DEFAULT 'text' CHECK (entry_mode IN ('photo','voice','text')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','matched','booked','expired','abandoned')),
  detected_problem_type text,
  detected_urgency text CHECK (detected_urgency IN ('low','medium','high','emergency')),
  project_summary text,
  city text,
  recommended_contractor_id uuid,
  login_gate_shown boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.owner_match_inputs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.owner_match_sessions(id) ON DELETE CASCADE,
  input_type text NOT NULL CHECK (input_type IN ('text','voice_transcript','photo_description')),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.owner_match_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.owner_match_sessions(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  ai_description text,
  ai_detected_categories text[],
  ai_urgency_signal text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.owner_match_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.owner_match_sessions(id) ON DELETE CASCADE,
  contractor_id uuid REFERENCES public.contractors(id),
  rank integer NOT NULL DEFAULT 1,
  match_score numeric DEFAULT 0,
  match_reasons jsonb DEFAULT '[]',
  is_top_fit boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.owner_match_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.owner_match_sessions(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.owner_match_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.owner_match_inputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.owner_match_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.owner_match_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.owner_match_events ENABLE ROW LEVEL SECURITY;

-- Public insert (guest users can create sessions)
CREATE POLICY "Anyone can create match sessions" ON public.owner_match_sessions FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Users can view own match sessions" ON public.owner_match_sessions FOR SELECT TO anon, authenticated USING (
  session_token IS NOT NULL OR user_id = auth.uid() OR public.is_admin()
);
CREATE POLICY "Users can update own match sessions" ON public.owner_match_sessions FOR UPDATE TO anon, authenticated USING (
  session_token IS NOT NULL OR user_id = auth.uid() OR public.is_admin()
);

CREATE POLICY "Anyone can insert match inputs" ON public.owner_match_inputs FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Anyone can read match inputs" ON public.owner_match_inputs FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Anyone can insert match photos" ON public.owner_match_photos FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Anyone can read match photos" ON public.owner_match_photos FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Anyone can read match recommendations" ON public.owner_match_recommendations FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "System can insert match recommendations" ON public.owner_match_recommendations FOR INSERT TO authenticated WITH CHECK (public.is_admin());

CREATE POLICY "Anyone can insert match events" ON public.owner_match_events FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Admins can read match events" ON public.owner_match_events FOR SELECT TO authenticated USING (public.is_admin());

-- Triggers
CREATE TRIGGER set_owner_match_sessions_updated_at BEFORE UPDATE ON public.owner_match_sessions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_owner_match_sessions_user ON public.owner_match_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_owner_match_sessions_token ON public.owner_match_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_owner_match_inputs_session ON public.owner_match_inputs(session_id);
CREATE INDEX IF NOT EXISTS idx_owner_match_photos_session ON public.owner_match_photos(session_id);
CREATE INDEX IF NOT EXISTS idx_owner_match_recs_session ON public.owner_match_recommendations(session_id);
CREATE INDEX IF NOT EXISTS idx_owner_match_events_session ON public.owner_match_events(session_id);
