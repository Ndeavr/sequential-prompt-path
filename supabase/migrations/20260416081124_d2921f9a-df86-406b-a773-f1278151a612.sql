
-- Add missing columns to existing alex_conversation_sessions
ALTER TABLE public.alex_conversation_sessions
  ADD COLUMN IF NOT EXISTS current_step_key TEXT,
  ADD COLUMN IF NOT EXISTS current_route TEXT,
  ADD COLUMN IF NOT EXISTS silence_cycle_count INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS prompt_presence_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS prompt_final_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_user_activity_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS paused_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS resumed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS feature TEXT DEFAULT 'general';

-- Table: alex_conversation_presence_events
CREATE TABLE public.alex_conversation_presence_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.alex_conversation_sessions(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('idle_detected', 'presence_prompt_sent', 'final_prompt_sent', 'session_paused', 'session_resumed')),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb
);

ALTER TABLE public.alex_conversation_presence_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own presence events" ON public.alex_conversation_presence_events
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.alex_conversation_sessions s WHERE s.id = session_id AND s.user_id = auth.uid()));
CREATE POLICY "Users can create presence events" ON public.alex_conversation_presence_events
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.alex_conversation_sessions s WHERE s.id = session_id AND s.user_id = auth.uid()));
CREATE POLICY "Anon can create presence events" ON public.alex_conversation_presence_events
  FOR INSERT TO anon WITH CHECK (true);

CREATE INDEX idx_alex_presence_events_session ON public.alex_conversation_presence_events(session_id);

-- Table: alex_resume_snapshots
CREATE TABLE public.alex_resume_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.alex_conversation_sessions(id) ON DELETE CASCADE,
  route_path TEXT,
  ui_state JSONB DEFAULT '{}'::jsonb,
  last_alex_message TEXT,
  last_user_message TEXT,
  active_form_state JSONB DEFAULT '{}'::jsonb,
  collected_entities JSONB DEFAULT '{}'::jsonb,
  current_intent TEXT,
  current_step_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.alex_resume_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own snapshots" ON public.alex_resume_snapshots
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.alex_conversation_sessions s WHERE s.id = session_id AND s.user_id = auth.uid()));
CREATE POLICY "Users can create snapshots" ON public.alex_resume_snapshots
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.alex_conversation_sessions s WHERE s.id = session_id AND s.user_id = auth.uid()));
CREATE POLICY "Anon can create snapshots" ON public.alex_resume_snapshots
  FOR INSERT TO anon WITH CHECK (true);

CREATE INDEX idx_alex_resume_snapshots_session ON public.alex_resume_snapshots(session_id);
