
-- Alex Score Reveal Sessions
CREATE TABLE public.alex_score_reveal_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  prospect_id uuid,
  aipp_score_id uuid REFERENCES public.aipp_score_checks(id),
  session_token text NOT NULL DEFAULT encode(gen_random_bytes(24), 'hex'),
  score_global integer NOT NULL DEFAULT 0,
  score_level text NOT NULL DEFAULT 'pending',
  score_breakdown_json jsonb DEFAULT '{}'::jsonb,
  reveal_status text NOT NULL DEFAULT 'created',
  current_step_index integer NOT NULL DEFAULT 0,
  voice_enabled boolean NOT NULL DEFAULT true,
  reveal_completed boolean NOT NULL DEFAULT false,
  script_json jsonb DEFAULT '[]'::jsonb,
  interpretation_json jsonb DEFAULT '{}'::jsonb,
  last_active_at timestamptz DEFAULT now(),
  CONSTRAINT valid_reveal_status CHECK (reveal_status IN ('created','prepared','intro_playing','awaiting_reveal','score_revealed','interpreting','completed'))
);

CREATE INDEX idx_reveal_sessions_token ON public.alex_score_reveal_sessions(session_token);
CREATE INDEX idx_reveal_sessions_status ON public.alex_score_reveal_sessions(reveal_status);

ALTER TABLE public.alex_score_reveal_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read by token" ON public.alex_score_reveal_sessions
  FOR SELECT USING (true);

CREATE POLICY "Public insert" ON public.alex_score_reveal_sessions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Public update by token" ON public.alex_score_reveal_sessions
  FOR UPDATE USING (true);

-- Trigger updated_at
CREATE TRIGGER trg_reveal_sessions_updated
  BEFORE UPDATE ON public.alex_score_reveal_sessions
  FOR EACH ROW EXECUTE FUNCTION public.trg_set_updated_at();

-- Alex Score Reveal Steps
CREATE TABLE public.alex_score_reveal_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.alex_score_reveal_sessions(id) ON DELETE CASCADE,
  step_index integer NOT NULL DEFAULT 0,
  step_key text NOT NULL,
  spoken_text text,
  display_text text,
  trigger_type text NOT NULL DEFAULT 'auto',
  delay_ms integer NOT NULL DEFAULT 0,
  is_completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz
);

CREATE INDEX idx_reveal_steps_session ON public.alex_score_reveal_steps(session_id);

ALTER TABLE public.alex_score_reveal_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read steps" ON public.alex_score_reveal_steps
  FOR SELECT USING (true);

CREATE POLICY "Public insert steps" ON public.alex_score_reveal_steps
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Public update steps" ON public.alex_score_reveal_steps
  FOR UPDATE USING (true);

-- Alex Score Reveal Events
CREATE TABLE public.alex_score_reveal_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.alex_score_reveal_sessions(id) ON DELETE CASCADE,
  event_key text NOT NULL,
  event_value text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_reveal_events_session ON public.alex_score_reveal_events(session_id);

ALTER TABLE public.alex_score_reveal_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read events" ON public.alex_score_reveal_events
  FOR SELECT USING (true);

CREATE POLICY "Public insert events" ON public.alex_score_reveal_events
  FOR INSERT WITH CHECK (true);
