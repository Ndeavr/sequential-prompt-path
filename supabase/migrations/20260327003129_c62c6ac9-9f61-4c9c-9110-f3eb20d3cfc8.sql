
-- Voice provider registry (central config)
CREATE TABLE public.alex_voice_provider_registry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_key text UNIQUE NOT NULL,
  provider_type text NOT NULL DEFAULT 'realtime',
  model_name text NOT NULL,
  transport_mode text NOT NULL DEFAULT 'websocket',
  supports_realtime_audio boolean NOT NULL DEFAULT true,
  supports_barge_in boolean NOT NULL DEFAULT true,
  supports_tool_calling boolean NOT NULL DEFAULT false,
  supports_text_fallback boolean NOT NULL DEFAULT true,
  priority_order integer NOT NULL DEFAULT 10,
  is_active boolean NOT NULL DEFAULT true,
  deprecation_risk text DEFAULT 'low',
  rollout_percentage integer NOT NULL DEFAULT 100,
  config_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Voice profiles per role
CREATE TABLE public.alex_voice_profile_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_key text UNIQUE NOT NULL,
  language text NOT NULL DEFAULT 'fr',
  locale_code text NOT NULL DEFAULT 'fr-QC',
  provider_preference_order text[] NOT NULL DEFAULT ARRAY['openai_realtime','gemini_live','hybrid'],
  voice_name_primary text,
  voice_name_secondary text,
  speech_rate numeric(4,2) NOT NULL DEFAULT 1.00,
  speech_style text NOT NULL DEFAULT 'natural_quebec_concierge',
  interruptibility_mode text NOT NULL DEFAULT 'immediate',
  prosody_profile jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Voice sessions
CREATE TABLE public.alex_voice_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.alex_sessions(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  provider_primary text NOT NULL,
  provider_current text NOT NULL,
  provider_fallback text,
  connection_mode text NOT NULL DEFAULT 'realtime_native',
  voice_profile_key text NOT NULL DEFAULT 'homeowner',
  voice_name text,
  language text NOT NULL DEFAULT 'fr',
  locale_code text NOT NULL DEFAULT 'fr-QC',
  network_quality text,
  device_type text,
  browser_name text,
  session_status text NOT NULL DEFAULT 'active',
  started_at timestamptz DEFAULT now(),
  ended_at timestamptz
);

-- Provider events
CREATE TABLE public.alex_voice_provider_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  voice_session_id uuid NOT NULL REFERENCES public.alex_voice_sessions(id) ON DELETE CASCADE,
  provider_name text NOT NULL,
  event_type text NOT NULL,
  event_status text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Quality logs
CREATE TABLE public.alex_voice_quality_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  voice_session_id uuid NOT NULL REFERENCES public.alex_voice_sessions(id) ON DELETE CASCADE,
  metric_key text NOT NULL,
  metric_value numeric(10,2),
  quality_level text,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Fallback events
CREATE TABLE public.alex_voice_fallback_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  voice_session_id uuid NOT NULL REFERENCES public.alex_voice_sessions(id) ON DELETE CASCADE,
  from_provider text NOT NULL,
  to_provider text NOT NULL,
  reason text NOT NULL,
  was_user_visible boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Device audio capabilities
CREATE TABLE public.alex_device_audio_capabilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.alex_sessions(id) ON DELETE CASCADE,
  has_microphone boolean,
  has_speaker boolean,
  webrtc_supported boolean,
  preferred_input_mode text,
  preferred_output_mode text,
  permission_microphone text,
  permission_speaker text,
  created_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE public.alex_voice_provider_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alex_voice_profile_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alex_voice_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alex_voice_provider_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alex_voice_quality_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alex_voice_fallback_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alex_device_audio_capabilities ENABLE ROW LEVEL SECURITY;

-- Public read for registry and profiles
CREATE POLICY "Anyone can read voice provider registry" ON public.alex_voice_provider_registry FOR SELECT USING (true);
CREATE POLICY "Anyone can read voice profile configs" ON public.alex_voice_profile_configs FOR SELECT USING (true);

-- Voice sessions: users see own, anon can insert
CREATE POLICY "Users can read own voice sessions" ON public.alex_voice_sessions FOR SELECT USING (user_id = auth.uid() OR user_id IS NULL);
CREATE POLICY "Anyone can insert voice sessions" ON public.alex_voice_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update voice sessions" ON public.alex_voice_sessions FOR UPDATE USING (true);

-- Provider events, quality logs, fallback events: insert freely, read own
CREATE POLICY "Anyone can insert voice provider events" ON public.alex_voice_provider_events FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can read voice provider events" ON public.alex_voice_provider_events FOR SELECT USING (true);

CREATE POLICY "Anyone can insert voice quality logs" ON public.alex_voice_quality_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can read voice quality logs" ON public.alex_voice_quality_logs FOR SELECT USING (true);

CREATE POLICY "Anyone can insert voice fallback events" ON public.alex_voice_fallback_events FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can read voice fallback events" ON public.alex_voice_fallback_events FOR SELECT USING (true);

CREATE POLICY "Anyone can insert device audio capabilities" ON public.alex_device_audio_capabilities FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can read device audio capabilities" ON public.alex_device_audio_capabilities FOR SELECT USING (true);

-- Indexes
CREATE INDEX idx_alex_voice_sessions_session_id ON public.alex_voice_sessions(session_id);
CREATE INDEX idx_alex_voice_sessions_user_id ON public.alex_voice_sessions(user_id);
CREATE INDEX idx_alex_voice_provider_events_session ON public.alex_voice_provider_events(voice_session_id);
CREATE INDEX idx_alex_voice_quality_logs_session ON public.alex_voice_quality_logs(voice_session_id);
CREATE INDEX idx_alex_voice_fallback_events_session ON public.alex_voice_fallback_events(voice_session_id);
