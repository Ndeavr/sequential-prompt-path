
-- Voice Reliability Engine tables

-- 1. voice_provider_configs — configurable providers
CREATE TABLE IF NOT EXISTS public.voice_provider_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_name TEXT NOT NULL,
  provider_type TEXT NOT NULL DEFAULT 'tts',
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  voice_id TEXT,
  model_id TEXT,
  language_code TEXT NOT NULL DEFAULT 'fr',
  fallback_priority INT NOT NULL DEFAULT 99,
  supports_tts BOOLEAN NOT NULL DEFAULT false,
  supports_stt BOOLEAN NOT NULL DEFAULT false,
  config_json JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.voice_provider_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read provider configs"
  ON public.voice_provider_configs FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage provider configs"
  ON public.voice_provider_configs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 2. voice_reliability_sessions
CREATE TABLE IF NOT EXISTS public.voice_reliability_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  session_status TEXT NOT NULL DEFAULT 'active',
  entry_point TEXT DEFAULT 'unknown',
  device_type TEXT,
  browser_name TEXT,
  locale TEXT DEFAULT 'fr-CA',
  silence_timeout_ms INT DEFAULT 3000,
  active_tts_provider TEXT,
  active_stt_provider TEXT,
  fallback_used BOOLEAN DEFAULT false,
  ended_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.voice_reliability_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own voice reliability sessions"
  ON public.voice_reliability_sessions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own voice reliability sessions"
  ON public.voice_reliability_sessions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own voice reliability sessions"
  ON public.voice_reliability_sessions FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all voice reliability sessions"
  ON public.voice_reliability_sessions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 3. voice_reliability_events
CREATE TABLE IF NOT EXISTS public.voice_reliability_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voice_session_id UUID NOT NULL REFERENCES public.voice_reliability_sessions(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_source TEXT DEFAULT 'client',
  payload_json JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_vr_events_session ON public.voice_reliability_events(voice_session_id);
CREATE INDEX idx_vr_events_type ON public.voice_reliability_events(event_type);

ALTER TABLE public.voice_reliability_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own voice events"
  ON public.voice_reliability_events FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.voice_reliability_sessions s
    WHERE s.id = voice_session_id AND s.user_id = auth.uid()
  ));

CREATE POLICY "Users can create voice events"
  ON public.voice_reliability_events FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.voice_reliability_sessions s
    WHERE s.id = voice_session_id AND s.user_id = auth.uid()
  ));

CREATE POLICY "Admins can view all voice events"
  ON public.voice_reliability_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 4. voice_reliability_transcripts
CREATE TABLE IF NOT EXISTS public.voice_reliability_transcripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voice_session_id UUID NOT NULL REFERENCES public.voice_reliability_sessions(id) ON DELETE CASCADE,
  speaker_role TEXT NOT NULL DEFAULT 'user',
  raw_transcript TEXT,
  normalized_transcript TEXT,
  detected_language TEXT,
  confidence_score NUMERIC(4,3) DEFAULT 0,
  rejected BOOLEAN DEFAULT false,
  rejected_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_vr_transcripts_session ON public.voice_reliability_transcripts(voice_session_id);

ALTER TABLE public.voice_reliability_transcripts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transcripts"
  ON public.voice_reliability_transcripts FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.voice_reliability_sessions s
    WHERE s.id = voice_session_id AND s.user_id = auth.uid()
  ));

CREATE POLICY "Users can create transcripts"
  ON public.voice_reliability_transcripts FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.voice_reliability_sessions s
    WHERE s.id = voice_session_id AND s.user_id = auth.uid()
  ));

CREATE POLICY "Admins can view all transcripts"
  ON public.voice_reliability_transcripts FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 5. voice_reliability_errors
CREATE TABLE IF NOT EXISTS public.voice_reliability_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voice_session_id UUID REFERENCES public.voice_reliability_sessions(id) ON DELETE SET NULL,
  provider_name TEXT,
  module_name TEXT,
  error_code TEXT,
  error_message TEXT,
  http_status INT,
  retryable BOOLEAN DEFAULT false,
  fallback_applied BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_vr_errors_session ON public.voice_reliability_errors(voice_session_id);
CREATE INDEX idx_vr_errors_provider ON public.voice_reliability_errors(provider_name);

ALTER TABLE public.voice_reliability_errors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own voice errors"
  ON public.voice_reliability_errors FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.voice_reliability_sessions s
    WHERE s.id = voice_session_id AND s.user_id = auth.uid()
  ));

CREATE POLICY "Users can create voice errors"
  ON public.voice_reliability_errors FOR INSERT TO authenticated
  WITH CHECK (voice_session_id IS NULL OR EXISTS (
    SELECT 1 FROM public.voice_reliability_sessions s
    WHERE s.id = voice_session_id AND s.user_id = auth.uid()
  ));

CREATE POLICY "Admins can view all voice errors"
  ON public.voice_reliability_errors FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Seed provider configs
INSERT INTO public.voice_provider_configs (provider_name, provider_type, is_active, is_primary, voice_id, model_id, language_code, fallback_priority, supports_tts, supports_stt, config_json)
VALUES
  ('elevenlabs_primary', 'tts', true, true, 'UJCi4DDncuo0VJDSIegj', 'eleven_multilingual_v2', 'fr', 1, true, false, '{"stability":0.5,"similarity_boost":0.75,"style":0.4,"use_speaker_boost":true,"speed":1.0}'),
  ('elevenlabs_fallback', 'tts', true, false, 'FGY2WhTYpPnrIDTdsKH5', 'eleven_multilingual_v2', 'fr', 2, true, false, '{"stability":0.5,"similarity_boost":0.75,"style":0.3,"use_speaker_boost":true,"speed":1.0}'),
  ('google_cloud_stt', 'stt', true, true, NULL, 'chirp_2', 'fr-CA', 1, false, true, '{"fallback_model":"latest_long"}'),
  ('gemini_live', 'realtime', true, true, NULL, 'gemini-3.1-flash-live-preview', 'fr', 1, true, true, '{"bidirectional":true}');

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_voice_reliability_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_vr_sessions_updated
  BEFORE UPDATE ON public.voice_reliability_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_voice_reliability_updated_at();

CREATE TRIGGER trg_vr_provider_configs_updated
  BEFORE UPDATE ON public.voice_provider_configs
  FOR EACH ROW EXECUTE FUNCTION public.update_voice_reliability_updated_at();
