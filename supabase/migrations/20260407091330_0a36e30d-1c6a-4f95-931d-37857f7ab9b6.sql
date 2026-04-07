
-- Create missing tables
CREATE TABLE public.alex_voice_pronunciation_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  locale TEXT DEFAULT 'fr-CA',
  source_text TEXT NOT NULL,
  replacement_text TEXT NOT NULL,
  rule_type TEXT DEFAULT 'lexical',
  priority INTEGER DEFAULT 50,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.alex_voice_pronunciation_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read pronunciation rules" ON public.alex_voice_pronunciation_rules FOR SELECT USING (true);
CREATE POLICY "Authenticated can manage pronunciation rules" ON public.alex_voice_pronunciation_rules FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.alex_voice_output_filters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pattern TEXT NOT NULL,
  filter_type TEXT DEFAULT 'regex',
  action_type TEXT DEFAULT 'block',
  priority INTEGER DEFAULT 50,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.alex_voice_output_filters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read output filters" ON public.alex_voice_output_filters FOR SELECT USING (true);
CREATE POLICY "Authenticated can manage output filters" ON public.alex_voice_output_filters FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.alex_voice_latency_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  turn_id UUID REFERENCES public.alex_voice_turns(id),
  metric_type TEXT NOT NULL,
  metric_value_ms NUMERIC NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.alex_voice_latency_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read latency events" ON public.alex_voice_latency_events FOR SELECT USING (true);
CREATE POLICY "Anyone can insert latency events" ON public.alex_voice_latency_events FOR INSERT WITH CHECK (true);

-- Add missing columns to voice profiles
ALTER TABLE public.alex_voice_profiles ADD COLUMN IF NOT EXISTS code TEXT;
ALTER TABLE public.alex_voice_profiles ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.alex_voice_profiles ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.alex_voice_profiles ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT false;
ALTER TABLE public.alex_voice_profiles ADD COLUMN IF NOT EXISTS vad_threshold NUMERIC DEFAULT 0.3;
ALTER TABLE public.alex_voice_profiles ADD COLUMN IF NOT EXISTS chunk_size_ms INTEGER DEFAULT 40;
ALTER TABLE public.alex_voice_profiles ADD COLUMN IF NOT EXISTS interruption_threshold NUMERIC DEFAULT 0.5;
ALTER TABLE public.alex_voice_profiles ADD COLUMN IF NOT EXISTS output_buffer_ms INTEGER DEFAULT 50;
ALTER TABLE public.alex_voice_profiles ADD COLUMN IF NOT EXISTS reconnect_backoff_strategy TEXT DEFAULT 'linear';
ALTER TABLE public.alex_voice_profiles ADD COLUMN IF NOT EXISTS response_style TEXT DEFAULT 'concise';
ALTER TABLE public.alex_voice_profiles ADD COLUMN IF NOT EXISTS speech_rate_target NUMERIC DEFAULT 1.0;
ALTER TABLE public.alex_voice_profiles ADD COLUMN IF NOT EXISTS max_pause_ms INTEGER DEFAULT 500;

-- Seed profiles
INSERT INTO public.alex_voice_profiles (code, name, description, is_default, profile_key, language, locale_code, voice_id_primary, vad_threshold, silence_duration_ms, prefix_padding_ms, min_speech_ms, max_pause_ms, chunk_size_ms, interruption_threshold, output_buffer_ms, response_style, speech_rate_target)
VALUES
('ultra_fast', 'Ultra Rapide', 'Premier tour mobile', false, 'ultra_fast', 'fr', 'fr-CA', 'Aoede', 0.25, 120, 15, 80, 400, 20, 0.4, 30, 'concise', 1.05),
('balanced_premium', 'Balancé Premium', 'Défaut', true, 'balanced_premium', 'fr', 'fr-CA', 'Aoede', 0.3, 160, 25, 100, 500, 40, 0.5, 50, 'natural', 1.0),
('careful_noisy', 'Prudent', 'Bruit ambiant', false, 'careful_noisy', 'fr', 'fr-CA', 'Aoede', 0.45, 260, 40, 150, 700, 40, 0.6, 80, 'natural', 0.95);

-- Seed pronunciation rules
INSERT INTO public.alex_voice_pronunciation_rules (locale, source_text, replacement_text, rule_type, priority, notes) VALUES
('fr-CA', 'ille', 'ville', 'phonetic', 100, 'STT drops V'),
('fr-CA', 'renoration', 'rénovation', 'lexical', 90, 'STT error'),
('fr-CA', 'soumition', 'soumission', 'lexical', 85, 'STT error'),
('fr-CA', 'entre toit', 'entretoit', 'lexical', 80, 'Word split'),
('fr-CA', 'mont réal', 'Montréal', 'phonetic', 75, 'City'),
('fr-CA', 'terme pump', 'thermopompe', 'lexical', 70, 'Trade term');

-- Seed output filters
INSERT INTO public.alex_voice_output_filters (pattern, filter_type, action_type, priority) VALUES
('Thought for', 'contains', 'block', 100),
('Editing', 'contains', 'block', 95),
('function call', 'contains', 'block', 80),
('internal chain', 'contains', 'block', 75),
('debug mode', 'contains', 'block', 70),
('implementing', 'contains', 'block', 65);
