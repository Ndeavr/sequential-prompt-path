
-- Add missing columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS language text DEFAULT 'fr',
  ADD COLUMN IF NOT EXISTS postal_code text,
  ADD COLUMN IF NOT EXISTS address_line_1 text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS province text DEFAULT 'QC',
  ADD COLUMN IF NOT EXISTS country text DEFAULT 'CA',
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false;

-- Create homeowner_profiles table
CREATE TABLE IF NOT EXISTS public.homeowner_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  property_type text,
  ownership_status text,
  home_age_range text,
  project_intent text,
  budget_range text,
  timeline text,
  adn_score jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.homeowner_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own homeowner profile"
  ON public.homeowner_profiles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own homeowner profile"
  ON public.homeowner_profiles FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own homeowner profile"
  ON public.homeowner_profiles FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can manage all homeowner profiles"
  ON public.homeowner_profiles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Create alex_messages table for conversation history
CREATE TABLE IF NOT EXISTS public.alex_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.alex_sessions(id) ON DELETE CASCADE,
  sender text NOT NULL DEFAULT 'user',
  message text NOT NULL,
  message_type text DEFAULT 'text',
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.alex_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own alex messages"
  ON public.alex_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.alex_sessions s
      WHERE s.id = alex_messages.session_id AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own alex messages"
  ON public.alex_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.alex_sessions s
      WHERE s.id = alex_messages.session_id AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all alex messages"
  ON public.alex_messages FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_alex_messages_session_id ON public.alex_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_homeowner_profiles_user_id ON public.homeowner_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_homeowner_profiles_profile_id ON public.homeowner_profiles(profile_id);
