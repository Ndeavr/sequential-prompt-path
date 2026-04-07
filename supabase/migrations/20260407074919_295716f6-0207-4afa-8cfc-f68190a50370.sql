
-- alex_latency_profiles
CREATE TABLE public.alex_latency_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_name TEXT NOT NULL UNIQUE,
  silence_duration_ms INTEGER NOT NULL DEFAULT 180,
  prefix_padding_ms INTEGER NOT NULL DEFAULT 30,
  start_sensitivity TEXT NOT NULL DEFAULT 'low',
  end_sensitivity TEXT NOT NULL DEFAULT 'low',
  chunk_ms INTEGER NOT NULL DEFAULT 40,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.alex_latency_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read latency profiles" ON public.alex_latency_profiles FOR SELECT USING (true);

-- Seed profiles
INSERT INTO public.alex_latency_profiles (profile_name, silence_duration_ms, prefix_padding_ms, start_sensitivity, end_sensitivity, chunk_ms) VALUES
  ('ultra_fast', 120, 20, 'low', 'low', 20),
  ('balanced', 180, 30, 'low', 'low', 40),
  ('careful', 260, 40, 'medium', 'medium', 40);

-- alex_latency_logs
CREATE TABLE public.alex_latency_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  turn_index INTEGER NOT NULL DEFAULT 0,
  mic_start_to_detect_ms INTEGER,
  speech_end_to_final_ms INTEGER,
  transcript_to_first_token_ms INTEGER,
  first_token_to_tts_ms INTEGER,
  total_latency_ms INTEGER,
  interrupted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.alex_latency_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public insert latency logs" ON public.alex_latency_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Public read latency logs" ON public.alex_latency_logs FOR SELECT USING (true);

-- alex_output_filters
CREATE TABLE public.alex_output_filters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  blocked_pattern TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  priority INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.alex_output_filters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read output filters" ON public.alex_output_filters FOR SELECT USING (true);

-- Seed output filters
INSERT INTO public.alex_output_filters (blocked_pattern, priority) VALUES
  ('Thought for', 100),
  ('Editing', 90),
  ('router.tsx', 90),
  ('implementing', 80),
  ('preview card', 80),
  ('tool call', 80),
  ('internal chain', 70),
  ('debug mode', 70),
  ('stack trace', 70),
  ('function call', 70),
  ('fix ', 60),
  ('.tsx', 60),
  ('.ts', 50),
  ('console.log', 50),
  ('import ', 50),
  ('export ', 50);

-- alex_pronunciation_fixes
CREATE TABLE public.alex_pronunciation_fixes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_text TEXT NOT NULL,
  fixed_text TEXT NOT NULL,
  language_code TEXT NOT NULL DEFAULT 'fr-CA',
  priority INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.alex_pronunciation_fixes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read pronunciation fixes" ON public.alex_pronunciation_fixes FOR SELECT USING (true);

-- Seed pronunciation fixes
INSERT INTO public.alex_pronunciation_fixes (source_text, fixed_text, language_code, priority) VALUES
  ('ille', 'ville', 'fr-CA', 100),
  ('virre', 'ville', 'fr-CA', 100),
  ('renoration', 'rénovation', 'fr-CA', 90),
  ('rénoration', 'rénovation', 'fr-CA', 90),
  ('mont réal', 'Montréal', 'fr-CA', 80),
  ('entre toit', 'entretoit', 'fr-CA', 80),
  ('soumition', 'soumission', 'fr-CA', 80);

-- alex_realtime_sessions
CREATE TABLE public.alex_realtime_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  voice_profile TEXT DEFAULT 'balanced',
  locale TEXT DEFAULT 'fr-CA',
  device_type TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active'
);
ALTER TABLE public.alex_realtime_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public insert realtime sessions" ON public.alex_realtime_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Public read realtime sessions" ON public.alex_realtime_sessions FOR SELECT USING (true);
