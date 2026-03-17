
-- Add referral columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referral_code text UNIQUE,
  ADD COLUMN IF NOT EXISTS affiliate_code text,
  ADD COLUMN IF NOT EXISTS invited_by_user_id uuid REFERENCES auth.users(id);

-- Auto-generate referral_code for new and existing profiles
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := lower(substr(md5(NEW.user_id::text || extract(epoch from now())::text), 1, 8));
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_profiles_referral_code
  BEFORE INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.generate_referral_code();

-- Backfill existing profiles
UPDATE public.profiles
SET referral_code = lower(substr(md5(user_id::text || '0'), 1, 8))
WHERE referral_code IS NULL;

-- Referral events table
CREATE TABLE IF NOT EXISTS public.referral_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id uuid REFERENCES auth.users(id),
  referral_code text NOT NULL,
  event_type text NOT NULL,
  role text,
  target_type text,
  metadata jsonb DEFAULT '{}',
  ip_hash text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.referral_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own referral events"
  ON public.referral_events FOR SELECT
  TO authenticated
  USING (referrer_user_id = auth.uid());

CREATE POLICY "Anyone can insert referral events"
  ON public.referral_events FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Affiliate attributions table
CREATE TABLE IF NOT EXISTS public.affiliate_attributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_code text NOT NULL,
  referrer_user_id uuid REFERENCES auth.users(id),
  referred_user_id uuid REFERENCES auth.users(id),
  role_origin text,
  conversion_type text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.affiliate_attributions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own attributions"
  ON public.affiliate_attributions FOR SELECT
  TO authenticated
  USING (referrer_user_id = auth.uid() OR referred_user_id = auth.uid());

CREATE POLICY "System can insert attributions"
  ON public.affiliate_attributions FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON public.profiles(referral_code);
CREATE INDEX IF NOT EXISTS idx_referral_events_referrer ON public.referral_events(referrer_user_id);
CREATE INDEX IF NOT EXISTS idx_referral_events_code ON public.referral_events(referral_code);
CREATE INDEX IF NOT EXISTS idx_affiliate_attributions_referrer ON public.affiliate_attributions(referrer_user_id);
