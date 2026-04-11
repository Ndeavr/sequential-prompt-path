
-- Voice Recovery Attempts
CREATE TABLE public.voice_recovery_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  previous_session_id text,
  new_session_id text,
  recovery_type text NOT NULL DEFAULT 'hard_reset',
  trigger_reason text,
  result text NOT NULL DEFAULT 'pending',
  total_duration_ms integer,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_vra_user ON public.voice_recovery_attempts(user_id);
CREATE INDEX idx_vra_created ON public.voice_recovery_attempts(created_at);
ALTER TABLE public.voice_recovery_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own recovery attempts" ON public.voice_recovery_attempts FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users create own recovery attempts" ON public.voice_recovery_attempts FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Users update own recovery attempts" ON public.voice_recovery_attempts FOR UPDATE USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- Voice Transport Logs
CREATE TABLE public.voice_transport_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recovery_attempt_id uuid REFERENCES public.voice_recovery_attempts(id) ON DELETE CASCADE,
  session_id text,
  transport_type text NOT NULL DEFAULT 'websocket',
  transport_state text NOT NULL,
  event_name text,
  metadata_json jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_vtl_recovery ON public.voice_transport_logs(recovery_attempt_id);
ALTER TABLE public.voice_transport_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own transport logs" ON public.voice_transport_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.voice_recovery_attempts WHERE id = recovery_attempt_id AND (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin')))
);
CREATE POLICY "Anyone can insert transport logs" ON public.voice_transport_logs FOR INSERT WITH CHECK (true);

-- Voice Audio Failures
CREATE TABLE public.voice_audio_failures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recovery_attempt_id uuid REFERENCES public.voice_recovery_attempts(id) ON DELETE CASCADE,
  session_id text,
  failure_type text NOT NULL,
  failure_stage text,
  error_message text,
  stack_trace text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_vaf_recovery ON public.voice_audio_failures(recovery_attempt_id);
ALTER TABLE public.voice_audio_failures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own audio failures" ON public.voice_audio_failures FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.voice_recovery_attempts WHERE id = recovery_attempt_id AND (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin')))
);
CREATE POLICY "Anyone can insert audio failures" ON public.voice_audio_failures FOR INSERT WITH CHECK (true);

-- Voice Reconnect Metrics
CREATE TABLE public.voice_reconnect_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  websocket_ready_ms integer,
  mic_ready_ms integer,
  tts_ready_ms integer,
  first_audio_start_ms integer,
  recovery_needed boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_vrm_session ON public.voice_reconnect_metrics(session_id);
ALTER TABLE public.voice_reconnect_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view reconnect metrics" ON public.voice_reconnect_metrics FOR SELECT USING (true);
CREATE POLICY "Anyone can insert reconnect metrics" ON public.voice_reconnect_metrics FOR INSERT WITH CHECK (true);
