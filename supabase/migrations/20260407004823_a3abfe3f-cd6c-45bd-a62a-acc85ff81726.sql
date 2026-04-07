
-- Voice settings profiles
CREATE TABLE public.alex_voice_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_name TEXT NOT NULL,
  device_type TEXT NOT NULL DEFAULT 'all',
  language_default TEXT NOT NULL DEFAULT 'fr-CA',
  language_fallback TEXT NOT NULL DEFAULT 'en-CA',
  start_speech_threshold NUMERIC NOT NULL DEFAULT 0.18,
  end_speech_threshold NUMERIC NOT NULL DEFAULT 0.08,
  min_speech_ms INTEGER NOT NULL DEFAULT 180,
  max_silence_gap_ms INTEGER NOT NULL DEFAULT 450,
  interrupt_threshold_ms INTEGER NOT NULL DEFAULT 120,
  first_reply_boost BOOLEAN NOT NULL DEFAULT true,
  interruption_enabled BOOLEAN NOT NULL DEFAULT true,
  tts_voice_name TEXT NOT NULL DEFAULT 'Aoede',
  active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.alex_voice_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read voice settings" ON public.alex_voice_settings FOR SELECT USING (true);
CREATE POLICY "Admins can manage voice settings" ON public.alex_voice_settings FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Pronunciation correction rules
CREATE TABLE public.alex_pronunciation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  language_code TEXT NOT NULL DEFAULT 'fr-CA',
  source_text TEXT NOT NULL,
  normalized_text TEXT NOT NULL,
  phonetic_hint TEXT,
  priority INTEGER NOT NULL DEFAULT 50,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.alex_pronunciation_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read pronunciation rules" ON public.alex_pronunciation_rules FOR SELECT USING (true);
CREATE POLICY "Admins can manage pronunciation rules" ON public.alex_pronunciation_rules FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- City alias table
CREATE TABLE public.alex_city_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_name TEXT NOT NULL,
  aliases_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  region TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.alex_city_aliases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read city aliases" ON public.alex_city_aliases FOR SELECT USING (true);
CREATE POLICY "Admins can manage city aliases" ON public.alex_city_aliases FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Greeting rules by time
CREATE TABLE public.alex_greeting_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  start_hour INTEGER NOT NULL,
  end_hour INTEGER NOT NULL,
  greeting_text_fr TEXT NOT NULL,
  greeting_text_en TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.alex_greeting_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read greeting rules" ON public.alex_greeting_rules FOR SELECT USING (true);
CREATE POLICY "Admins can manage greeting rules" ON public.alex_greeting_rules FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Turn-by-turn logs
CREATE TABLE public.alex_turn_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  turn_index INTEGER NOT NULL DEFAULT 0,
  raw_transcript TEXT,
  cleaned_transcript TEXT,
  detected_language TEXT DEFAULT 'fr-CA',
  response_latency_ms INTEGER,
  speech_start_delay_ms INTEGER,
  interruption_count INTEGER DEFAULT 0,
  pronunciation_fix_count INTEGER DEFAULT 0,
  final_status TEXT DEFAULT 'completed',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.alex_turn_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read turn logs" ON public.alex_turn_logs FOR SELECT USING (true);
CREATE POLICY "Anyone can insert turn logs" ON public.alex_turn_logs FOR INSERT WITH CHECK (true);
