
-- Add professional voice columns to existing alex_voice_profiles
ALTER TABLE public.alex_voice_profiles
  ADD COLUMN IF NOT EXISTS stt_provider TEXT DEFAULT 'google_cloud_stt_v2',
  ADD COLUMN IF NOT EXISTS stt_model TEXT DEFAULT 'chirp_3',
  ADD COLUMN IF NOT EXISTS locale_primary TEXT DEFAULT 'fr-CA',
  ADD COLUMN IF NOT EXISTS locale_secondary TEXT DEFAULT 'en-CA',
  ADD COLUMN IF NOT EXISTS tts_provider TEXT DEFAULT 'gemini',
  ADD COLUMN IF NOT EXISTS tts_voice TEXT DEFAULT 'Aoede',
  ADD COLUMN IF NOT EXISTS vad_mode TEXT DEFAULT 'client_first',
  ADD COLUMN IF NOT EXISTS silence_duration_ms INTEGER DEFAULT 180,
  ADD COLUMN IF NOT EXISTS start_sensitivity TEXT DEFAULT 'LOW',
  ADD COLUMN IF NOT EXISTS end_sensitivity TEXT DEFAULT 'LOW',
  ADD COLUMN IF NOT EXISTS prefix_padding_ms INTEGER DEFAULT 30,
  ADD COLUMN IF NOT EXISTS interruption_mode TEXT DEFAULT 'START_OF_ACTIVITY_INTERRUPTS',
  ADD COLUMN IF NOT EXISTS noise_floor_db NUMERIC DEFAULT -50,
  ADD COLUMN IF NOT EXISTS speech_open_threshold NUMERIC DEFAULT 0.18,
  ADD COLUMN IF NOT EXISTS speech_close_threshold NUMERIC DEFAULT 0.08,
  ADD COLUMN IF NOT EXISTS min_speech_ms INTEGER DEFAULT 180,
  ADD COLUMN IF NOT EXISTS trailing_close_ms INTEGER DEFAULT 450,
  ADD COLUMN IF NOT EXISTS first_reply_boost BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS device_type TEXT DEFAULT 'all',
  ADD COLUMN IF NOT EXISTS profile_name TEXT DEFAULT 'default';

-- Phrase boosts for STT adaptation
CREATE TABLE public.alex_phrase_boosts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phrase TEXT NOT NULL,
  locale TEXT NOT NULL DEFAULT 'fr-CA',
  boost_level TEXT NOT NULL DEFAULT 'medium',
  category TEXT NOT NULL DEFAULT 'general',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.alex_phrase_boosts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Phrase boosts readable by all" ON public.alex_phrase_boosts FOR SELECT USING (true);
CREATE POLICY "Phrase boosts insertable by all" ON public.alex_phrase_boosts FOR INSERT WITH CHECK (true);

-- Transcript normalization rules
CREATE TABLE public.alex_transcript_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_text TEXT NOT NULL,
  normalized_text TEXT NOT NULL,
  locale TEXT NOT NULL DEFAULT 'fr-CA',
  confidence_threshold NUMERIC DEFAULT 0.5,
  rule_type TEXT NOT NULL DEFAULT 'replacement',
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.alex_transcript_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Transcript rules readable by all" ON public.alex_transcript_rules FOR SELECT USING (true);
CREATE POLICY "Transcript rules insertable by all" ON public.alex_transcript_rules FOR INSERT WITH CHECK (true);

-- Detailed turn-by-turn voice session logs
CREATE TABLE public.alex_voice_turns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  turn_index INTEGER NOT NULL DEFAULT 0,
  raw_transcript TEXT,
  cleaned_transcript TEXT,
  transcript_confidence NUMERIC,
  response_text TEXT,
  start_listen_at TIMESTAMPTZ,
  stop_listen_at TIMESTAMPTZ,
  stt_final_at TIMESTAMPTZ,
  llm_first_token_at TIMESTAMPTZ,
  tts_start_at TIMESTAMPTZ,
  playback_start_at TIMESTAMPTZ,
  interrupted BOOLEAN DEFAULT false,
  fallback_used BOOLEAN DEFAULT false,
  pronunciation_fixes INTEGER DEFAULT 0,
  detected_language TEXT DEFAULT 'fr-CA',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.alex_voice_turns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Voice turns insertable by all" ON public.alex_voice_turns FOR INSERT WITH CHECK (true);
CREATE POLICY "Voice turns readable by all" ON public.alex_voice_turns FOR SELECT USING (true);

-- Noise gate calibration profiles
CREATE TABLE public.alex_noise_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_name TEXT NOT NULL,
  noise_floor_db NUMERIC NOT NULL DEFAULT -50,
  speech_open_threshold NUMERIC NOT NULL DEFAULT 0.18,
  speech_close_threshold NUMERIC NOT NULL DEFAULT 0.08,
  minimum_open_ms INTEGER NOT NULL DEFAULT 180,
  trailing_close_ms INTEGER NOT NULL DEFAULT 450,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.alex_noise_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Noise profiles readable by all" ON public.alex_noise_profiles FOR SELECT USING (true);
