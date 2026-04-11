
-- Add missing columns to existing alex_sessions
ALTER TABLE public.alex_sessions 
  ADD COLUMN IF NOT EXISTS resolved_role TEXT DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS primary_intent TEXT,
  ADD COLUMN IF NOT EXISTS secondary_intent TEXT,
  ADD COLUMN IF NOT EXISTS current_route TEXT,
  ADD COLUMN IF NOT EXISTS current_stage TEXT,
  ADD COLUMN IF NOT EXISTS session_health TEXT DEFAULT 'healthy',
  ADD COLUMN IF NOT EXISTS context_json JSONB DEFAULT '{}';

-- Alex Session Memory
CREATE TABLE IF NOT EXISTS public.alex_session_memory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.alex_sessions(id) ON DELETE CASCADE,
  memory_key TEXT NOT NULL,
  memory_value_json JSONB NOT NULL DEFAULT '{}',
  memory_scope TEXT NOT NULL DEFAULT 'short',
  confidence_score NUMERIC DEFAULT 1.0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.alex_session_memory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Session memory access" ON public.alex_session_memory FOR ALL USING (
  EXISTS (SELECT 1 FROM public.alex_sessions s WHERE s.id = session_id AND (s.user_id = auth.uid() OR s.user_id IS NULL))
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.alex_sessions s WHERE s.id = session_id AND (s.user_id = auth.uid() OR s.user_id IS NULL))
);

-- Alex Detected Intents
CREATE TABLE IF NOT EXISTS public.alex_detected_intents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.alex_sessions(id) ON DELETE CASCADE,
  user_message TEXT,
  primary_intent TEXT NOT NULL,
  secondary_intent TEXT,
  confidence_score NUMERIC NOT NULL DEFAULT 0.5,
  requires_clarification BOOLEAN DEFAULT false,
  classifier_version TEXT DEFAULT 'v3',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.alex_detected_intents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Intents access" ON public.alex_detected_intents FOR ALL USING (
  EXISTS (SELECT 1 FROM public.alex_sessions s WHERE s.id = session_id AND (s.user_id = auth.uid() OR s.user_id IS NULL))
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.alex_sessions s WHERE s.id = session_id AND (s.user_id = auth.uid() OR s.user_id IS NULL))
);

-- Alex Decision Logs
CREATE TABLE IF NOT EXISTS public.alex_decision_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.alex_sessions(id) ON DELETE CASCADE,
  decision_type TEXT NOT NULL,
  input_snapshot_json JSONB DEFAULT '{}',
  output_snapshot_json JSONB DEFAULT '{}',
  policy_version TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.alex_decision_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Decision logs access" ON public.alex_decision_logs FOR ALL USING (
  EXISTS (SELECT 1 FROM public.alex_sessions s WHERE s.id = session_id AND (s.user_id = auth.uid() OR s.user_id IS NULL))
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.alex_sessions s WHERE s.id = session_id AND (s.user_id = auth.uid() OR s.user_id IS NULL))
);

-- Alex Profile Gaps
CREATE TABLE IF NOT EXISTS public.alex_profile_gaps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  gap_type TEXT NOT NULL,
  is_resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.alex_profile_gaps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own gaps" ON public.alex_profile_gaps FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Alex Response Policy Versions
CREATE TABLE IF NOT EXISTS public.alex_response_policy_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  version_name TEXT NOT NULL,
  policy_json JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.alex_response_policy_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads policies" ON public.alex_response_policy_versions FOR SELECT USING (true);

-- Alex Learning Feedback
CREATE TABLE IF NOT EXISTS public.alex_learning_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES public.alex_sessions(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  feedback_type TEXT NOT NULL,
  feedback_note TEXT,
  resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.alex_learning_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own feedback" ON public.alex_learning_feedback FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_alex_session_memory_session ON public.alex_session_memory(session_id);
CREATE INDEX IF NOT EXISTS idx_alex_detected_intents_session ON public.alex_detected_intents(session_id);
CREATE INDEX IF NOT EXISTS idx_alex_decision_logs_session ON public.alex_decision_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_alex_profile_gaps_user ON public.alex_profile_gaps(user_id);
