
-- Voice session logs
CREATE TABLE public.voice_session_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  guest_token TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  open_reason TEXT,
  close_reason TEXT,
  opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Voice session state transitions
CREATE TABLE public.voice_session_state_transitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  from_state TEXT NOT NULL,
  to_state TEXT NOT NULL,
  transition_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Voice session errors
CREATE TABLE public.voice_session_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  error_type TEXT NOT NULL,
  error_message TEXT,
  recoverable BOOLEAN NOT NULL DEFAULT true,
  error_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.voice_session_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_session_state_transitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_session_errors ENABLE ROW LEVEL SECURITY;

-- Allow insert for authenticated users
CREATE POLICY "Users can insert own voice session logs" ON public.voice_session_logs
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own voice session logs" ON public.voice_session_logs
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Allow anon insert for guest sessions
CREATE POLICY "Anon can insert voice session logs" ON public.voice_session_logs
  FOR INSERT TO anon WITH CHECK (user_id IS NULL);

-- State transitions - open insert for logging
CREATE POLICY "Anyone can insert state transitions" ON public.voice_session_state_transitions
  FOR INSERT TO authenticated, anon WITH CHECK (true);
CREATE POLICY "Auth users can view state transitions" ON public.voice_session_state_transitions
  FOR SELECT TO authenticated USING (true);

-- Errors - open insert for logging
CREATE POLICY "Anyone can insert voice errors" ON public.voice_session_errors
  FOR INSERT TO authenticated, anon WITH CHECK (true);
CREATE POLICY "Auth users can view voice errors" ON public.voice_session_errors
  FOR SELECT TO authenticated USING (true);
