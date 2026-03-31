
CREATE TABLE public.user_flow_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_token TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  contractor_id UUID REFERENCES public.contractors(id) ON DELETE SET NULL,
  flow_type TEXT NOT NULL DEFAULT 'AIPP_ANALYSIS',
  step TEXT NOT NULL DEFAULT 'loading',
  status TEXT NOT NULL DEFAULT 'in_progress',
  input_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  lead_id UUID,
  score_snapshot JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_flow_sessions ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (guest or authenticated)
CREATE POLICY "Anyone can create flow sessions"
  ON public.user_flow_sessions FOR INSERT
  WITH CHECK (true);

-- Users can read their own sessions (by user_id or session_token via RPC)
CREATE POLICY "Users can read own flow sessions"
  ON public.user_flow_sessions FOR SELECT
  USING (
    user_id = auth.uid()
    OR user_id IS NULL
    OR public.is_admin()
  );

-- Users can update their own sessions
CREATE POLICY "Users can update own flow sessions"
  ON public.user_flow_sessions FOR UPDATE
  USING (
    user_id = auth.uid()
    OR user_id IS NULL
    OR public.is_admin()
  );

CREATE TRIGGER set_updated_at_user_flow_sessions
  BEFORE UPDATE ON public.user_flow_sessions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_user_flow_sessions_user ON public.user_flow_sessions(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_user_flow_sessions_token ON public.user_flow_sessions(session_token);
CREATE INDEX idx_user_flow_sessions_status ON public.user_flow_sessions(status) WHERE status = 'in_progress';
