
-- Alex Voice Hard Reset: new voice tables

-- 1. Voice profiles (admin-configurable per role/language)
CREATE TABLE IF NOT EXISTS public.alex_voice_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_key text NOT NULL,
  language text NOT NULL DEFAULT 'fr',
  locale_code text NOT NULL DEFAULT 'fr-QC',
  provider_primary text NOT NULL DEFAULT 'elevenlabs',
  voice_id_primary text NOT NULL,
  voice_display_name text,
  speech_rate numeric(4,2) NOT NULL DEFAULT 1.00,
  stability numeric(4,2) DEFAULT 0.65,
  similarity_boost numeric(4,2) DEFAULT 0.80,
  style_exaggeration numeric(4,2) DEFAULT 0.08,
  tone_style text NOT NULL DEFAULT 'premium_calm',
  accent_target text NOT NULL DEFAULT 'quebec_premium_neutral',
  interruptibility boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(profile_key, language)
);

-- 2. Runtime sessions
CREATE TABLE IF NOT EXISTS public.alex_voice_runtime_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  profile_key text NOT NULL,
  language text NOT NULL DEFAULT 'fr',
  locale_code text NOT NULL DEFAULT 'fr-QC',
  provider_current text NOT NULL DEFAULT 'elevenlabs',
  voice_id_current text NOT NULL,
  runtime_state text NOT NULL DEFAULT 'idle',
  is_playing boolean NOT NULL DEFAULT false,
  is_listening boolean NOT NULL DEFAULT false,
  last_interrupt_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. Voice events
CREATE TABLE IF NOT EXISTS public.alex_voice_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  runtime_session_id uuid REFERENCES public.alex_voice_runtime_sessions(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  event_status text,
  payload jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- 4. Voice errors
CREATE TABLE IF NOT EXISTS public.alex_voice_errors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  runtime_session_id uuid REFERENCES public.alex_voice_runtime_sessions(id) ON DELETE CASCADE,
  error_type text NOT NULL,
  error_message text,
  payload jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- 5. Admin change log
CREATE TABLE IF NOT EXISTS public.alex_voice_admin_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  profile_key text NOT NULL,
  language text NOT NULL,
  old_voice_id text,
  new_voice_id text NOT NULL,
  old_config jsonb DEFAULT '{}'::jsonb,
  new_config jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE public.alex_voice_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alex_voice_runtime_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alex_voice_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alex_voice_errors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alex_voice_admin_changes ENABLE ROW LEVEL SECURITY;

-- Public read on voice profiles (needed by edge functions w/ anon key)
CREATE POLICY "Anyone can read active voice profiles" ON public.alex_voice_profiles
  FOR SELECT USING (is_active = true);

-- Admin can manage profiles
CREATE POLICY "Admins manage voice profiles" ON public.alex_voice_profiles
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Runtime sessions: service role or own user
CREATE POLICY "Users see own voice sessions" ON public.alex_voice_runtime_sessions
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Insert voice sessions" ON public.alex_voice_runtime_sessions
  FOR INSERT WITH CHECK (true);

-- Events/errors: open insert, authenticated select
CREATE POLICY "Insert voice events" ON public.alex_voice_events
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Insert voice errors" ON public.alex_voice_errors
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admin reads voice events" ON public.alex_voice_events
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin reads voice errors" ON public.alex_voice_errors
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Admin changes: admin only
CREATE POLICY "Admin manages voice changes" ON public.alex_voice_admin_changes
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Seed default voice profiles
INSERT INTO public.alex_voice_profiles (profile_key, language, locale_code, voice_id_primary, voice_display_name, tone_style, accent_target)
VALUES
  ('homeowner', 'fr', 'fr-QC', 'FGY2WhTYpPnrIDTdsKH5', 'Laura (FR-QC)', 'premium_calm', 'quebec_premium_neutral'),
  ('homeowner', 'en', 'en-CA', 'EXAVITQu4vr4xnSDxMaL', 'Sarah (EN-CA)', 'premium_calm', 'north_american_neutral'),
  ('entrepreneur', 'fr', 'fr-QC', 'FGY2WhTYpPnrIDTdsKH5', 'Laura (FR-QC)', 'premium_direct', 'quebec_premium_neutral'),
  ('entrepreneur', 'en', 'en-CA', 'EXAVITQu4vr4xnSDxMaL', 'Sarah (EN-CA)', 'premium_direct', 'north_american_neutral'),
  ('condo_manager', 'fr', 'fr-QC', 'FGY2WhTYpPnrIDTdsKH5', 'Laura (FR-QC)', 'premium_structured', 'quebec_premium_neutral'),
  ('condo_manager', 'en', 'en-CA', 'EXAVITQu4vr4xnSDxMaL', 'Sarah (EN-CA)', 'premium_structured', 'north_american_neutral')
ON CONFLICT (profile_key, language) DO NOTHING;
