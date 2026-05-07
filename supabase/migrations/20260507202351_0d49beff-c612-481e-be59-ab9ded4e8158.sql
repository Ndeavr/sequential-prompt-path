CREATE TABLE IF NOT EXISTS public.alex_voice_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text,
  user_id uuid,
  page text,
  mode text,
  voice_id text,
  model_id text,
  startup_status text,
  websocket_status text,
  error_message text,
  fallback_triggered boolean DEFAULT false,
  reconnect_attempts int DEFAULT 0,
  latency_ms int,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_alex_voice_logs_session ON public.alex_voice_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_alex_voice_logs_created ON public.alex_voice_logs(created_at DESC);

ALTER TABLE public.alex_voice_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can insert voice logs"
ON public.alex_voice_logs FOR INSERT
WITH CHECK (true);

CREATE POLICY "admins can read voice logs"
ON public.alex_voice_logs FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));
