
-- ══════════════════════════════════════════════════
-- ALEX BACKEND ENGINE — Schema Migration
-- ══════════════════════════════════════════════════

-- 1. ALTER alex_sessions — add missing runtime columns
ALTER TABLE public.alex_sessions
  ADD COLUMN IF NOT EXISTS session_token text,
  ADD COLUMN IF NOT EXISTS role_detected text NOT NULL DEFAULT 'homeowner',
  ADD COLUMN IF NOT EXISTS language text NOT NULL DEFAULT 'fr',
  ADD COLUMN IF NOT EXISTS voice_locale text NOT NULL DEFAULT 'fr-QC',
  ADD COLUMN IF NOT EXISTS auth_state text NOT NULL DEFAULT 'guest',
  ADD COLUMN IF NOT EXISTS current_step text NOT NULL DEFAULT 'listening',
  ADD COLUMN IF NOT EXISTS project_type text,
  ADD COLUMN IF NOT EXISTS project_city text,
  ADD COLUMN IF NOT EXISTS project_summary text,
  ADD COLUMN IF NOT EXISTS recommended_contractor_id uuid,
  ADD COLUMN IF NOT EXISTS booking_intent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS no_result_state boolean NOT NULL DEFAULT false;

-- Generate unique session_token for existing rows
UPDATE public.alex_sessions SET session_token = id::text WHERE session_token IS NULL;
ALTER TABLE public.alex_sessions ALTER COLUMN session_token SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_alex_sessions_token ON public.alex_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_alex_sessions_auth ON public.alex_sessions(auth_state);
CREATE INDEX IF NOT EXISTS idx_alex_sessions_step ON public.alex_sessions(current_step);
CREATE INDEX IF NOT EXISTS idx_alex_sessions_city ON public.alex_sessions(project_city);

-- 2. ALTER alex_messages — add spoken_variant and latency
ALTER TABLE public.alex_messages
  ADD COLUMN IF NOT EXISTS spoken_variant text,
  ADD COLUMN IF NOT EXISTS latency_ms integer;

-- 3. ALTER alex_predictive_matches — add distance_score, trust_score, is_primary
ALTER TABLE public.alex_predictive_matches
  ADD COLUMN IF NOT EXISTS distance_score numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS trust_score numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_primary boolean NOT NULL DEFAULT false;

-- 4. ALTER alex_booking_drafts — add draft_source, calendar_payload
ALTER TABLE public.alex_booking_drafts
  ADD COLUMN IF NOT EXISTS draft_source text NOT NULL DEFAULT 'alex_predictive',
  ADD COLUMN IF NOT EXISTS calendar_payload jsonb NOT NULL DEFAULT '{}'::jsonb;

-- ══════════════════════════════════════════════════
-- NEW TABLES
-- ══════════════════════════════════════════════════

-- 5. alex_actions — system action journal
CREATE TABLE IF NOT EXISTS public.alex_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  action_type text NOT NULL,
  action_status text NOT NULL DEFAULT 'pending',
  trigger_source text NOT NULL DEFAULT 'system',
  ui_target text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.alex_actions ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_alex_actions_session ON public.alex_actions(session_id);
CREATE INDEX idx_alex_actions_type ON public.alex_actions(action_type);
CREATE POLICY "Insert alex_actions" ON public.alex_actions FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Admin read alex_actions" ON public.alex_actions FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 6. alex_no_result_events
CREATE TABLE IF NOT EXISTS public.alex_no_result_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  service_type text,
  city text,
  radius_attempted integer NOT NULL DEFAULT 0,
  fallback_used text,
  partial_matches_count integer NOT NULL DEFAULT 0,
  waitlist_created boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.alex_no_result_events ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_alex_no_result_session ON public.alex_no_result_events(session_id);
CREATE POLICY "Insert alex_no_result" ON public.alex_no_result_events FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Admin read alex_no_result" ON public.alex_no_result_events FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 7. alex_waitlist_queue
CREATE TABLE IF NOT EXISTS public.alex_waitlist_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  first_name text,
  phone text NOT NULL,
  email text,
  project_type text,
  city text,
  status text NOT NULL DEFAULT 'pending',
  assigned_admin uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.alex_waitlist_queue ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_alex_waitlist_status ON public.alex_waitlist_queue(status);
CREATE POLICY "Insert alex_waitlist" ON public.alex_waitlist_queue FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Admin read alex_waitlist" ON public.alex_waitlist_queue FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin update alex_waitlist" ON public.alex_waitlist_queue FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER set_alex_waitlist_updated_at BEFORE UPDATE ON public.alex_waitlist_queue FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 8. alex_response_latency
CREATE TABLE IF NOT EXISTS public.alex_response_latency (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  event_name text NOT NULL,
  latency_ms integer NOT NULL,
  is_sla_respected boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.alex_response_latency ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_alex_latency_session ON public.alex_response_latency(session_id);
CREATE POLICY "Insert alex_latency" ON public.alex_response_latency FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Admin read alex_latency" ON public.alex_response_latency FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 9. alex_ui_failures
CREATE TABLE IF NOT EXISTS public.alex_ui_failures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  related_action_id uuid,
  failure_type text NOT NULL,
  spoken_text text,
  expected_ui_event text NOT NULL,
  actual_ui_event text,
  screen_name text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.alex_ui_failures ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_alex_ui_failures_session ON public.alex_ui_failures(session_id);
CREATE POLICY "Insert alex_ui_failures" ON public.alex_ui_failures FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Admin read alex_ui_failures" ON public.alex_ui_failures FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 10. alex_voice_preferences
CREATE TABLE IF NOT EXISTS public.alex_voice_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id text,
  language text NOT NULL DEFAULT 'fr',
  locale_code text NOT NULL DEFAULT 'fr-QC',
  voice_provider text,
  voice_name text,
  speech_rate numeric(4,2) NOT NULL DEFAULT 1.00,
  speech_style text NOT NULL DEFAULT 'natural_quebec_concierge',
  interactivity_level text NOT NULL DEFAULT 'high',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.alex_voice_preferences ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_alex_voice_user ON public.alex_voice_preferences(user_id);
CREATE POLICY "Users read own voice prefs" ON public.alex_voice_preferences FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users insert own voice prefs" ON public.alex_voice_preferences FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users update own voice prefs" ON public.alex_voice_preferences FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admin read all voice prefs" ON public.alex_voice_preferences FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ══════════════════════════════════════════════════
-- RPC FUNCTIONS
-- ══════════════════════════════════════════════════

-- fn_alex_get_active_session
CREATE OR REPLACE FUNCTION public.fn_alex_get_active_session(_session_token text)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE s record;
BEGIN
  SELECT * INTO s FROM public.alex_sessions
    WHERE session_token = _session_token
    AND updated_at > now() - interval '24 hours'
    ORDER BY updated_at DESC LIMIT 1;
  IF NOT FOUND THEN RETURN jsonb_build_object('found', false); END IF;
  RETURN jsonb_build_object(
    'found', true, 'id', s.id, 'user_id', s.user_id,
    'auth_state', s.auth_state, 'current_step', s.current_step,
    'project_type', s.project_type, 'project_city', s.project_city,
    'booking_intent', s.booking_intent, 'no_result_state', s.no_result_state,
    'recommended_contractor_id', s.recommended_contractor_id,
    'last_intent', s.last_intent
  );
END; $$;

-- fn_alex_compute_booking_readiness
CREATE OR REPLACE FUNCTION public.fn_alex_compute_booking_readiness(_session_id uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  s record;
  score integer := 0;
  reasons text[] := '{}';
BEGIN
  SELECT * INTO s FROM public.alex_sessions WHERE id = _session_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('score', 0, 'level', 'unknown'); END IF;

  IF s.project_type IS NOT NULL THEN score := score + 20; reasons := array_append(reasons, 'service_clear'); END IF;
  IF s.project_city IS NOT NULL THEN score := score + 15; reasons := array_append(reasons, 'city_clear'); END IF;
  IF s.booking_intent THEN score := score + 25; reasons := array_append(reasons, 'booking_intent'); END IF;
  IF s.recommended_contractor_id IS NOT NULL THEN score := score + 10; reasons := array_append(reasons, 'has_match'); END IF;

  IF EXISTS (SELECT 1 FROM public.alex_booking_drafts WHERE session_id = _session_id::text AND contact_phone IS NOT NULL) THEN
    score := score + 15; reasons := array_append(reasons, 'contact_captured');
  END IF;

  IF s.no_result_state THEN score := score - 20; reasons := array_append(reasons, 'no_result_penalty'); END IF;

  score := GREATEST(0, LEAST(100, score));

  RETURN jsonb_build_object(
    'score', score,
    'level', CASE
      WHEN score >= 75 THEN 'ready_booking'
      WHEN score >= 55 THEN 'ready_options'
      WHEN score >= 30 THEN 'medium_interest'
      ELSE 'exploration'
    END,
    'reasons', to_jsonb(reasons)
  );
END; $$;

-- fn_alex_promote_guest_session
CREATE OR REPLACE FUNCTION public.fn_alex_promote_guest_session(_session_token text, _user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE s_id uuid;
BEGIN
  UPDATE public.alex_sessions
    SET user_id = _user_id, auth_state = 'authenticated', updated_at = now()
    WHERE session_token = _session_token AND auth_state = 'guest'
    RETURNING id INTO s_id;

  IF s_id IS NULL THEN RETURN jsonb_build_object('promoted', false); END IF;

  UPDATE public.alex_booking_drafts SET user_id = _user_id WHERE session_id = _session_token AND user_id IS NULL;

  RETURN jsonb_build_object('promoted', true, 'session_id', s_id);
END; $$;

-- fn_alex_get_best_next_action
CREATE OR REPLACE FUNCTION public.fn_alex_get_best_next_action(_session_id uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  s record;
  readiness jsonb;
  has_match boolean;
  has_contact boolean;
BEGIN
  SELECT * INTO s FROM public.alex_sessions WHERE id = _session_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('type', 'error', 'label', 'Session introuvable.'); END IF;

  readiness := public.fn_alex_compute_booking_readiness(_session_id);
  has_match := s.recommended_contractor_id IS NOT NULL;
  has_contact := EXISTS (SELECT 1 FROM public.alex_booking_drafts WHERE session_id = _session_id::text AND contact_phone IS NOT NULL);

  IF s.project_type IS NULL AND s.project_city IS NULL THEN
    RETURN jsonb_build_object('type', 'ask_project_clarification', 'label', 'Quel type de service cherchez-vous?', 'requires_auth', false, 'requires_contact', false);
  END IF;

  IF s.no_result_state THEN
    RETURN jsonb_build_object('type', 'offer_waitlist', 'label', 'Je peux m''en occuper pour vous.', 'requires_auth', false, 'requires_contact', true);
  END IF;

  IF has_match AND (readiness->>'score')::int >= 75 AND s.auth_state = 'guest' AND NOT has_contact THEN
    RETURN jsonb_build_object('type', 'capture_contact', 'label', 'Je prends juste vos infos pour vous préparer ça.', 'requires_auth', false, 'requires_contact', true);
  END IF;

  IF has_match AND (readiness->>'score')::int >= 75 THEN
    RETURN jsonb_build_object('type', 'open_calendar', 'label', 'Je vous montre les disponibilités.', 'requires_auth', false, 'requires_contact', false);
  END IF;

  IF has_match AND NOT has_contact AND s.auth_state = 'guest' THEN
    RETURN jsonb_build_object('type', 'capture_contact', 'label', 'Ça me prend juste vos infos.', 'requires_auth', false, 'requires_contact', true);
  END IF;

  IF has_match THEN
    RETURN jsonb_build_object('type', 'show_recommended_pro', 'label', 'Je peux déjà vous montrer quelqu''un de sérieux.', 'requires_auth', false, 'requires_contact', false);
  END IF;

  RETURN jsonb_build_object('type', 'ask_project_clarification', 'label', 'Dites-moi en plus sur votre projet.', 'requires_auth', false, 'requires_contact', false);
END; $$;

-- fn_alex_detect_no_result_state
CREATE OR REPLACE FUNCTION public.fn_alex_detect_no_result_state(_session_id uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  primary_count integer;
  partial_count integer;
  max_radius integer := 0;
BEGIN
  SELECT count(*) INTO primary_count FROM public.alex_predictive_matches
    WHERE session_id = _session_id::text AND is_primary = true;

  SELECT count(*) INTO partial_count FROM public.alex_predictive_matches
    WHERE session_id = _session_id::text AND match_score >= 55 AND match_score < 70;

  SELECT COALESCE(MAX(radius_attempted), 0) INTO max_radius
    FROM public.alex_no_result_events WHERE session_id = _session_id::text;

  RETURN jsonb_build_object(
    'has_primary_match', primary_count > 0,
    'has_partial_match', partial_count > 0,
    'partial_match_count', partial_count,
    'radius_attempted', max_radius,
    'should_expand', max_radius < 50 AND primary_count = 0,
    'should_offer_waitlist', max_radius >= 50 AND primary_count = 0 AND partial_count = 0
  );
END; $$;
