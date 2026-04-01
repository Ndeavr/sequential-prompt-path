
-- Table: user_input_mode_logs
CREATE TABLE public.user_input_mode_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  session_id TEXT NOT NULL,
  mode_used TEXT NOT NULL DEFAULT 'voice' CHECK (mode_used IN ('voice', 'chat', 'form')),
  success BOOLEAN DEFAULT false,
  time_to_first_input_ms INTEGER,
  conversion BOOLEAN DEFAULT false,
  page_context TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_input_mode_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert input mode logs"
  ON public.user_input_mode_logs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can view own logs"
  ON public.user_input_mode_logs FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Admins can view all logs"
  ON public.user_input_mode_logs FOR SELECT
  USING (public.is_admin());

CREATE INDEX idx_input_mode_logs_session ON public.user_input_mode_logs(session_id);
CREATE INDEX idx_input_mode_logs_mode ON public.user_input_mode_logs(mode_used);

-- Table: input_mode_failures
CREATE TABLE public.input_mode_failures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  failed_mode TEXT NOT NULL CHECK (failed_mode IN ('voice', 'chat')),
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.input_mode_failures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert mode failures"
  ON public.input_mode_failures FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can view failures"
  ON public.input_mode_failures FOR SELECT
  USING (public.is_admin());

CREATE INDEX idx_mode_failures_session ON public.input_mode_failures(session_id);

-- Table: input_mode_preferences
CREATE TABLE public.input_mode_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  preferred_mode TEXT NOT NULL DEFAULT 'voice' CHECK (preferred_mode IN ('voice', 'chat', 'form')),
  last_used_mode TEXT CHECK (last_used_mode IN ('voice', 'chat', 'form')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.input_mode_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own preferences"
  ON public.input_mode_preferences FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER set_input_mode_prefs_updated_at
  BEFORE UPDATE ON public.input_mode_preferences
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
