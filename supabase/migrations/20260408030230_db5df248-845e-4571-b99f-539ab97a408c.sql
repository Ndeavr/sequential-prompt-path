
-- Add missing columns to existing alex_voice_profiles
ALTER TABLE public.alex_voice_profiles 
  ADD COLUMN IF NOT EXISTS quebec_flavor_level INT DEFAULT 1,
  ADD COLUMN IF NOT EXISTS neutral_accent_mode BOOLEAN DEFAULT true;

-- Voice tone settings (fine-grained per profile)
CREATE TABLE IF NOT EXISTS public.alex_voice_tone_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  voice_profile_id UUID NOT NULL REFERENCES public.alex_voice_profiles(id) ON DELETE CASCADE,
  speech_rate NUMERIC NOT NULL DEFAULT 0.95,
  pitch NUMERIC NOT NULL DEFAULT 1.0,
  quebec_flavor_level INT NOT NULL DEFAULT 1,
  neutral_accent_enabled BOOLEAN NOT NULL DEFAULT true,
  warmth NUMERIC NOT NULL DEFAULT 0.6,
  energy NUMERIC NOT NULL DEFAULT 0.5,
  formality NUMERIC NOT NULL DEFAULT 0.5,
  pacing_style TEXT NOT NULL DEFAULT 'natural_conversational',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.alex_voice_tone_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read tone settings" ON public.alex_voice_tone_settings FOR SELECT USING (true);

-- Voice render logs
CREATE TABLE IF NOT EXISTS public.alex_voice_render_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  voice_profile_id UUID REFERENCES public.alex_voice_profiles(id),
  profile_key TEXT,
  language_code TEXT,
  text_input TEXT,
  text_preprocessed TEXT,
  duration_ms INT,
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.alex_voice_render_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can insert render logs" ON public.alex_voice_render_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can read render logs" ON public.alex_voice_render_logs FOR SELECT USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_voice_tone_profile ON public.alex_voice_tone_settings(voice_profile_id);
CREATE INDEX IF NOT EXISTS idx_voice_render_logs_profile ON public.alex_voice_render_logs(profile_key);
CREATE INDEX IF NOT EXISTS idx_voice_render_logs_created ON public.alex_voice_render_logs(created_at DESC);

-- Update existing profiles with neutral accent defaults
UPDATE public.alex_voice_profiles SET quebec_flavor_level = 1, neutral_accent_mode = true WHERE accent_target = 'quebec_premium_neutral';
UPDATE public.alex_voice_profiles SET quebec_flavor_level = 0, neutral_accent_mode = true WHERE accent_target = 'north_american_neutral';
