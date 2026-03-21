
-- Voice identity profiles for speaker verification
CREATE TABLE IF NOT EXISTS public.user_voice_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  profile_name text NOT NULL DEFAULT 'default',
  embedding_json jsonb,
  provider text NOT NULL DEFAULT 'placeholder',
  sample_count integer NOT NULL DEFAULT 0,
  last_sample_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, profile_name)
);

CREATE INDEX IF NOT EXISTS idx_voice_profiles_user ON public.user_voice_profiles(user_id);

ALTER TABLE public.user_voice_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "voice_profiles_select_own"
ON public.user_voice_profiles FOR SELECT
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "voice_profiles_insert_own"
ON public.user_voice_profiles FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "voice_profiles_update_own"
ON public.user_voice_profiles FOR UPDATE
USING (user_id = auth.uid());
